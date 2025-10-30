import { useFormulaStore } from "../../../store/formulaStore";
import { Button } from "@/components/ui/button";
import { useAppStore } from "../../../store/appStore";

export function Toolbar() {
  const { selectedFormulaId, executeFormula, loading, switchEngine } =
    useFormulaStore();

  const { mode, toggleMode } = useAppStore();

  return (
    <div className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-900">Formula Playground</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">模式:</span>
          <Button variant="secondary" size="sm" onClick={toggleMode}>
            {mode === "developer" ? "开发者模式" : "正常模式"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Engine:</span>
          <Button size="sm" onClick={() => switchEngine("ts")}>
            TS
          </Button>
          <Button
            size="sm"
            onClick={() => switchEngine("rust")}
            disabled
            title="Rust engine coming in Phase 2"
          >
            Rust
          </Button>
        </div>

        <Button
          onClick={executeFormula}
          disabled={loading || !selectedFormulaId}
        >
          {loading ? "Running..." : "Run"}
        </Button>
      </div>
    </div>
  );
}
