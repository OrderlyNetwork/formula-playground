import { Project, ParameterDeclaration } from "ts-morph";

// 测试类型别名的情况
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
`;

const sourceFile = project.createSourceFile("test.ts", sourceCode);

// 通过 interface 参数来测试类型别名
const func = sourceFile.getFunctions()[0];
const inputsParam = func.getParameters()[0];
const inputsType = inputsParam.getType();

// 获取 nonUSDCHolding 属性
const nonUSDCHoldingProp = inputsType.getProperties().find(p => p.getName() === "nonUSDCHolding");
if (nonUSDCHoldingProp) {
  const nonUSDCHoldingType = nonUSDCHoldingProp.getTypeAtLocation(inputsParam);

  console.log("Type text:", nonUSDCHoldingType.getText());
  console.log("Is array:", nonUSDCHoldingType.isArray());

  if (nonUSDCHoldingType.isArray()) {
    const elemType = nonUSDCHoldingType.getArrayElementType();
    if (elemType) {
      console.log("Element type text:", elemType.getText());
      console.log("Element type properties:", elemType.getProperties().length);

      // 尝试获取属性的声明位置
      const symbols = elemType.getProperties();
      for (const symbol of symbols) {
        const key = symbol.getName();
        console.log(`Property: ${key}`);

        // 尝试不同的方式获取类型声明
        const declarations = symbol.getDeclarations();
        console.log(`  Declarations count: ${declarations?.length || 0}`);

        const valueDeclaration = symbol.getValueDeclaration();
        console.log(`  Has value declaration: ${!!valueDeclaration}`);

        if (valueDeclaration) {
          const propType = symbol.getTypeAtLocation(valueDeclaration);
          console.log(`  Type at value declaration: ${propType.getText()}`);
        } else if (declarations && declarations.length > 0) {
          const propType = symbol.getTypeAtLocation(declarations[0]);
          console.log(`  Type at first declaration: ${propType.getText()}`);
        } else {
          // 尝试从函数参数位置获取类型
          const propType = symbol.getTypeAtLocation(inputsParam);
          console.log(`  Type at function param: ${propType.getText()}`);
        }
      }
    }
  }
}