import { Handle, Position } from "reactflow";
import { memo } from "react";
import type { FormulaNodeData } from "../../../types/formula";
import { cn } from "../../../lib/utils";
// import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { useFormulaStore } from "../../../store/formulaStore";
import { Input } from "@/components/ui/input";

interface InputNodeProps {
  data: FormulaNodeData;
}

/**
 * InputNode - Custom React Flow node for formula inputs
 */
export const InputNode = memo(function InputNode({ data }: InputNodeProps) {
  const { updateInput, updateInputAt } = useFormulaStore();

  const handleTextOrNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue: string | number = e.target.value;
    if (data.inputType === "number") {
      const parsed = parseFloat(newValue);
      newValue = isNaN(parsed) ? 0 : parsed;
    }
    const fn = data.id.includes(".") ? updateInputAt : updateInput;
    fn(data.id, newValue);
  };

  const handleBooleanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value === "true";
    const fn = data.id.includes(".") ? updateInputAt : updateInput;
    fn(data.id, newValue);
  };

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[180px]",
        "border-blue-400",
        data.isError && "border-red-500"
      )}
    >
      <div className="flex flex-col gap-1 items-start">
        <div className="font-medium text-gray-900">{data.label}</div>
        <div className="mt-1">
          {data.inputType === "boolean" ? (
            <Select
              aria-label={data.label}
              value={String(Boolean(data.value))}
              onChange={handleBooleanChange}
              options={[
                { value: "true", label: "true" },
                { value: "false", label: "false" },
              ]}
            />
          ) : (
            (() => {
              const valueForInput: string | number =
                data.inputType === "number"
                  ? typeof data.value === "number"
                    ? data.value
                    : 0
                  : String(data.value ?? "");
              return (
                <Input
                  aria-label={data.label}
                  type={data.inputType === "number" ? "number" : "text"}
                  value={valueForInput}
                  onChange={handleTextOrNumberChange}
                />
              );
            })()
          )}
        </div>
        {data.description && (
          <div className="text-xs text-gray-500 mt-1">{data.description}</div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500"
      />
    </div>
  );
});
