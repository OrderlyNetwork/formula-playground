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

import { readFileSync, writeFileSync, statSync, readdirSync } from "fs";
import { join, dirname, resolve, extname } from "path";
import { FormulaParser } from "../modules/formula-parser/index.js";
import type { FormulaDefinition } from "../types/formula.js";
import { Project, SourceFile } from "ts-morph";
import { toSnakeCase } from "../lib/utils.js";

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

    const formulaId =
      formulaIdTag?.getComment()?.toString() || toSnakeCase(name);

    functionNameMap.set(formulaId, name);
  }

  return functionNameMap;
}

/**
 * Parse command line arguments
 * @returns Parsed arguments: { sourcePath, outputPath }
 */
function parseArgs(): { sourcePath: string; outputPath: string } {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Error: Source path is required");
    console.error(
      "Usage: pnpm generate:formulas <source-path> [--output <output-path>]"
    );
    console.error("  Default output: public/formulas.json");
    process.exit(1);
  }

  let sourcePath = "";
  let outputPath = "";

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
    outputPath = "public/formulas.json";
  }

  return { sourcePath: resolve(sourcePath), outputPath: resolve(outputPath) };
}

/**
 * Main CLI function
 */
async function main() {
  const { sourcePath, outputPath } = parseArgs();

  console.log(`📂 Source path: ${sourcePath}`);
  console.log(`📄 Output path: ${outputPath}`);

  // Check if source path exists
  try {
    const stats = statSync(sourcePath);
    if (!stats.isFile() && !stats.isDirectory()) {
      console.error(`Error: ${sourcePath} is not a file or directory`);
      process.exit(1);
    }
  } catch (error) {
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

  // Parse formulas using FormulaParser
  const parser = new FormulaParser();
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
        enabled: false, // Default to disabled, user can enable manually
      },
    };

    enhancedFormulas.push(enhancedFormula);
    console.log(`  ✓ ${formula.id} -> ${functionName} (${packageName})`);
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
}

// Run the CLI
main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
