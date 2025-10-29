/**
 * Source Loader Service - main thread API to run GitHub fetch+AST parse in a worker
 */

export type GitHubImportResult =
  | { success: true; count: number }
  | { success: false; error: string };

export class SourceLoaderService {
  private worker: Worker | null = null;

  constructor() {
    try {
      this.worker = new Worker(
        new URL("./workers/github-ast-worker.ts", import.meta.url),
        {
          type: "module",
        }
      );
    } catch (error) {
      console.error("Failed to initialize GitHub AST worker:", error);
      this.worker = null;
    }
  }

  async importFromGitHub(urls: string[]): Promise<GitHubImportResult> {
    const worker = this.worker;
    if (!worker) return { success: false, error: "Worker not initialized" };
    return new Promise((resolve) => {
      const handleMessage = (event: MessageEvent<GitHubImportResult>) => {
        worker.removeEventListener("message", handleMessage);
        resolve(event.data);
      };
      worker.addEventListener("message", handleMessage);
      worker.postMessage({ urls });
    });
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export const sourceLoaderService = new SourceLoaderService();
