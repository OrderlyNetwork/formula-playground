import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { db } from "@/lib/dexie";
import { useFormulaStore } from "@/store/formulaStore";
import type { FormulaDefinition } from "@/types/formula";
import { formulaRepository } from "@/modules/formulaRepository";
import { parseUrlList } from "@/lib/urls";
import {
  SourceManagementComponent,
  JsDelivrConfigComponent,
  DatabaseManagementComponent,
} from "./SourceCodeComponents";

/**
 * Source code management category type
 */
type SourceCategory = "source" | "jsdelivr" | "database";

/**
 * Source code management categories
 */
const categories: { id: SourceCategory; label: string }[] = [
  { id: "source", label: "Source Code" },
  { id: "jsdelivr", label: "jsDelivr" },
  { id: "database", label: "Database" },
];

interface SourceCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LocalFile {
  id: string;
  name: string;
  content: string;
  size: number;
  lastModified: Date;
}

/**
 * Source Code Dialog Component with left-right layout
 * Manages GitHub sources, local file uploads, jsDelivr execution, and IndexedDB storage
 */
export function SourceCodeDialog({
  open,
  onOpenChange,
}: SourceCodeDialogProps) {
  const [activeCategory, setActiveCategory] =
    useState<SourceCategory>("source");
  const [githubUrls, setGithubUrls] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formulas, setFormulas] = useState<FormulaDefinition[]>([]);
  // jsDelivr global config is derived for initial display; edits happen in child and saved via callback

  const { loadFormulas } = useFormulaStore();

  /**
   * Load formulas from IndexedDB when dialog opens
   */
  useEffect(() => {
    if (open) {
      loadFormulasFromDB();
    }
  }, [open]);

  /**
   * Load all formulas from IndexedDB
   */
  const loadFormulasFromDB = async () => {
    const defs = await formulaRepository.list();
    setFormulas(defs);
  };

  /**
   * Handle GitHub import submission
   */
  const handleGitHubImport = async () => {
    const urls = parseUrlList(githubUrls);
    if (urls.length === 0) {
      alert("Please enter at least one GitHub URL");
      return;
    }

    setIsImporting(true);
    try {
      const res = await formulaRepository.importFromGithubAndRefresh(
        urls,
        loadFormulas
      );
      if (res.success) {
        await loadFormulasFromDB();
        alert(`Imported ${res.count} formulas from GitHub`);
        setGithubUrls("");
      } else {
        alert(`Import failed: ${res.error}`);
      }
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Handle local file upload
   */
  const handleLocalUpload = async () => {
    if (localFiles.length === 0) {
      setUploadError("Please select at least one file");
      return;
    }

    setIsImporting(true);
    setUploadError(null);

    try {
      const res = await formulaRepository.importFromLocalFilesAndRefresh(
        localFiles,
        loadFormulas
      );
      if (res.success) {
        await loadFormulasFromDB();
        alert(`Imported ${res.count} formulas from local files`);
        setLocalFiles([]);
      } else {
        setUploadError(res.error || "Upload failed");
      }
    } finally {
      setIsImporting(false);
    }
  };

  // Parse package/version from an npm jsDelivr URL
  const parseFromUrl = (url?: string): { pkg?: string; ver?: string } => {
    if (!url) return {};
    const match = url.match(/\/npm\/([^@]+)@([^/]+)/);
    if (match) return { pkg: decodeURIComponent(match[1]), ver: match[2] };
    return {};
  };

  // Initial global config derived from existing formulas (fallbacks provided in child if undefined)
  const initialGlobalJsdelivr = useMemo(() => {
    const firstEnabled = formulas.find((f) => f.jsdelivrInfo?.enabled);
    const { pkg, ver } = parseFromUrl(firstEnabled?.jsdelivrInfo?.url);
    return {
      packageName: pkg || "@orderly.network/perp",
      version: ver || firstEnabled?.jsdelivrInfo?.version || "latest",
      enabled: firstEnabled?.jsdelivrInfo?.enabled ?? true,
    };
  }, [formulas]);

  // Save global jsDelivr config for all formulas
  const handleSaveJsdelivrGlobal = async (config: {
    url: string;
    version: string;
  }) => {
    try {
      const updated = formulas.map((f) => ({
        ...f,
        jsdelivrInfo: {
          url: config.url,
          functionName: f.id, // use formula id as exported function name
          version: config.version,
          enabled: true, // Default to enabled when saving globally
        },
      }));
      await db.formulas.bulkPut(updated);
      await formulaRepository.refreshStore(loadFormulas);
      await loadFormulasFromDB();
      alert("Saved jsDelivr global configuration");
    } catch (error) {
      alert(`Save failed: ${error}`);
    }
  };

  /**
   * Clear all formulas from IndexedDB
   */
  const handleClearDatabase = async () => {
    if (
      !confirm(
        "Are you sure you want to clear all formula data? This action cannot be undone!"
      )
    )
      return;

    try {
      await formulaRepository.clearAllAndRefresh(loadFormulas);
      await loadFormulasFromDB();
      alert("All formula data cleared");
    } catch (error) {
      alert(`Clear failed: ${error}`);
    }
  };

  /**
   * Clear compiled formulas cache from IndexedDB
   */
  const handleClearCache = async () => {
    if (!confirm("Are you sure you want to clear the compilation cache?"))
      return;

    try {
      await db.compiledFormulas.clear();
      alert("Compilation cache cleared");
    } catch (error) {
      alert(`Clear failed: ${error}`);
    }
  };

  /**
   * Refresh formulas from GitHub
   */
  const handleRefreshFromGithub = async () => {
    const formulasWithGithub = formulas.filter((f) => f.githubInfo?.url);

    if (formulasWithGithub.length === 0) {
      alert("No GitHub source code available to refresh");
      return;
    }

    const urls = formulasWithGithub.map((f) => f.githubInfo!.url);

    setIsImporting(true);
    try {
      const res = await formulaRepository.importFromGithubAndRefresh(
        urls,
        loadFormulas
      );
      if (res.success) {
        await loadFormulasFromDB();
        alert(`Updated ${res.count} formulas from GitHub`);
      } else {
        alert(`Update failed: ${res.error}`);
      }
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Render content for the active category
   */
  const renderCategoryContent = () => {
    switch (activeCategory) {
      case "source":
        return (
          <SourceManagementComponent
            githubUrls={githubUrls}
            setGithubUrls={setGithubUrls}
            localFiles={localFiles}
            setLocalFiles={setLocalFiles}
            isImporting={isImporting}
            uploadError={uploadError}
            onGitHubImport={handleGitHubImport}
            onRefreshFromGithub={handleRefreshFromGithub}
            onLocalUpload={handleLocalUpload}
          />
        );

      case "jsdelivr":
        return (
          <JsDelivrConfigComponent
            formulas={formulas}
            initialPackageName={initialGlobalJsdelivr.packageName}
            initialVersion={initialGlobalJsdelivr.version}
            onSaveGlobal={handleSaveJsdelivrGlobal}
          />
        );

      case "database":
        return (
          <DatabaseManagementComponent
            formulas={formulas}
            onClearCache={handleClearCache}
            onClearDatabase={handleClearDatabase}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Compact dialog paddings to fit more content */}
      <DialogContent className="max-w-4xl h-[560px] p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-base">
            Source Code & Execution Configuration
          </DialogTitle>
        </DialogHeader>

        {/* Left-Right Layout */}
        <div className="flex h-[calc(560px-53px)]">
          {/* Left: Category Navigation */}
          <div className="w-44 border-r p-3">
            <nav className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors",
                    activeCategory === category.id
                      ? "bg-blue-100 text-blue-900 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  {category.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right: Settings Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {renderCategoryContent()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
