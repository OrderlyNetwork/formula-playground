import { Input } from "../common/Input";
import type { FormulaDefinition } from "../../types/formula";

interface ParameterInputProps {
  input: FormulaDefinition["inputs"][0];
  value: any;
  onChange: (key: string, value: any) => void;
}

export function ParameterInput({
  input,
  value,
  onChange,
}: ParameterInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue: any = e.target.value;

    // Convert to appropriate type
    if (input.type === "number") {
      newValue = parseFloat(e.target.value);
      if (isNaN(newValue)) newValue = 0;
    } else if (input.type === "boolean") {
      newValue = e.target.value === "true";
    }

    onChange(input.key, newValue);
  };

  return (
    <div className="space-y-1">
      <Input
        label={input.key}
        type={input.type === "number" ? "number" : "text"}
        value={value ?? ""}
        onChange={handleChange}
        placeholder={input.description}
      />
      <div className="flex justify-between text-xs text-gray-500">
        {input.unit && <span>Unit: {input.unit}</span>}
        {input.default !== undefined && (
          <span>Default: {String(input.default)}</span>
        )}
      </div>
      {input.description && (
        <p className="text-xs text-gray-600">{input.description}</p>
      )}
    </div>
  );
}
