import { Button } from "@/components/common/Button";
import { RefreshCw, Plus } from "lucide-react";

interface GitHubImportComponentProps {
  githubUrls: string;
  setGithubUrls: (urls: string) => void;
  isImporting: boolean;
  onGitHubImport: () => void;
  onRefreshFromGithub: () => void;
}

export function GitHubImportComponent({
  githubUrls,
  setGithubUrls,
  isImporting,
  onGitHubImport,
  onRefreshFromGithub,
}: GitHubImportComponentProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold mb-1.5">Import from GitHub</h3>
        <p className="text-xs text-gray-600 mb-3">
          Import formula source code from GitHub. Supports raw/blob/tree links,
          one per line
        </p>

        <textarea
          className="w-full h-28 p-2.5 border border-gray-300 rounded-md resize-none font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://github.com/user/repo/blob/main/file.ts&#10;https://raw.githubusercontent.com/user/repo/main/file.ts"
          value={githubUrls}
          onChange={(e) => setGithubUrls(e.target.value)}
        />
        <div className="flex justify-between mt-3">
          <Button
            variant="outline"
            onClick={onRefreshFromGithub}
            disabled={isImporting}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Update Existing Source Code
          </Button>
          <Button
            onClick={onGitHubImport}
            disabled={isImporting || !githubUrls.trim()}
          >
            <Plus className="w-4 h-4 mr-2" />
            {isImporting ? "Importing..." : "Import"}
          </Button>
        </div>
      </div>
    </div>
  );
}
