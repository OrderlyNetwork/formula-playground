import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import type { FormulaDefinition } from "@/types/formula";
import { CacheManager } from "@/modules/formula-executor/cache-manager";
import { TypeScriptRuntimeSandbox } from "@/modules/formula-executor/runtime-sandbox";

interface JsDelivrConfigComponentProps {
  formulas: FormulaDefinition[];
  initialPackageName?: string;
  initialVersion?: string;
  onSaveGlobal: (config: {
    url: string;
    version: string;
  }) => Promise<void> | void;
}

export function JsDelivrConfigComponent({
  formulas,
  initialPackageName,
  initialVersion,
  onSaveGlobal,
}: JsDelivrConfigComponentProps) {
  const [packageName, setPackageName] = useState<string>(
    initialPackageName || "@orderly.network/perp"
  );
  const [version, setVersion] = useState<string>(initialVersion || "latest");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initialize sandbox once per component lifecycle
  const sandboxRef = useRef<TypeScriptRuntimeSandbox | null>(null);
  if (!sandboxRef.current) {
    sandboxRef.current = new TypeScriptRuntimeSandbox(new CacheManager());
  }

  // Sync with initial props (global mode)
  useEffect(() => {
    if (initialPackageName) setPackageName(initialPackageName);
  }, [initialPackageName]);
  useEffect(() => {
    if (initialVersion) setVersion(initialVersion);
  }, [initialVersion]);

  // Build jsDelivr URL from package + version
  const buildNpmUrl = (pkg: string, ver: string) =>
    `https://cdn.jsdelivr.net/npm/${pkg}@${ver}/dist/index.js`;

  const handleSave = async () => {
    if (isLoading) return;
    const ver = version?.trim() || "latest";
    const pkg = packageName.trim() || "@orderly.network/perp";
    const url = buildNpmUrl(pkg, ver);

    setIsLoading(true);
    try {
      // Fetch the code from jsDelivr and store it in IndexedDB for later use
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch from jsDelivr: ${response.status} ${response.statusText}`
        );
      }
      const code = await response.text();

      // Store the fetched code in IndexedDB using shared storage strategy
      if (formulas.length > 0) {
        const cacheManager = new CacheManager();

        // Create shared code entry keyed by URL+version
        const urlHash = btoa(url)
          .slice(0, 16)
          .replace(/[+/=]/g, "")
          .slice(0, 12);
        const sharedCodeId = `shared:${urlHash}:${ver}`;
        const sharedCodeEntry = {
          id: sharedCodeId,
          url: url,
          version: ver,
          code: code,
          timestamp: Date.now(),
          hash: await simpleHash(code),
        };

        try {
          // Store the shared code first
          await cacheManager.saveSharedCode(sharedCodeEntry);

          // Create formula references to the shared code
          await Promise.all(
            formulas.map(async (formula) => {
              const formulaReference = {
                id: `${formula.id}:${ver}`,
                formulaId: formula.id,
                version: ver,
                jsdelivrUrl: url,
                functionName: formula.jsdelivrInfo?.functionName || formula.id,
                sharedCodeId: sharedCodeId, // Reference to shared code
                timestamp: Date.now(),
              };

              try {
                await cacheManager.saveFormulaReference(formulaReference);
              } catch (error) {
                console.warn(
                  `Failed to save formula reference ${formula.id}:`,
                  error
                );
              }
            })
          );
        } catch (error) {
          console.warn(`Failed to save shared code to cache:`, error);
        }
      }

      await onSaveGlobal({ url, version: ver });
    } catch (error) {
      alert(
        `Failed to load or save: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Simple hash function for integrity checking
  const simpleHash = async (str: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold mb-2">
          jsDelivr Execution Configuration
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Configure global jsDelivr CDN execution script. All formulas share the
          same script
        </p>
      </div>

      <div className="space-y-3">
        <div className="p-3 bg-white border border-gray-200 rounded-md">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Package name, e.g. @orderly.network/perp"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                disabled={isLoading}
                className="text-xs flex-1 w-64"
              />
              <Input
                placeholder="Version, e.g. 4.8.1 or latest"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                disabled={isLoading}
                className="text-xs w-28"
              />
            </div>
            <div className="text-xs text-gray-500 truncate">
              Will load:
              {buildNpmUrl(
                packageName.trim() || "@orderly.network/perp",
                (version || "latest").trim() || "latest"
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isLoading || formulas.length === 0}
          >
            Fetch Code and Save
          </Button>
        </div>
      </div>
    </div>
  );
}
