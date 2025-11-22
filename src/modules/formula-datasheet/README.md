# Formula Data Sheet Component

A sophisticated table-based interface for managing and testing formula inputs with real-time execution.

## Features

### 🔄 Dynamic Column Generation
- Automatically parses `FormulaDefinition.inputs` into table columns
- Supports nested objects and arrays with dot-notation paths
- Handles complex factor types (number, string, boolean, object, array)

### 📝 Multi-Row Test Cases
- Create multiple test scenarios for the same formula
- Add, delete, and duplicate rows with different input values
- Batch execution of all valid test cases

### 🎯 Type-Aware Cell Editing
- Integrated with existing `TypeAwareInput` component
- Real-time validation based on `FactorType` constraints
- Support for enums, min/max validation, and regex patterns

### ⚡ Real-Time Execution
- Automatic formula execution on input changes
- Display execution results, timing, and error messages
- Integration with the existing formula store and execution system

### 🎨 Professional UI
- Clean, responsive table design with pagination
- Visual feedback for validation errors
- Hover effects and interactive elements

## Usage

```tsx
import { FormulaDataSheet } from "@/modules/formula-datasheet/formulaDataSheet";
import { useFormulaStore } from "@/store/formulaStore";

function MyComponent() {
  const { getFormulaDefinition, selectedFormulaId } = useFormulaStore();
  const formula = selectedFormulaId ? getFormulaDefinition(selectedFormulaId) : undefined;

  return (
    <FormulaDataSheet
      formula={formula}
      className="custom-styles"
    />
  );
}
```

## Example: total_value Formula

For the `total_value` formula:

```json
{
  "inputs": [{
    "key": "inputs",
    "type": "object",
    "factorType": {
      "properties": [
        {
          "key": "totalUnsettlementPnL",
          "type": "number"
        },
        {
          "key": "nonUSDCHolding",
          "type": "object",
          "array": true,
          "properties": [
            {"key": "holding", "type": "number"},
            {"key": "indexPrice", "type": "number"}
          ]
        }
      ]
    }
  }]
}
```

The data sheet generates columns like:
- `inputs.totalUnsettlementPnL` → "Total Unsettlement PnL"
- `inputs.nonUSDCHolding.0.holding` → "Non-USDC Holding [0] - Holding"
- `inputs.nonUSDCHolding.0.indexPrice` → "Non-USDC Holding [0] - Index Price"

## Architecture

### Core Components

1. **FormulaTableUtils** (`src/utils/formulaTableUtils.ts`)
   - `flattenFormulaInputs()` - Converts nested structure to dot-notation
   - `generateTableColumns()` - Creates TanStack table columns
   - `validateRow()` - Validates input data against factor types

2. **FormulaDataSheet** (`src/modules/formula-datasheet/formulaDataSheet.tsx`)
   - Main component using `@tanstack/react-table`
   - Integrates with `useFormulaStore` for state management
   - Handles row operations and formula execution

### Data Flow

```
FormulaDefinition → flattenFormulaInputs() → Column Definitions
                    ↓
Table User Input → validateRow() → Formula Store → Execute Formula
                    ↓
Results Display ← Execution Results ← Formula Execution
```

## Integration with Existing System

- **State Management**: Uses `useFormulaStore` for current inputs and execution results
- **Validation**: Leverages existing `validateValueForFactorType` logic
- **Cell Components**: Reuses `TypeAwareInput` for consistent editing experience
- **Execution**: Integrates with existing formula execution pipeline

## Extensibility

### Custom Cell Renderers
```tsx
const renderCell = useCallback((props) => {
  // Custom rendering logic based on factorType
  if (props.factorType.baseType === "custom") {
    return <MyCustomInput {...props} />;
  }
  return <TypeAwareInput {...props} />;
}, []);
```

### Additional Columns
The component supports adding custom columns (actions, metadata, etc.) through the column generation system.

## Future Enhancements

- 📊 Export/import test cases
- 🎯 Column grouping and nested headers
- 📱 Mobile-responsive design
- 🔄 Real-time collaboration
- 📈 Test result comparison and analysis