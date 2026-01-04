"use client";

import { useEffect, useState } from "react";
import {
  Sigma,
  Play,
  Package,
  GitBranch,
  Code,
  Check,
  Loader2,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import type { VersionConfig } from "@/types/version";
import { loadAndInjectLocalCode } from "@/services/localCodeLoader";
import { cn } from "@/lib/utils";

/**
 * Get icon for version type
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
 * Get badge color for version type
 */
function getVersionTypeBadgeColor(type: VersionConfig["type"]) {
  switch (type) {
    case "release":
      return "bg-green-100 text-green-800";
    case "dev":
      return "bg-yellow-100 text-yellow-800";
    case "local":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function EmptyState() {
  const {
    versionConfigs,
    currentVersionConfig,
    isLoadingVersionConfigs,
    loadVersionConfigs,
    setCurrentVersion,
  } = useAppStore();

  const [loadingVersion, setLoadingVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load version configs on mount
  useEffect(() => {
    if (!versionConfigs && !isLoadingVersionConfigs) {
      loadVersionConfigs();
    }
  }, [versionConfigs, isLoadingVersionConfigs, loadVersionConfigs]);

  /**
   * Handle version selection
   */
  const handleSelectVersion = async (version: VersionConfig) => {
    if (version.id === currentVersionConfig?.id) {
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

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="space-y-8 max-w-3xl w-full">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="relative inline-flex items-center justify-center mx-auto">
            <Sigma className="h-16 w-16 text-purple-600" strokeWidth={2.5} />
            <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md ring-2 ring-purple-100">
              <Play className="h-5 w-5 text-purple-500 fill-purple-500" />
            </div>
          </div>
          <h2 className="text-2xl font-mono text-zinc-900">
            Formula Playground
          </h2>
          <p className="text-sm text-zinc-500">
            Select a formula library version to start testing
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Version list */}
        <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
          {isLoadingVersionConfigs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">
                Loading versions...
              </span>
            </div>
          ) : versionConfigs?.versions.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No versions available
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {versionConfigs?.versions.map((version) => {
                const isCurrent = version.id === currentVersionConfig?.id;
                const isLoading = loadingVersion === version.id;

                return (
                  <button
                    key={version.id}
                    onClick={() => handleSelectVersion(version)}
                    disabled={isLoading}
                    className={cn(
                      "w-full text-left px-6 py-4 transition-colors",
                      "hover:bg-zinc-50 focus:outline-none focus:bg-zinc-50",
                      isCurrent && "bg-blue-50 hover:bg-blue-50",
                      isLoading && "opacity-60 cursor-wait"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex-shrink-0",
                          isCurrent ? "text-blue-600" : "text-gray-400"
                        )}
                      >
                        {getVersionTypeIcon(version.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3
                            className={cn(
                              "font-medium text-sm",
                              isCurrent ? "text-blue-900" : "text-zinc-900"
                            )}
                          >
                            {version.name}
                          </h3>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                              getVersionTypeBadgeColor(version.type)
                            )}
                          >
                            <span className="capitalize">{version.type}</span>
                          </span>
                        </div>
                        {version.description && (
                          <p className="text-xs text-gray-500 leading-relaxed">
                            {version.description}
                          </p>
                        )}
                      </div>

                      {/* Status indicator */}
                      <div className="flex-shrink-0 w-5">
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

        {/* Footer hint */}
        <p className="text-xs text-center text-zinc-500">
          Switch between different SDK versions to test formula compatibility
        </p>
      </div>
    </div>
  );
}

export function DatabaseDashboard() {
  return <EmptyState />;
}
