/**
 * @description Version selector dialog component
 * Allows users to select and switch between different formula library versions
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./common/Button";
// import { Input } from "./common/Input";
import {Input} from '../components/ui/input';
import { useAppStore } from "../store/appStore";
import type { VersionConfig } from "../types/version";
import { loadAndInjectLocalCode } from "../services/localCodeLoader";
import { Check, Loader2, Code, Package, GitBranch } from "lucide-react";
import { cn } from "../lib/utils";

interface VersionSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * @description Get icon for version type
 */
function getVersionTypeIcon(type: VersionConfig["type"]) {
  switch (type) {
    case "release":
      return <Package className="h-4 w-4" />;
    case "dev":
      return <GitBranch className="h-4 w-4" />;
    case "local":
      return <Code className="h-4 w-4" />;
    default:
      return null;
  }
}

/**
 * @description Get badge color for version type
 */
function getVersionTypeBadgeColor(type: VersionConfig["type"]) {
  switch (type) {
    case "release":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "dev":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "local":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:blue-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
}

export function VersionSelector({ open, onOpenChange }: VersionSelectorProps) {
  const {
    versionConfigs,
    currentVersionConfig,
    isLoadingVersionConfigs,
    loadVersionConfigs,
    setCurrentVersion,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [loadingVersion, setLoadingVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load version configs on mount
  useEffect(() => {
    if (open && !versionConfigs && !isLoadingVersionConfigs) {
      loadVersionConfigs();
    }
  }, [open, versionConfigs, isLoadingVersionConfigs, loadVersionConfigs]);

  /**
   * @description Handle version selection
   */
  const handleSelectVersion = async (version: VersionConfig) => {
    if (version.id === currentVersionConfig?.id) {
      onOpenChange(false);
      return;
    }

    setLoadingVersion(version.id);
    setError(null);

    try {
      // If it's a local version, load and inject the code
      if (version.type === "local") {
        await loadAndInjectLocalCode(version);
      }

      // Set the current version
      setCurrentVersion(version.id);
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to switch version:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to switch version. Please try again."
      );
    } finally {
      setLoadingVersion(null);
    }
  };

  // Filter versions based on search query
  const filteredVersions =
    versionConfigs?.versions.filter(
      (v) =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Formula Library Version</DialogTitle>
          <DialogDescription>
            Choose a version of the formula library to use for testing
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="px-1">
          <Input
            placeholder="Search versions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="px-1">
            <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Version list */}
        <div className="flex-1 overflow-y-auto px-1">
          {isLoadingVersionConfigs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">
                Loading versions...
              </span>
            </div>
          ) : filteredVersions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {searchQuery
                ? "No versions match your search"
                : "No versions available"}
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {filteredVersions.map((version) => {
                const isCurrent = version.id === currentVersionConfig?.id;
                const isLoading = loadingVersion === version.id;

                return (
                  <button
                    key={version.id}
                    onClick={() => handleSelectVersion(version)}
                    disabled={isLoading || isCurrent}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border transition-colors",
                      "hover:bg-gray-50 dark:hover:bg-gray-800",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500",
                      isCurrent &&
                        "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
                      (isLoading || isCurrent) &&
                        "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {version.name}
                          </h3>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                              getVersionTypeBadgeColor(version.type)
                            )}
                          >
                            {getVersionTypeIcon(version.type)}
                            <span className="capitalize">{version.type}</span>
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Version: {version.version}
                        </p>
                        {version.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            {version.description}
                          </p>
                        )}
                        {version.packageName && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Package: {version.packageName}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isLoading && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        )}
                        {isCurrent && !isLoading && (
                          <Check className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
