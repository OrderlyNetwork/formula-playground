import { ArrayCell } from "./ArrayCell";
import type { CellProps } from "./Cell";
import InputCell from "./InputCell";

export const CELL_REGISTRY = new Map<string, React.FC<CellProps>>([
  ["text", InputCell],
  ["number", InputCell],
  ["array", ArrayCell],
]);

export const registerCell = (id: string, component: React.FC<CellProps>) => {
  CELL_REGISTRY.set(id, component);
};

export const getCell = (id: string) => {
  return CELL_REGISTRY.get(id);
};
