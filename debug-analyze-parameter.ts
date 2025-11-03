import { Project, ParameterDeclaration } from "ts-morph";

// 模拟 analyzeParameterType 方法进行调试
const project = new Project({
  skipAddingFilesFromTsConfig: true,
});

const sourceCode = `
type NonUSDCHoldingType = {
  holding: number;
  indexPrice: number;
}[];

interface TotalValueInputs {
  totalUnsettlementPnL: number;
  USDCHolding: number;
  nonUSDCHolding: NonUSDCHoldingType;
}

function totalValue(inputs: TotalValueInputs): number {
  // test function
}

function testFunction(nonUSDCHolding: {
  holding: number;
  indexPrice: number;
}[]): number {
  return 0;
}
`;

const sourceFile = project.createSourceFile("test.ts", sourceCode);

// 测试内联类型的参数
const func = sourceFile.getFunctions()[1]; // testFunction
const param = func.getParameters()[0];
console.log("Parameter name:", param.getName());
console.log("Type text:", param.getTypeNode()?.getText());
console.log("Is array:", param.getType().isArray());

// 模拟 analyzeParameterType
function analyzeParameterType(param: ParameterDeclaration) {
  const typeNode = param.getTypeNode();
  const type = param.getType();

  // 获取基础类型
  function getBaseType(tsType: any): string {
    if (tsType.isArray()) {
      const elem = tsType.getArrayElementType();
      if (elem) return getBaseType(elem);
      return "object";
    }

    if (tsType.isNumber()) return "number";
    if (tsType.isString()) return "string";
    if (tsType.isBoolean()) return "boolean";

    const properties = tsType.getProperties();
    console.log("Properties in getBaseType:", properties.length);
    if (properties.length > 0) {
      return "object";
    }

    return "object";
  }

  const baseType = getBaseType(type);
  console.log("Base type:", baseType);

  const array = type.isArray();
  console.log("Is array:", array);

  const factor = {
    baseType,
    array,
  };

  // 提取对象属性
  if (baseType === "object") {
    const typeToAnalyze = array ? type.getArrayElementType() : type;
    console.log("Type to analyze text:", typeToAnalyze?.getText());

    if (typeToAnalyze) {
      function extractObjectProperties(tsType: any) {
        const properties = [];
        const symbols = tsType.getProperties();
        console.log("Found symbols:", symbols.length);

        for (const symbol of symbols) {
          const key = symbol.getName();
          const decl = symbol.getValueDeclaration() ?? symbol.getDeclarations()?.[0];
          if (!decl) continue;

          const propType = symbol.getTypeAtLocation(decl);
          const isArray = propType.isArray();
          const elementType = isArray
            ? propType.getArrayElementType() ?? propType
            : propType;

          const propBaseType = getBaseType(elementType);

          const factorType = {
            baseType: propBaseType,
            nullable: elementType.isNullable(),
            array: isArray,
          };

          properties.push({
            key,
            type: propBaseType,
            factorType,
          });

          console.log(`Property ${key}: type=${propBaseType}, array=${isArray}`);
        }
        return properties;
      }

      const props = extractObjectProperties(typeToAnalyze);
      console.log("Extracted properties count:", props.length);
      if (props.length > 0) {
        factor.properties = props;
      }
    }
  }

  return factor;
}

const result = analyzeParameterType(param);
console.log("Final result:", JSON.stringify(result, null, 2));