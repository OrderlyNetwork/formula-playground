/**
 * ArrayGroupCell Usage Example
 *
 * This file demonstrates how to use the ArrayGroupCell component
 * with a column definition that contains array data.
 */

import { ArrayGroupCell } from "./ArrayGroupCell";
import { GridStore } from "@/store/spreadsheet";
import type { ColumnDef, RowDef } from "@/types/spreadsheet";

// Example 1: Array of objects (like the RISK CONFIG example)
const exampleColumns: ColumnDef[] = [
  {
    id: "index",
    title: "#",
    width: 60,
    type: "text",
    editable: false,
    locked: true,
  },
  {
    id: "totalCollateral",
    title: "TOTAL COLLATERAL",
    width: 150,
    type: "number",
    editable: true,
  },
  {
    id: "markPrice",
    title: "MARK PRICE",
    width: 120,
    type: "number",
    editable: true,
  },
  {
    id: "riskConfig",
    title: "RISK CONFIG",
    width: 400,
    type: "custom",
    editable: true,
    // Use ArrayGroupCell as the custom renderer
    render: (rowId, column, store) => (
      <ArrayGroupCell rowId={rowId} column={column} store={store} />
    ),
  },
];

const exampleRows: RowDef[] = [{ id: "row-1" }, { id: "row-2" }];

// Example data initialization
const initializeExampleData = (store: GridStore) => {
  // Row 1 data
  store.setValue("row-1", "index", "1", true);
  store.setValue("row-1", "totalCollateral", "10000", true);
  store.setValue("row-1", "markPrice", "500", true);

  // Array data for RISK CONFIG column
  const riskConfigData = [
    { baseMMR: 0.05, baseIMR: 0.1, imrFactor: 1.0 },
    { baseMMR: 0.1, baseIMR: 0.2, imrFactor: 1.5 },
  ];
  store.setValue("row-1", "riskConfig", JSON.stringify(riskConfigData), true);

  // Row 2 data
  store.setValue("row-2", "index", "2", true);
  store.setValue("row-2", "totalCollateral", "20000", true);
  store.setValue("row-2", "markPrice", "750", true);

  const riskConfigData2 = [{ baseMMR: 0.08, baseIMR: 0.15, imrFactor: 1.2 }];
  store.setValue("row-2", "riskConfig", JSON.stringify(riskConfigData2), true);
};

// Example 2: Simple array (not objects)
const simpleArrayColumn: ColumnDef = {
  id: "tags",
  title: "TAGS",
  width: 300,
  type: "custom",
  editable: true,
  render: (rowId, column, store) => (
    <ArrayGroupCell rowId={rowId} column={column} store={store} />
  ),
};

const initializeSimpleArrayData = (store: GridStore) => {
  const tags = ["high-risk", "priority", "verified"];
  store.setValue("row-1", "tags", JSON.stringify(tags), true);
};

/**
 * Visual representation of the ArrayGroupCell output:
 *
 * +---+------------------+------------+------------------------------------------+
 * | # | TOTAL COLLATERAL | MARK PRICE |  RISK CONFIG (Array Columns)             |
 * +---+------------------+------------+------------------------------------------+
 * |   |                  |            | +----------+----------+------------+     |
 * |   |                  |            | | BASE MMR | BASE IMR | IMR FACTOR |     |
 * | 1 |      10,000      |    500     | +----------+----------+------------+     |
 * |   |                  |            | |   0.05   |   0.10   |     1.0    |     |
 * |   |                  |            | +----------+----------+------------+     |
 * |   |                  |            | |   0.10   |   0.20   |     1.5    |     |
 * |   |                  |            | +----------+----------+------------+     |
 * +---+------------------+------------+------------------------------------------+
 */

export {
  exampleColumns,
  exampleRows,
  initializeExampleData,
  simpleArrayColumn,
  initializeSimpleArrayData,
};
