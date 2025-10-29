import {
  Project,
  SourceFile,
  FunctionDeclaration,
  JSDoc,
  JSDocTag,
} from "ts-morph";
import { TypeAnalyzer } from "./type-analyzer";
import type { FormulaDefinition, RoundingStrategy } from "../../types/formula";
import { toSnakeCase } from "../../lib/utils";

/**
 * FormulaParser - Parses TypeScript source code to extract formula definitions
 */
export class FormulaParser {
  private project: Project;
  private typeAnalyzer: TypeAnalyzer;

  constructor() {
    this.project = new Project({
      useInMemoryFileSystem: true,
    });
    this.typeAnalyzer = new TypeAnalyzer();
  }

  /**
   * Parse TypeScript source files and extract formula definitions
   */
  async parseFormulas(sourceFiles: string[]): Promise<FormulaDefinition[]> {
    const formulas: FormulaDefinition[] = [];

    for (const filePath of sourceFiles) {
      try {
        const sourceFile = this.project.addSourceFileAtPath(filePath);
        const fileFormulas = this.parseSourceFile(sourceFile);
        formulas.push(...fileFormulas);
      } catch (error) {
        console.error(`Error parsing file ${filePath}:`, error);
      }
    }

    return formulas;
  }

  /**
   * Parse a single source file
   */
  private parseSourceFile(sourceFile: SourceFile): FormulaDefinition[] {
    const formulas: FormulaDefinition[] = [];

    // Iterate through all exported functions
    const functions = sourceFile.getFunctions();

    for (const func of functions) {
      // Check if this is a formula function
      if (this.isFormulaFunction(func)) {
        const formula = this.parseFormula(func);
        if (formula) {
          formulas.push(formula);
        }
      }
    }

    return formulas;
  }

  /**
   * Check if a function is a formula function
   */
  private isFormulaFunction(func: FunctionDeclaration): boolean {
    const name = func.getName();
    if (!name) return false;

    // Check naming convention
    const namingPatterns = ["calculate", "compute", "formula"];
    const matchesNaming = namingPatterns.some((pattern) =>
      name.toLowerCase().startsWith(pattern)
    );

    // Check JSDoc tags
    const jsDoc = func.getJsDocs()[0];
    const hasFormulaId = jsDoc
      ?.getTags()
      .some((tag) => tag.getTagName() === "formulaId");

    return matchesNaming || hasFormulaId || false;
  }

  /**
   * Parse a single formula function
   */
  private parseFormula(func: FunctionDeclaration): FormulaDefinition | null {
    const name = func.getName();
    if (!name) return null;

    const jsDoc = func.getJsDocs()[0];
    if (!jsDoc) return null;

    // Extract basic information
    const id = this.extractFormulaId(jsDoc) || toSnakeCase(name);
    const formulaName = this.extractName(jsDoc) || name;
    const description = this.extractDescription(jsDoc);
    const version = this.extractVersion(jsDoc) || "1.0.0";
    const tags = this.extractTags(jsDoc);

    // Parse input parameters
    const inputs = this.parseInputs(func);

    // Parse outputs
    const outputs = this.parseOutputs(func);

    // Extract engine hints
    const engineHints = this.extractEngineHints(jsDoc);

    return {
      id,
      name: formulaName,
      version,
      description,
      tags,
      engineHints,
      inputs,
      outputs,
      formulaText: func.getBody()?.getText(),
      sourceCode: func.getText(),
    };
  }

  /**
   * Parse input parameters with type analysis
   */
  private parseInputs(func: FunctionDeclaration) {
    const parameters = func.getParameters();
    const inputs = [];
    const jsDoc = func.getJsDocs()[0];

    for (const param of parameters) {
      const paramName = param.getName();

      // Use type analyzer to extract factor type
      const factorType = this.typeAnalyzer.analyzeParameterType(param);

      // Extract JSDoc information for this parameter
      const paramTag = jsDoc
        ?.getTags()
        .find(
          (tag) =>
            tag.getTagName() === "param" &&
            tag
              .getComment()
              ?.toString()
              .includes(`{${param.getTypeNode()?.getText()}}`) &&
            tag.getComment()?.toString().includes(paramName)
        );

      const description = this.extractParamDescription(paramTag, paramName);
      const unit = this.extractParamUnit(paramTag);
      const defaultValue =
        this.extractParamDefault(paramTag) ?? param.getInitializer()?.getText();

      inputs.push({
        key: paramName,
        type: factorType.baseType,
        factorType,
        unit,
        default: defaultValue,
        description,
      });
    }

    return inputs;
  }

  /**
   * Parse outputs with type analysis
   */
  private parseOutputs(func: FunctionDeclaration) {
    const returnTypeNode = func.getReturnTypeNode();
    const factorType = this.typeAnalyzer.analyzeReturnType(returnTypeNode);

    // Extract JSDoc return information
    const jsDoc = func.getJsDocs()[0];
    const returnsTag = jsDoc
      ?.getTags()
      .find((tag) => tag.getTagName() === "returns");

    const description = this.extractReturnDescription(returnsTag);
    const unit = this.extractReturnUnit(returnsTag);

    return [
      {
        key: "result",
        type: factorType.baseType,
        factorType,
        unit,
        description,
      },
    ];
  }

  // JSDoc extraction helper methods

  private extractFormulaId(jsDoc: JSDoc): string | null {
    const formulaIdTag = jsDoc
      .getTags()
      .find((tag) => tag.getTagName() === "formulaId");
    return formulaIdTag?.getComment()?.toString() || null;
  }

  private extractName(jsDoc: JSDoc): string | null {
    const nameTag = jsDoc.getTags().find((tag) => tag.getTagName() === "name");
    return nameTag?.getComment()?.toString() || null;
  }

  private extractDescription(jsDoc: JSDoc): string | undefined {
    const descTag = jsDoc
      .getTags()
      .find((tag) => tag.getTagName() === "description");
    return descTag?.getComment()?.toString() || jsDoc.getDescription();
  }

  private extractVersion(jsDoc: JSDoc): string | null {
    const versionTag = jsDoc
      .getTags()
      .find((tag) => tag.getTagName() === "version");
    return versionTag?.getComment()?.toString() || null;
  }

  private extractTags(jsDoc: JSDoc): string[] | undefined {
    const tagsTag = jsDoc.getTags().find((tag) => tag.getTagName() === "tags");
    const tagsStr = tagsTag?.getComment()?.toString();
    if (tagsStr) {
      try {
        return JSON.parse(tagsStr);
      } catch {
        return tagsStr.split(",").map((t) => t.trim());
      }
    }
    return undefined;
  }

  private extractEngineHints(jsDoc: JSDoc) {
    const hints: any = {};
    const tags = jsDoc.getTags();

    for (const tag of tags) {
      const tagName = tag.getTagName();
      const match = tagName.match(/^engineHint\.(ts|rust)\.(rounding|scale)$/);

      if (match) {
        const [, engine, hintType] = match;
        if (!hints[engine]) hints[engine] = {};

        const value = tag.getComment()?.toString();
        if (hintType === "scale") {
          hints[engine][hintType] = parseInt(value || "8");
        } else {
          hints[engine][hintType] = value as RoundingStrategy;
        }
      }
    }

    return Object.keys(hints).length > 0 ? hints : undefined;
  }

  private extractParamDescription(
    paramTag: JSDocTag | undefined,
    paramName: string
  ): string | undefined {
    if (!paramTag) return undefined;

    const comment = paramTag.getComment()?.toString() || "";
    // Extract description before @unit or @default
    const match = comment.match(new RegExp(`${paramName}\\s+-\\s+([^@]+)`));
    return match ? match[1].trim() : undefined;
  }

  private extractParamUnit(paramTag: JSDocTag | undefined): string | undefined {
    if (!paramTag) return undefined;

    const comment = paramTag.getComment()?.toString() || "";
    const match = comment.match(/@unit\s+(\S+)/);
    return match ? match[1] : undefined;
  }

  private extractParamDefault(paramTag: JSDocTag | undefined): any {
    if (!paramTag) return undefined;

    const comment = paramTag.getComment()?.toString() || "";
    const match = comment.match(/@default\s+(\S+)/);
    if (match) {
      const value = match[1];
      // Try to parse as JSON
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return undefined;
  }

  private extractReturnDescription(
    returnsTag: JSDocTag | undefined
  ): string | undefined {
    if (!returnsTag) return undefined;

    const comment = returnsTag.getComment()?.toString() || "";
    // Extract description before @unit
    const match = comment.match(/^([^@]+)/);
    return match ? match[1].trim() : undefined;
  }

  private extractReturnUnit(
    returnsTag: JSDocTag | undefined
  ): string | undefined {
    if (!returnsTag) return undefined;

    const comment = returnsTag.getComment()?.toString() || "";
    const match = comment.match(/@unit\s+(\S+)/);
    return match ? match[1] : undefined;
  }
}
