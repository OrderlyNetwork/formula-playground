import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GitHubImportComponent, LocalUploadComponent } from "./index";

interface LocalFile {
  id: string;
  name: string;
  content: string;
  size: number;
  lastModified: Date;
}

interface SourceManagementComponentProps {
  githubUrls: string;
  setGithubUrls: (urls: string) => void;
  localFiles: LocalFile[];
  setLocalFiles: (files: LocalFile[]) => void;
  isImporting: boolean;
  uploadError: string | null;
  onGitHubImport: () => void;
  onRefreshFromGithub: () => void;
  onLocalUpload: () => void;
}

export function SourceManagementComponent({
  githubUrls,
  setGithubUrls,
  localFiles,
  setLocalFiles,
  isImporting,
  uploadError,
  onGitHubImport,
  onRefreshFromGithub,
  onLocalUpload,
}: SourceManagementComponentProps) {
  return (
    <div className="space-y-3 relative">
      <Tabs defaultValue="github" className="w-full">
        <div>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="github">GitHub Import</TabsTrigger>
            <TabsTrigger value="local">Local Upload</TabsTrigger>
          </TabsList>
        </div>

        <div className="pb-4">
          <TabsContent value="github" className="mt-4">
            <GitHubImportComponent
              githubUrls={githubUrls}
              setGithubUrls={setGithubUrls}
              isImporting={isImporting}
              onGitHubImport={onGitHubImport}
              onRefreshFromGithub={onRefreshFromGithub}
            />
          </TabsContent>

          <TabsContent value="local" className="mt-4">
            <LocalUploadComponent
              files={localFiles}
              isUploading={isImporting}
              onFilesChange={setLocalFiles}
              onUpload={onLocalUpload}
              error={uploadError}
            />
          </TabsContent>
        </div>
      </Tabs>

      <div className="mt-3">
        <p className="text-xs text-gray-400">
          <strong>Note:</strong> Source code is only for display and metadata
          extraction. To configure execution code, please set it in the jsDelivr
          tab
        </p>
      </div>
    </div>
  );
}
