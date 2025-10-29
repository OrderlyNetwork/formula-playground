import { useFormulaStore } from "../../../store/formulaStore";
import { sourceLoaderService } from "../../../modules/source-loader";
import { db } from "../../../lib/dexie";
import { Button } from "@/components/ui/button";

export function Toolbar() {
  const {
    selectedFormulaId,
    executeFormula,
    loading,
    activeEngine,
    switchEngine,
  } = useFormulaStore();

  const handleImport = async () => {
    const input = window.prompt(
      "请输入 GitHub 地址列表（每行一个，支持 raw/blob/tree 链接）"
    );
    if (!input) return;
    const urls = input
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (urls.length === 0) return;
    const res = await sourceLoaderService.importFromGitHub(urls);
    if (res.success) {
      const defs = await db.formulas.toArray();
      // Reload store with new formulas
      const { loadFormulas } = useFormulaStore.getState();
      await loadFormulas(defs);
      alert(`已导入公式 ${res.count} 个`);
    } else {
      alert(`导入失败: ${res.error}`);
    }
  };

  return (
    <div className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-900">Formula Playground</h1>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={handleImport}>
          从 GitHub 导入
        </Button>
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
