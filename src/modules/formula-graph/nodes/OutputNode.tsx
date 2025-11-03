import { Handle, Position } from "reactflow";
import { memo, useEffect, useMemo } from "react";
import type { FormulaNodeData } from "@/types/formula";
import { cn } from "@/lib/utils";
import { useGraphStore } from "@/store/graphStore";

interface OutputNodeProps {
  id: string;
  data: FormulaNodeData;
}

/**
 * OutputNode - Custom React Flow node for formula outputs
 * 响应式监听上游节点的数据变化并自动更新
 */
export const OutputNode = memo(function OutputNode({
  id,
  data,
}: OutputNodeProps) {
  const { edges, nodes, updateNodeData } = useGraphStore();

  // 找到连接到这个 OutputNode 的上游节点（通过 edge）
  const incomingEdge = useMemo(() => {
    if (!edges || !Array.isArray(edges)) return undefined;
    return edges.find((edge) => edge.target === id);
  }, [edges, id]);

  const sourceNode = useMemo(() => {
    if (!incomingEdge || !nodes || !Array.isArray(nodes)) return null;
    return nodes.find((n) => n.id === incomingEdge.source);
  }, [nodes, incomingEdge]);

  // 响应式监听上游节点的值变化
  useEffect(() => {
    if (!sourceNode || !incomingEdge) return;

    // 如果上游节点是 FormulaNode，其值变化会通过 notifyUpstreamNodeChange 自动更新
    // 这里主要是为了处理其他类型的上游节点（如果将来有的话）
    if (sourceNode.type === "formula") {
      // FormulaNode 的值变化已经通过 runnerService 处理，这里不需要额外处理
      return;
    }

    // 对于其他类型的源节点，直接从其 data.value 中获取值
    const sourceValue = sourceNode.data?.value;
    if (sourceValue !== undefined && data.value !== sourceValue) {
      // 如果有 sourceHandle，可能需要从对象中提取特定字段
      let valueToUse: unknown = sourceValue;
      if (
        incomingEdge.sourceHandle &&
        typeof sourceValue === "object" &&
        sourceValue !== null
      ) {
        const key = incomingEdge.sourceHandle;
        valueToUse = (sourceValue as Record<string, unknown>)[key];
      }

      if (data.value !== valueToUse) {
        updateNodeData(id, { value: valueToUse });
      }
    }
  }, [sourceNode?.data?.value, incomingEdge, data.value, id, updateNodeData]);

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg border-2 bg-white shadow-sm w-[220px]",
        "border-green-400",
        data.isError && "border-red-500",
        data.diff !== undefined &&
          data.diff > 1e-10 &&
          "border-orange-500 shadow-lg"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-green-500"
      />
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold text-green-600 uppercase">
          Output
        </div>
        <div className="font-medium text-gray-900">{data.label}</div>
        {data.value !== undefined && (
          <div className="text-sm text-gray-700 font-mono">
            {typeof data.value === "number"
              ? data.value.toFixed(8)
              : String(data.value)}
            {data.unit && (
              <span className="ml-1 text-xs text-gray-500">{data.unit}</span>
            )}
          </div>
        )}
        {data.diff !== undefined && data.diff > 0 && (
          <div className="text-xs text-orange-600 font-medium mt-1">
            Diff: {data.diff.toExponential(2)}
          </div>
        )}
        {data.description && (
          <div className="text-xs text-gray-500 mt-1 text-left">
            {data.description}
          </div>
        )}
      </div>
    </div>
  );
});
