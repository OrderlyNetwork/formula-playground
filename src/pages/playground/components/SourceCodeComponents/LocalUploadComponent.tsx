import { useState, useRef } from "react";
import { Button } from "@/components/common/Button";
import { Upload, File, X, AlertCircle } from "lucide-react";

interface LocalFile {
  id: string;
  name: string;
  content: string;
  size: number;
  lastModified: Date;
}

interface LocalUploadComponentProps {
  files: LocalFile[];
  isUploading: boolean;
  onFilesChange: (files: LocalFile[]) => void;
  onUpload: () => void;
  error?: string | null;
}

export function LocalUploadComponent({
  files,
  isUploading,
  onFilesChange,
  onUpload,
  error,
}: LocalUploadComponentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Valid TypeScript file extensions
  const validExtensions = [".ts", ".tsx"];
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  const maxFiles = 20;

  /**
   * Validate if file is a TypeScript file
   */
  const isValidTypeScriptFile = (file: File): boolean => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    return validExtensions.includes(extension);
  };

  /**
   * Read file content as text
   */
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () =>
        reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsText(file);
    });
  };

  /**
   * Process selected files
   */
  const processFiles = async (fileList: FileList) => {
    const newFiles: LocalFile[] = [];
    const errors: string[] = [];

    // Check file count limit
    if (files.length + fileList.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
      return;
    }

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      // Validate file type
      if (!isValidTypeScriptFile(file)) {
        errors.push(
          `${file.name}: Unsupported file type. Please upload .ts or .tsx files`
        );
        continue;
      }

      // Validate file size
      if (file.size > maxFileSize) {
        errors.push(`${file.name}: File size exceeds 10MB limit`);
        continue;
      }

      try {
        const content = await readFileContent(file);
        const localFile: LocalFile = {
          id: `${file.name}-${file.lastModified}-${file.size}`,
          name: file.name,
          content,
          size: file.size,
          lastModified: new Date(file.lastModified),
        };
        newFiles.push(localFile);
      } catch {
        errors.push(`${file.name}: Failed to read file`);
      }
    }

    if (errors.length > 0) {
      alert(errors.join("\n"));
    }

    if (newFiles.length > 0) {
      onFilesChange([...files, ...newFiles]);
    }
  };

  /**
   * Handle file selection from input
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      processFiles(selectedFiles);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Handle drag and drop events
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles) {
      processFiles(droppedFiles);
    }
  };

  /**
   * Remove a file from the list
   */
  const removeFile = (fileId: string) => {
    onFilesChange(files.filter((f) => f.id !== fileId));
  };

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold mb-1.5">Local Upload</h3>
        <p className="text-xs text-gray-600 mb-3">
          Upload local TypeScript files. Supports .ts and .tsx formats, up to{" "}
          {maxFiles} files
        </p>
        {/* <div className="bg-green-50 border border-green-200 rounded-md p-2.5 mb-3">
          <p className="text-xs text-green-800">
            <strong>Tip:</strong> Uploaded files will be parsed and formula definitions extracted. Supports metadata extraction from JSDoc annotations
          </p>
        </div> */}

        {/* Upload Area */}
        <div
          className={`
            border-2 border-dashed rounded-md p-6 text-center transition-colors
            ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400 bg-gray-50"
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-gray-600 mb-2">
            Drag TypeScript files here, or click to select files
          </p>
          <p className="text-xs text-gray-500 mb-3">
            Supports .ts, .tsx formats, max 10MB per file
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".ts,.tsx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <File className="w-4 h-4 mr-2" />
            Select Files
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-start">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">
              Selected Files ({files.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-md"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <File className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)} •{" "}
                        {file.lastModified.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    disabled={isUploading}
                    className="ml-2 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Upload Button */}
            <div className="flex justify-end mt-3">
              <Button
                onClick={onUpload}
                disabled={isUploading || files.length === 0}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? "Uploading and parsing..." : "Upload and Parse"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
