import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  redirect,
  Outlet,
} from "react-router";
import { Toolbar } from "./components/Toolbar";
import { LeftPanel } from "./components/LeftPanel";
import { FormulaDocs } from "./components/FormulaDocs";
import { FormulaCode } from "./components/FormulaCode";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useFormulaStore } from "../../store/formulaStore";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import { CodeInput } from "./components/CodeInput";
import { db } from "../../lib/dexie";
import { formulaRepository } from "@/modules/formulaRepository";
import { parseUrlList } from "@/lib/urls";
import { useFormulaUrlSync } from "./hooks/useFormulaUrlSync";
import { FormulaDataSheet } from "@/modules/formula-datasheet/formulaDataSheet";

/**
 * PlaygroundPage
 *
 * High-level page that wires together formula initialization, import flow,
 * error display, and two alternate layouts (developer vs user).
 *
 * Structure goals:
 * - Keep async effects and handlers small, named, and guarded
 * - Isolate view concerns into tiny in-file components for readability
 */
export function PlaygroundPage() {
  const { loadFormulasFromAllSources, error } = useFormulaStore();

  // Tracks whether we need the user to import from GitHub initially
  const [needsImport, setNeedsImport] = useState(false);
  // Tracks the busy state of the import action to prevent duplicate triggers
  const [busy, setBusy] = useState(false);

  /**
   * Initialize formulas from all sources (IndexedDB + config file) on first mount.
   * Uses an unmounted guard to prevent state updates after unmount.
   */
  useEffect(() => {
    let isMounted = true;
    async function checkFormulas() {
      if (!isMounted) return;

      // Check if we have any formulas loaded
      const count = await db.formulas.count();
      // Also check if config file has formulas (we already loaded them, but check count)
      // If no formulas from any source, show import prompt
      if (count === 0) {
        // Try to fetch config file to see if it has formulas
        try {
          const response = await fetch("/formulas.json");
          if (response.ok) {
            const configFormulas = await response.json();
            if (configFormulas.length === 0) {
              setNeedsImport(true);
            } else {
              setNeedsImport(false);
            }
          } else {
            setNeedsImport(true);
          }
        } catch {
          setNeedsImport(true);
        }
      } else {
        setNeedsImport(false);
      }
    }
    void checkFormulas();
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Prompts the user for GitHub URLs (newline-separated), sanitizes input,
   * and returns a unique list. Returns null if user cancels or no URLs.
   */
  const promptForGitHubUrls = useCallback((): string[] | null => {
    const input = window.prompt(
      "请输入 GitHub 地址列表（每行一个，支持 raw/blob/tree 链接）"
    );
    const urls = parseUrlList(input);
    return urls.length > 0 ? urls : null;
  }, []);

  /**
   * Handles importing formulas from GitHub, then refreshes local cache.
   * Uses try/finally to ensure the busy state is cleared.
   */
  const handleImport = useCallback(async () => {
    const urls = promptForGitHubUrls();
    if (!urls) return;

    setBusy(true);
    try {
      const res = await formulaRepository.importFromGithubAndRefresh(
        urls,
        loadFormulasFromAllSources
      );
      if (res.success) {
        setNeedsImport(false);
      } else {
        alert(`导入失败: ${res.error}`);
      }
    } catch (e) {
      alert(`导入过程中出现异常: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [loadFormulasFromAllSources, promptForGitHubUrls]);

  // Root layout rendered under Router to ensure hooks like useNavigate work in children
  const RootLayout = useCallback(
    function RootLayout() {
      return (
        <div className="h-screen flex flex-col relative">
          <Toolbar />
          <ImportBanner
            visible={needsImport}
            busy={busy}
            onImport={handleImport}
          />
          <ErrorBanner error={error} />
          <div className="flex-1 overflow-hidden relative">
            {/* Render child routes here */}
            <Outlet />
          </div>
        </div>
      );
    },
    [busy, error, handleImport, needsImport]
  );

  // Create router once; wrap pages with RootLayout to place Toolbar inside Router
  const router = useMemo(
    () =>
      createBrowserRouter([
        {
          element: <RootLayout />,
          children: [
            { path: "/", element: <UserLayout /> },
            { path: "/formula/:id", element: <UserLayout /> },
            { path: "/dev", element: <DeveloperLayout /> },
            { path: "*", loader: () => redirect("/") },
          ],
        },
      ]),
    [RootLayout]
  );

  return (
    // Provide router for the whole page; RootLayout owns the shell/toolbar
    <RouterProvider router={router} />
  );
}

/**
 * ImportBanner
 *
 * Displays a callout prompting the user to import formulas when none are found.
 */
function ImportBanner(props: {
  visible: boolean;
  busy: boolean;
  onImport: () => void;
}) {
  const { visible, busy, onImport } = props;
  if (!visible) return null;
  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3 flex items-center justify-between">
      <p className="text-sm text-yellow-800">
        检测到本地没有公式列表。请先从 GitHub 拉取源码并解析。
      </p>
      <button
        className="px-3 py-1.5 rounded bg-yellow-600 text-white text-sm disabled:opacity-50"
        onClick={onImport}
        disabled={busy}
      >
        {busy ? "处理中..." : "从 GitHub 拉取并解析"}
      </button>
    </div>
  );
}

/**
 * ErrorBanner
 *
 * Renders store-level error information when present.
 */
function ErrorBanner(props: { error: string | null | undefined }) {
  const { error } = props;
  if (!error) return null;
  return (
    <div className="bg-red-50 border-b border-red-200 px-6 py-3">
      <p className="text-sm text-red-800">
        <span className="font-semibold">Error:</span> {error}
      </p>
    </div>
  );
}

/**
 * DeveloperLayout
 *
 * Two-panel horizontal split: flow canvas (left) and code input (right).
 */
function DeveloperLayout() {
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={60} minSize={30}>
        <div className="h-full">
          {/* <CenterCanvas /> */}
          <FormulaDataSheet />
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={40} minSize={30}>
        <div className="h-full">
          <CodeInput />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

/**
 * UserLayout
 *
 * Three-area layout: left navigation, main canvas, and bottom docs/code split.
 * Integrates URL synchronization for formula sharing.
 */
function UserLayout() {
  // Sync formula ID and parameters with URL
  // This hook handles:
  // - Updating URL when formula/params change
  // - Restoring state from URL when page loads/shared URL is opened
  // - Preventing circular updates
  useFormulaUrlSync();

  // Get selected formula from formula store
  const { selectedFormulaId, formulaDefinitions } = useFormulaStore();

  // Get setCurrentFormula from spreadsheet store
  const setCurrentFormula = useSpreadsheetStore(
    (state) => state.setCurrentFormula
  );

  // Sync currentFormula to spreadsheetStore when selection changes
  useEffect(() => {
    const formula = selectedFormulaId
      ? formulaDefinitions.find((f) => f.id === selectedFormulaId)
      : undefined;
    setCurrentFormula(formula);
  }, [selectedFormulaId, formulaDefinitions, setCurrentFormula]);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={18} minSize={15} maxSize={30}>
        <div className="h-full">
          <LeftPanel />
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={78} minSize={40}>
        <ResizablePanelGroup direction="vertical" className="h-full">
          <ResizablePanel defaultSize={70} minSize={40}>
            <div className="h-full">
              <FormulaDataSheet />
              {/* <CenterCanvas /> */}
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
  );
}
