import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { cn } from "@/lib/utils";
import { db } from "@/lib/dexie";
import { useFormulaStore } from "@/store/formulaStore";
import type { FormulaDefinition } from "@/types/formula";
import { Trash2, RefreshCw, Plus, Edit2, Save, X } from "lucide-react";
import { formulaRepository } from "@/modules/formulaRepository";
import { parseUrlList } from "@/lib/urls";

/**
 * Source code management category type
 */
type SourceCategory = "github" | "jsdelivr" | "database";

/**
 * Source code management categories
 */
const categories: { id: SourceCategory; label: string }[] = [
  { id: "github", label: "GitHub 源码" },
  { id: "jsdelivr", label: "jsDelivr 执行" },
  { id: "database", label: "数据库管理" },
];

interface SourceCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Source Code Dialog Component with left-right layout
 * Manages GitHub sources, jsDelivr execution, and IndexedDB storage
 */
export function SourceCodeDialog({
  open,
  onOpenChange,
}: SourceCodeDialogProps) {
  const [activeCategory, setActiveCategory] =
    useState<SourceCategory>("github");
  const [githubUrls, setGithubUrls] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [formulas, setFormulas] = useState<FormulaDefinition[]>([]);
  const [editingFormulaId, setEditingFormulaId] = useState<string | null>(null);
  const [editingJsdelivr, setEditingJsdelivr] = useState({
    url: "",
    functionName: "",
    version: "",
    enabled: true,
  });

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
      alert("请输入至少一个 GitHub URL");
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
        alert(`已从 GitHub 导入公式 ${res.count} 个`);
        setGithubUrls("");
      } else {
        alert(`导入失败: ${res.error}`);
      }
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Delete a formula from IndexedDB
   */
  const handleDeleteFormula = async (formulaId: string) => {
    if (!confirm("确定要删除这个公式吗？")) return;

    try {
      await formulaRepository.deleteAndRefresh(formulaId, loadFormulas);
      await loadFormulasFromDB();
      alert("已删除公式");
    } catch (error) {
      alert(`删除失败: ${error}`);
    }
  };

  /**
   * Start editing jsDelivr config for a formula
   */
  const handleEditJsdelivr = (formula: FormulaDefinition) => {
    setEditingFormulaId(formula.id);
    setEditingJsdelivr({
      url: formula.jsdelivrInfo?.url || "",
      functionName: formula.jsdelivrInfo?.functionName || formula.id,
      version: formula.jsdelivrInfo?.version || "latest",
      enabled: formula.jsdelivrInfo?.enabled ?? true,
    });
  };

  /**
   * Save jsDelivr config for a formula
   */
  const handleSaveJsdelivr = async () => {
    if (!editingFormulaId) return;

    try {
      const formula = formulas.find((f) => f.id === editingFormulaId);
      if (!formula) return;

      const updatedFormula: FormulaDefinition = {
        ...formula,
        jsdelivrInfo: {
          url: editingJsdelivr.url,
          functionName: editingJsdelivr.functionName,
          version: editingJsdelivr.version,
          enabled: editingJsdelivr.enabled,
        },
      };

      await db.formulas.put(updatedFormula);
      await formulaRepository.refreshStore(loadFormulas);
      await loadFormulasFromDB();
      setEditingFormulaId(null);
      alert("已保存 jsDelivr 配置");
    } catch (error) {
      alert(`保存失败: ${error}`);
    }
  };

  /**
   * Cancel editing jsDelivr config
   */
  const handleCancelEdit = () => {
    setEditingFormulaId(null);
  };

  /**
   * Clear all formulas from IndexedDB
   */
  const handleClearDatabase = async () => {
    if (!confirm("确定要清空所有公式数据吗？此操作不可恢复！")) return;

    try {
      await formulaRepository.clearAllAndRefresh(loadFormulas);
      await loadFormulasFromDB();
      alert("已清空所有公式数据");
    } catch (error) {
      alert(`清空失败: ${error}`);
    }
  };

  /**
   * Clear compiled formulas cache from IndexedDB
   */
  const handleClearCache = async () => {
    if (!confirm("确定要清空编译缓存吗？")) return;

    try {
      await db.compiledFormulas.clear();
      alert("已清空编译缓存");
    } catch (error) {
      alert(`清空失败: ${error}`);
    }
  };

  /**
   * Refresh formulas from GitHub
   */
  const handleRefreshFromGithub = async () => {
    const formulasWithGithub = formulas.filter((f) => f.githubInfo?.url);

    if (formulasWithGithub.length === 0) {
      alert("没有可刷新的 GitHub 源码");
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
        alert(`已从 GitHub 更新公式 ${res.count} 个`);
      } else {
        alert(`更新失败: ${res.error}`);
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
      case "github":
        return (
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold mb-1.5">从 GitHub 导入</h3>
              <p className="text-xs text-gray-600 mb-3">
                从 GitHub 导入公式源码，支持 raw/blob/tree 链接，每行一个
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-2.5 mb-3">
                <p className="text-xs text-blue-800">
                  <strong>注意：</strong>GitHub 源码仅用于显示和元数据提取
                  <br />
                  如需配置执行代码，请在 jsDelivr 标签页设置
                </p>
              </div>
              <textarea
                className="w-full h-28 p-2.5 border border-gray-300 rounded-md resize-none font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://github.com/user/repo/blob/main/file.ts&#10;https://raw.githubusercontent.com/user/repo/main/file.ts"
                value={githubUrls}
                onChange={(e) => setGithubUrls(e.target.value)}
              />
              <div className="flex justify-between mt-3">
                <Button
                  variant="outline"
                  onClick={handleRefreshFromGithub}
                  disabled={isImporting}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  更新现有源码
                </Button>
                <Button
                  onClick={handleGitHubImport}
                  disabled={isImporting || !githubUrls.trim()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isImporting ? "导入中..." : "导入"}
                </Button>
              </div>
            </div>

            {/* Formula List */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-1.5">已导入的公式</h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {formulas.length === 0 ? (
                  <p className="text-xs text-gray-500">暂无公式</p>
                ) : (
                  formulas.map((formula) => (
                    <div
                      key={formula.id}
                      className="flex items-center justify-between p-2.5 bg-white border border-gray-200 rounded-md"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-xs">
                          {formula.name}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {formula.githubInfo?.url || "无 GitHub 源码"}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFormula(formula.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );

      case "jsdelivr":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold mb-2">
                jsDelivr 执行配置
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                为每个公式配置 jsDelivr CDN 执行代码
              </p>
            </div>

            {/* Formula List with jsDelivr Config */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {formulas.length === 0 ? (
                <p className="text-sm text-gray-500">暂无公式</p>
              ) : (
                formulas.map((formula) => (
                  <div
                    key={formula.id}
                    className="p-3 bg-white border border-gray-200 rounded-md"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">{formula.name}</div>
                      {editingFormulaId === formula.id ? (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveJsdelivr}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                            className="text-gray-600 hover:text-gray-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditJsdelivr(formula)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {editingFormulaId === formula.id ? (
                      <div className="space-y-2">
                        <Input
                          placeholder="jsDelivr URL"
                          value={editingJsdelivr.url}
                          onChange={(e) =>
                            setEditingJsdelivr({
                              ...editingJsdelivr,
                              url: e.target.value,
                            })
                          }
                          className="text-xs"
                        />
                        <div className="flex gap-2">
                          <Input
                            placeholder="函数名"
                            value={editingJsdelivr.functionName}
                            onChange={(e) =>
                              setEditingJsdelivr({
                                ...editingJsdelivr,
                                functionName: e.target.value,
                              })
                            }
                            className="text-xs flex-1"
                          />
                          <Input
                            placeholder="版本"
                            value={editingJsdelivr.version}
                            onChange={(e) =>
                              setEditingJsdelivr({
                                ...editingJsdelivr,
                                version: e.target.value,
                              })
                            }
                            className="text-xs w-24"
                          />
                        </div>
                        <label className="flex items-center text-xs">
                          <input
                            type="checkbox"
                            checked={editingJsdelivr.enabled}
                            onChange={(e) =>
                              setEditingJsdelivr({
                                ...editingJsdelivr,
                                enabled: e.target.checked,
                              })
                            }
                            className="mr-2"
                          />
                          启用 jsDelivr 执行
                        </label>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600">
                        {formula.jsdelivrInfo?.enabled ? (
                          <>
                            <div className="truncate">
                              URL: {formula.jsdelivrInfo.url || "未配置"}
                            </div>
                            <div>
                              函数:{" "}
                              {formula.jsdelivrInfo.functionName || "未配置"} |
                              版本: {formula.jsdelivrInfo.version || "未配置"}
                            </div>
                          </>
                        ) : (
                          <div className="text-orange-600">jsDelivr 已禁用</div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case "database":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold mb-2">数据库管理</h3>
              <p className="text-sm text-gray-600 mb-4">
                管理 IndexedDB 中的公式数据和缓存
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-white border border-gray-200 rounded-md">
                <h4 className="font-medium text-sm mb-2">清空编译缓存</h4>
                <p className="text-xs text-gray-600 mb-3">
                  清空 jsDelivr 编译缓存，下次执行时会重新加载
                </p>
                <Button variant="outline" onClick={handleClearCache}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  清空缓存
                </Button>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <h4 className="font-medium text-sm mb-2 text-red-900">
                  清空所有数据
                </h4>
                <p className="text-xs text-red-700 mb-3">
                  <strong>危险操作：</strong>
                  将删除所有公式定义、配置和缓存，不可恢复
                </p>
                <Button
                  variant="outline"
                  onClick={handleClearDatabase}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  清空所有数据
                </Button>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                <h4 className="font-medium text-sm mb-2">数据统计</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>公式数量: {formulas.length}</div>
                  <div>
                    已配置 jsDelivr:{" "}
                    {formulas.filter((f) => f.jsdelivrInfo?.url).length}
                  </div>
                  <div>
                    已启用执行:{" "}
                    {formulas.filter((f) => f.jsdelivrInfo?.enabled).length}
                  </div>
                </div>
              </div>
            </div>
          </div>
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
          <DialogTitle className="text-base">源码与执行配置</DialogTitle>
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
                    "w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors",
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
