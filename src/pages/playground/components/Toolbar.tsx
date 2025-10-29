import { Button } from "../../../components/common/Button";
import { Select } from "../../../components/common/Select";
import { useFormulaStore } from "../../../store/formulaStore";

export function Toolbar() {
  const {
    formulaDefinitions,
    selectedFormulaId,
    selectFormula,
    executeFormula,
    loading,
    activeEngine,
    switchEngine,
  } = useFormulaStore();

  const formulaOptions = formulaDefinitions.map((f) => ({
    value: f.id,
    label: f.name,
  }));

  return (
    <div className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-900">Formula Playground</h1>

        {formulaOptions.length > 0 && (
          <Select
            value={selectedFormulaId || ""}
            onChange={(e) => selectFormula(e.target.value)}
            options={formulaOptions}
            className="w-64"
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Engine:</span>
          <Button
            variant={activeEngine === "ts" ? "primary" : "outline"}
            size="sm"
            onClick={() => switchEngine("ts")}
          >
            TS
          </Button>
          <Button
            variant={activeEngine === "rust" ? "primary" : "outline"}
            size="sm"
            onClick={() => switchEngine("rust")}
            disabled
            title="Rust engine coming in Phase 2"
          >
            Rust
          </Button>
        </div>

        <Button
          variant="primary"
          onClick={executeFormula}
          disabled={loading || !selectedFormulaId}
        >
          {loading ? "Running..." : "Run"}
        </Button>
      </div>
    </div>
  );
}
