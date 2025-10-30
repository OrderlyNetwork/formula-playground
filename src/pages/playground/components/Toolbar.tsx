import { useFormulaStore } from "../../../store/formulaStore";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router";

export function Toolbar() {
  const { selectedFormulaId, executeFormula, loading, switchEngine } =
    useFormulaStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active tab from current URL path instead of global app store
  const isDeveloper = location.pathname.startsWith("/dev");
  const isNormal = !isDeveloper; // root and any non-dev path treated as normal

  return (
    // Use tighter toolbar paddings/heights to increase information density
    <div className="h-12 border-b border-gray-200 bg-white px-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-gray-900">SDK Playground</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Mode tabs: now route-driven; clicking navigates between "/" and "/dev" */}
        {/* Compact mode tabs: smaller paddings and font size */}
        <div className="flex items-center">
          <button
            onClick={() => navigate("/")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors relative ${
              isNormal ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            正常模式
            {isNormal && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
            )}
          </button>
          <button
            onClick={() => navigate("/dev")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors relative ${
              isDeveloper
                ? "text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            开发者模式
            {isDeveloper && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Engine:</span>
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
