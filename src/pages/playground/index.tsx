import { useEffect, useState } from "react";
import { Toolbar } from "./components/Toolbar";
import { LeftPanel } from "./components/LeftPanel";
import { CenterCanvas } from "./components/CenterCanvas";
import { FormulaDocs } from "./components/FormulaDocs";
import { FormulaCode } from "./components/FormulaCode";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useFormulaStore } from "../../store/formulaStore";
import { db } from "../../lib/dexie";
import { sourceLoaderService } from "../../modules/source-loader";

export function PlaygroundPage() {
  const { loadFormulas, error } = useFormulaStore();
  const [needsImport, setNeedsImport] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const count = await db.formulas.count();
      if (count > 0) {
        const defs = await db.formulas.toArray();
        await loadFormulas(defs);
        setNeedsImport(false);
      } else {
        setNeedsImport(true);
      }
    })();
  }, [loadFormulas]);

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
    setBusy(true);
    const res = await sourceLoaderService.importFromGitHub(urls);
    if (res.success) {
      const defs = await db.formulas.toArray();
      await loadFormulas(defs);
      setNeedsImport(false);
    } else {
      alert(`导入失败: ${res.error}`);
    }
    setBusy(false);
  };

  return (
    <div className="h-screen flex flex-col">
      <Toolbar />

      {needsImport && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3 flex items-center justify-between">
          <p className="text-sm text-yellow-800">
            检测到本地没有公式列表。请先从 GitHub 拉取源码并解析。
          </p>
          <button
            className="px-3 py-1.5 rounded bg-yellow-600 text-white text-sm disabled:opacity-50"
            onClick={handleImport}
            disabled={busy}
          >
            {busy ? "处理中..." : "从 GitHub 拉取并解析"}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <p className="text-sm text-red-800">
            <span className="font-semibold">Error:</span> {error}
          </p>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full">
              <LeftPanel />
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={78} minSize={40}>
            <ResizablePanelGroup direction="vertical" className="h-full">
              <ResizablePanel defaultSize={70} minSize={40}>
                <div className="h-full">
                  <CenterCanvas />
                </div>
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={30} minSize={20}>
                <ResizablePanelGroup direction="horizontal" className="h-full">
                  <ResizablePanel defaultSize={50} minSize={20}>
                    <FormulaDocs />
                  </ResizablePanel>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={50} minSize={20}>
                    <FormulaCode />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
