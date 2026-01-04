#!/usr/bin/env node

/**
 * CLI Tool: Generate Formula Configuration from TypeScript Source
 *
 * This tool parses TypeScript source files/directories to extract formula definitions
 * and generates a JSON configuration file with localNpmInfo automatically populated
 * from package.json.
 *
 * Usage:
 *   pnpm generate:formulas <source-path> [--output <output-path>]
 *   pnpm generate:formulas sdk-mock/ts/formulas.ts
 *   pnpm generate:formulas sdk-mock/ts/formulas.ts --output public/formulas.json
 *   pnpm generate:formulas src/modules/formulas --output custom-output.json
 *
 * Default output path: public/formulas.json
 */

import {
  readFileSync,
  writeFileSync,
  statSync,
  readdirSync,
  mkdirSync,
  existsSync,
} from "fs";
import { join, dirname, resolve, extname } from "path";
import type { FormulaDefinition } from "../types/formula.js";
import type { VersionConfigFile, VersionConfig } from "../types/version.js";
import { Project, SourceFile } from "ts-morph";
import { toSnakeCase } from "../lib/utils.js";
import { FormulaParser } from "../modules/formula-parser/index.js";

/**
 * Find package.json starting from the given directory and walking up
 * @param startDir - Starting directory path
 * @returns Package.json content as object, or null if not found
 */
function findPackageJson(startDir: string): { name: string } | null {
  let currentDir = resolve(startDir);

  while (currentDir !== dirname(currentDir)) {
    const packageJsonPath = join(currentDir, "package.json");
    try {
      if (statSync(packageJsonPath).isFile()) {
        const content = readFileSync(packageJsonPath, "utf-8");
        return JSON.parse(content);
      }
    } catch {
      // File doesn't exist, continue searching
    }
    currentDir = dirname(currentDir);
  }

  return null;
}

/**
 * Recursively collect all TypeScript files from a directory
 * @param dirPath - Directory path to search
 * @returns Array of TypeScript file paths
 */
function collectTypeScriptFiles(dirPath: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules and other common ignored directories
      if (
        entry.name === "node_modules" ||
        entry.name === ".git" ||
        entry.name === "dist" ||
        entry.name === "build"
      ) {
        continue;
      }
      files.push(...collectTypeScriptFiles(fullPath));
    } else if (entry.isFile() && extname(entry.name) === ".ts") {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Extract function names from parsed formulas by re-parsing the source file
 * This is needed because FormulaDefinition doesn't include the original function name
 * @param sourceFile - Parsed source file
 * @returns Map of formula ID to function name
 */
function extractFunctionNames(sourceFile: SourceFile): Map<string, string> {
  const functionNameMap = new Map<string, string>();
  const functions = sourceFile.getFunctions();

  for (const func of functions) {
    const name = func.getName();
    if (!name) continue;

    const jsDoc = func.getJsDocs()[0];
    if (!jsDoc) continue;

    // Extract formula ID (same logic as FormulaParser)
    const formulaIdTag = jsDoc
      .getTags()
      .find((tag) => tag.getTagName() === "formulaId");

    const formulaIdComment = formulaIdTag?.getComment()?.toString();
    if (!formulaIdComment) {
      /**
       * Ensures formulas without @formulaId are ignored when generating
       * configuration via the CLI entry point.
       */
      continue;
    }

    const formulaId = formulaIdComment || toSnakeCase(name);

    functionNameMap.set(formulaId, name);
  }

  return functionNameMap;
}

/**
 * Update versionConfig.json with formulaConfigPath for the specified version
 * @param version - Version identifier
 * @param type - Version type (release, dev, local)
 * @param packageName - Package name from package.json
 * @param formulaConfigPath - Relative path to formulas.json (e.g., "versions/4.8.1/formulas.json")
 */
function updateVersionConfig(
  version: string,
  type: "release" | "dev" | "local",
  packageName: string,
  formulaConfigPath: string
): void {
  const versionConfigPath = resolve("public/versionConfig.json");

  let versionConfig: VersionConfigFile;

  try {
    const content = readFileSync(versionConfigPath, "utf-8");
    versionConfig = JSON.parse(content);
  } catch (_error) {
    console.warn("⚠️  versionConfig.json not found, creating new one");
    versionConfig = {
      versions: [],
      defaultVersion: version,
    };
  }

  // Find existing version entry
  const existingVersionIndex = versionConfig.versions.findIndex(
    (v: VersionConfig) => v.version === version || v.id === version
  );

  if (existingVersionIndex !== -1) {
    // Update existing version entry
    versionConfig.versions[existingVersionIndex].formulaConfigPath =
      formulaConfigPath;
    console.log(`  ✓ Updated existing version entry: ${version}`);
  } else {
    // Add new version entry
    const newVersion: VersionConfig = {
      id: version,
      name: `${version} (${type})`,
      version: version,
      type: type,
      packageName: packageName,
      description: `Generated ${type} version`,
      formulaConfigPath: formulaConfigPath,
    };

    // Add type-specific fields
    if (type === "release") {
      newVersion.jsdelivrUrl = `https://cdn.jsdelivr.net/npm/${packageName}@${version}/dist/index.js`;
    } else if (type === "dev") {
      newVersion.jsdelivrUrl = `https://cdn.jsdelivr.net/gh/orderly-network/perp-sdk@${version}/dist/index.js`;
    } else if (type === "local") {
      newVersion.sourcePath = `/dist/${version}.js`;
      newVersion.globalNamespace = "formulas";
      newVersion.globalKey = version;
    }

    versionConfig.versions.push(newVersion);
    console.log(`  ✓ Added new version entry: ${version} (${type})`);
  }

  // Write updated versionConfig.json
  writeFileSync(
    versionConfigPath,
    JSON.stringify(versionConfig, null, 2),
    "utf-8"
  );
  console.log(`  ✓ Updated versionConfig.json`);
}

/**
 * Parse command line arguments
 * @returns Parsed arguments: { sourcePath, outputPath, version, type }
 */
function parseArgs(): {
  sourcePath: string;
  outputPath: string;
  version?: string;
  type: "release" | "dev" | "local";
} {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Error: Source path is required");
    console.error(
      "Usage: pnpm generate:formulas <source-path> [--version <version>] [--type <release|dev|local>] [--output <output-path>]"
    );
    console.error(
      "  Default output: public/formulas.json (or public/versions/{version}/formulas.json if --version is provided)"
    );
    console.error("  Default type: release");
    process.exit(1);
  }

  let sourcePath = "";
  let outputPath = "";
  let version: string | undefined = undefined;
  let type: "release" | "dev" | "local" = "release";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--output" || arg === "-o") {
      if (i + 1 < args.length) {
        outputPath = args[i + 1];
        i++; // Skip next argument as it's the value
      } else {
        console.error("Error: --output requires a value");
        process.exit(1);
      }
    } else if (arg === "--version" || arg === "-v") {
      if (i + 1 < args.length) {
        version = args[i + 1];
        i++; // Skip next argument as it's the value
      } else {
        console.error("Error: --version requires a value");
        process.exit(1);
      }
    } else if (arg === "--type" || arg === "-t") {
      if (i + 1 < args.length) {
        const typeValue = args[i + 1];
        if (
          typeValue === "release" ||
          typeValue === "dev" ||
          typeValue === "local"
        ) {
          type = typeValue;
        } else {
          console.error("Error: --type must be one of: release, dev, local");
          process.exit(1);
        }
        i++; // Skip next argument as it's the value
      } else {
        console.error("Error: --type requires a value");
        process.exit(1);
      }
    } else if (!sourcePath && !arg.startsWith("-")) {
      sourcePath = arg;
    }
  }

  if (!sourcePath) {
    console.error("Error: Source path is required");
    process.exit(1);
  }

  // Set default output path if not provided
  if (!outputPath) {
    if (version) {
      // If version is provided, output to versioned directory
      outputPath = `public/versions/${version}/formulas.json`;
    } else {
      // Otherwise use default path for backward compatibility
      outputPath = "public/formulas.json";
    }
  }

  return {
    sourcePath: resolve(sourcePath),
    outputPath: resolve(outputPath),
    version,
    type,
  };
}

/**
 * Main CLI function
 */
async function main() {
  const { sourcePath, outputPath, version, type } = parseArgs();

  console.log(`📂 Source path: ${sourcePath}`);
  console.log(`📄 Output path: ${outputPath}`);
  if (version) {
    console.log(`🔖 Version: ${version}`);
    console.log(`📦 Type: ${type}`);
  }

  // Check if source path exists
  try {
    const stats = statSync(sourcePath);
    if (!stats.isFile() && !stats.isDirectory()) {
      console.error(`Error: ${sourcePath} is not a file or directory`);
      process.exit(1);
    }
  } catch (_error) {
    console.error(`Error: Source path does not exist: ${sourcePath}`);
    process.exit(1);
  }

  // Collect TypeScript files
  let sourceFiles: string[];
  if (statSync(sourcePath).isFile()) {
    sourceFiles = [sourcePath];
  } else {
    sourceFiles = collectTypeScriptFiles(sourcePath);
    if (sourceFiles.length === 0) {
      console.error(`Error: No TypeScript files found in ${sourcePath}`);
      process.exit(1);
    }
    console.log(`Found ${sourceFiles.length} TypeScript file(s)`);
  }

  // Find package.json (from the first source file's directory or source directory)
  const searchDir = statSync(sourcePath).isFile()
    ? dirname(sourcePath)
    : sourcePath;
  const packageJson = findPackageJson(searchDir);

  if (!packageJson) {
    console.error(
      `Error: Could not find package.json starting from ${searchDir}`
    );
    process.exit(1);
  }

  if (!packageJson.name) {
    console.error(`Error: package.json found but 'name' field is missing`);
    process.exit(1);
  }

  const packageName: string = packageJson.name;
  console.log(`📦 Package name: ${packageName}`);

  // Find tsconfig.json from the source directory
  const tsConfigPath = join(searchDir, "tsconfig.json");
  let tsConfigFilePath: string | undefined = undefined;
  try {
    if (statSync(tsConfigPath).isFile()) {
      tsConfigFilePath = tsConfigPath;
      console.log(`📝 Using tsconfig: ${tsConfigPath}`);
    }
  } catch {
    // tsconfig.json not found, continue without it
    console.warn("⚠️  No tsconfig.json found, type resolution may be limited");
  }

  // Parse formulas using FormulaParser with real file system access (not in-memory)
  // We create a dedicated parser instance for CLI usage instead of using the factory singleton
  const parser = new FormulaParser(false, tsConfigFilePath, true); // false = use real file system, true = require @formulaId
  let formulas: FormulaDefinition[] = [];

  try {
    formulas = await parser.parseFormulas(sourceFiles);
  } catch (error) {
    console.error("Error parsing formulas:", error);
    process.exit(1);
  }

  if (formulas.length === 0) {
    console.warn("Warning: No formulas found in source files");
    process.exit(0);
  }

  console.log(`✓ Parsed ${formulas.length} formula(s)`);

  // Enhance formulas with localNpmInfo and function names
  // We need to re-parse to get function names, so we'll use a Project instance
  const project = new Project({
    useInMemoryFileSystem: false, // Use real file system
  });

  const enhancedFormulas: FormulaDefinition[] = [];

  for (const formula of formulas) {
    // Find the source file that contains this formula and extract function name
    let functionName: string | null = null;

    for (const filePath of sourceFiles) {
      try {
        const sourceFile = project.addSourceFileAtPath(filePath);
        const functionNameMap = extractFunctionNames(sourceFile);

        // Try to find the function name by formula ID
        if (functionNameMap.has(formula.id)) {
          functionName = functionNameMap.get(formula.id)!;
          break;
        }

        // Fallback: try to find by function name matching formula name
        for (const [id, name] of functionNameMap.entries()) {
          if (formula.name === name || formula.id === id) {
            functionName = name;
            break;
          }
        }

        if (functionName) break;
      } catch {
        console.warn(`Warning: Could not parse ${filePath} for function names`);
      }
    }

    // If we couldn't find the function name, try to infer it from the formula
    // This is a fallback - ideally we should always find it
    if (!functionName) {
      // Try to extract from sourceCode if available
      if (formula.sourceCode) {
        const functionMatch = formula.sourceCode.match(
          /export\s+function\s+(\w+)\s*\(/
        );
        if (functionMatch) {
          functionName = functionMatch[1];
        }
      }

      // Last resort: use formula name or ID converted to camelCase
      if (!functionName) {
        // Convert snake_case or kebab-case to camelCase
        functionName = formula.id
          .split(/[_-]/)
          .map((word, index) =>
            index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
          )
          .join("");
      }
    }

    // Create enhanced formula with localNpmInfo
    const enhancedFormula: FormulaDefinition = {
      ...formula,
      localNpmInfo: {
        packageName,
        functionName: functionName!,
        enabled: true, // Default to enabled, formulas will use local npm package
      },
    };

    enhancedFormulas.push(enhancedFormula);
    console.log(`  ✓ ${formula.id} -> ${functionName} (${packageName})`);
  }

  // Create output directory if it doesn't exist
  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`\n📁 Created directory: ${outputDir}`);
  }

  // Write output JSON file
  try {
    const outputContent = JSON.stringify(enhancedFormulas, null, 2);
    writeFileSync(outputPath, outputContent, "utf-8");
    console.log(
      `\n✅ Successfully generated ${enhancedFormulas.length} formula(s) to ${outputPath}`
    );
  } catch (error) {
    console.error("Error writing output file:", error);
    process.exit(1);
  }

  // Update versionConfig.json if version is provided
  if (version) {
    try {
      // Calculate relative path from public directory
      const publicDir = resolve("public");
      const relativeConfigPath = outputPath.startsWith(publicDir)
        ? outputPath.substring(publicDir.length + 1).replace(/\\/g, "/")
        : outputPath;

      updateVersionConfig(version, type, packageName, relativeConfigPath);
    } catch (error) {
      console.error("Error updating versionConfig.json:", error);
      console.warn(
        "⚠️  Formula config was generated but versionConfig.json was not updated"
      );
    }
  }
}

// Run the CLI
main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
