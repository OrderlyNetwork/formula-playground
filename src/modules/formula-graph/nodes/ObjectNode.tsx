import { Handle, Position } from "reactflow";
import { Fragment, memo, useMemo } from "react";
import type { FormulaNodeData } from "@/types/formula";
import { cn } from "@/lib/utils";
import { getConnectionConfigFromFactorType } from "../utils/nodeTypes";

interface ObjectNodeProps {
  id: string;
  data: FormulaNodeData;
  selected?: boolean;
}

const HEADER_HEIGHT = 44;
const HANDLE_GAP = 24;
const HEADER_TO_FIRST_HANDLE_GAP = 12;
const BOTTOM_PADDING = 12;

export const ObjectNode = memo(function ObjectNode({
  id,
  data,
  selected,
}: ObjectNodeProps) {
  const inputs = data.inputs ?? [];
  const handleCount = inputs.length;
  const containerMinHeight =
    HEADER_HEIGHT +
    HEADER_TO_FIRST_HANDLE_GAP +
    Math.max(1, handleCount) * HANDLE_GAP +
    BOTTOM_PADDING;

  // Generate dynamic connection configuration for each property
  const propertyConfigs = useMemo(() => {
    const configs = new Map<
      string,
      { acceptedTypes: string[]; allowArray: boolean }
    >();

    inputs.forEach((input) => {
      const config = getConnectionConfigFromFactorType(
        input.factorType || {
          baseType: input.type,
          nullable: true,
        }
      );
      configs.set(input.key, {
        acceptedTypes: config.acceptedTypes,
        allowArray: config.allowArray || false,
      });
    });

    return configs;
  }, [inputs]);

  return (
    <div
      className={cn(
        "p-3 rounded-lg border-2 bg-white shadow-sm min-w-[240px] relative",
        "border-sky-500",
        data.isError && "border-red-500",
        // Selected state: thicker border, stronger shadow, and subtle background highlight
        selected && "border-sky-600 shadow-lg ring-2 ring-sky-200"
      )}
      style={{ minHeight: containerMinHeight }}
    >
      <div className="font-semibold text-gray-900 mb-1">
        Object: {data.label}
      </div>
      {data.description && (
        <div className="text-xs text-gray-600 mb-2 line-clamp-2">
          {data.description}
        </div>
      )}

      {inputs.map((input, index) => {
        const config = propertyConfigs.get(input.key);
        const acceptedTypesText = config
          ? `Accepts: ${config.acceptedTypes.join(", ")}${
              config.allowArray ? " (or arrays)" : ""
            }`
          : `Accepts: ${input.type}`;

        return (
          <Fragment key={input.key}>
            <Handle
              id={input.key}
              type="target"
              position={Position.Left}
              className="w-3 h-3 bg-sky-500"
              style={{
                top:
                  HEADER_HEIGHT +
                  6 +
                  HEADER_TO_FIRST_HANDLE_GAP +
                  index * HANDLE_GAP,
              }}
              title={`${input.key}: ${acceptedTypesText}`}
            />
            <span
              className="absolute text-[10px] text-sky-700 bg-sky-50 border border-sky-200 rounded px-1 py-0.5"
              style={{
                top:
                  HEADER_HEIGHT -
                  4 +
                  HEADER_TO_FIRST_HANDLE_GAP +
                  index * HANDLE_GAP,
                left: 16,
              }}
              title={`${input.key}: ${input.type}${
                input.unit ? ` (${input.unit})` : ""
              }`}
            >
              {input.key}
              {input.unit && (
                <span className="text-[8px] ml-1">({input.unit})</span>
              )}
            </span>
          </Fragment>
        );
      })}

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-sky-500"
      />
    </div>
  );
});
