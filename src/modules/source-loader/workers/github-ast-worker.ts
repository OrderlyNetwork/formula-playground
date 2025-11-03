/**
 * Web Worker: Fetch GitHub sources and parse into FormulaDefinition, then persist to IndexedDB
 */

import { FormulaParser } from "../../formula-parser";
import type { FormulaDefinition } from "../../../types/formula";
import { db } from "../../../lib/dexie";

interface LocalFileData {
  id: string;
  name: string;
  content: string;
  size: number;
  lastModified: Date;
}

type WorkerRequest =
  | {
      type: "github";
      urls: string[];
    }
  | {
      type: "local";
      sources: Array<{ path: string; content: string }>;
      fileData: LocalFileData[];
    };

type WorkerResponse =
  | {
      success: true;
      count: number;
    }
  | {
      success: false;
      error: string;
    };

// Note: In Web Worker context, each Worker has its own isolated execution context.
// Creating a new instance here is acceptable since Workers don't share state with the main thread.
// Using Factory here would create a separate singleton per Worker, which may not be desired.
const parser = new FormulaParser();

// Utilities
function toRawUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "raw.githubusercontent.com") return url;
    if (u.hostname === "github.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      // github.com/{owner}/{repo}/blob/{ref}/...path
      const blobIdx = parts.indexOf("blob");
      if (blobIdx !== -1 && parts.length >= blobIdx + 2) {
        const owner = parts[0];
        const repo = parts[1];
        const ref = parts[blobIdx + 1];
        const path = parts.slice(blobIdx + 2).join("/");
        return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
      }
    }
  } catch {
    // ignore invalid URL
  }
  return null;
}

function parseRepoRefAndPath(
  url: string
): { owner: string; repo: string; ref: string; dir?: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1];
    const treeIdx = parts.indexOf("tree");
    if (treeIdx !== -1 && parts.length >= treeIdx + 2) {
      const ref = parts[treeIdx + 1];
      const dir = parts.slice(treeIdx + 2).join("/") || undefined;
      return { owner, repo, ref, dir };
    }
    // default branch guess
    return { owner, repo, ref: "main" };
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
  return await res.text();
}

async function listRepoFiles(
  owner: string,
  repo: string,
  ref: string
): Promise<string[]> {
  // get commit for ref to obtain tree sha
  const commitRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${ref}`,
    {
      headers: { Accept: "application/vnd.github+json" },
    }
  );
  if (!commitRes.ok)
    throw new Error(`Failed to resolve ref ${ref} for ${owner}/${repo}`);
  const commit = await commitRes.json();
  const treeSha = commit?.commit?.tree?.sha;
  if (!treeSha) throw new Error("Tree sha missing");
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
    {
      headers: { Accept: "application/vnd.github+json" },
    }
  );
  if (!treeRes.ok) throw new Error("Failed to list repo tree");
  const tree = await treeRes.json();
  const nodes = (tree?.tree as Array<{ path: string; type: string }>) || [];
  const files: string[] = nodes
    .filter((n) => n.type === "blob" && /\.(ts|tsx|js|jsx)$/.test(n.path))
    .map((n) => n.path);
  return files;
}

async function collectSourcesFromUrls(
  urls: string[]
): Promise<Array<{ path: string; content: string }>> {
  const collected: Array<{ path: string; content: string }> = [];
  for (const url of urls) {
    // File URL cases
    const raw = toRawUrl(url);
    if (raw) {
      const content = await fetchText(raw);
      const path = raw.split("/").slice(4).join("/") || "remote.ts"; // owner/repo/ref/path
      collected.push({ path, content });
      continue;
    }

    // Repo URL case
    const repoInfo = parseRepoRefAndPath(url);
    if (repoInfo) {
      const { owner, repo, ref, dir } = repoInfo;
      const files = await listRepoFiles(owner, repo, ref);
      const filtered = dir
        ? files.filter((p) => p.startsWith(dir + "/"))
        : files;
      // Limit to avoid excessive downloads
      const limited = filtered.slice(0, 100);
      for (const p of limited) {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${p}`;
        const content = await fetchText(rawUrl);
        collected.push({ path: `${owner}/${repo}/${p}`, content });
      }
      continue;
    }
  }
  return collected;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    const requestData = event.data;

    if (requestData.type === "github") {
      const { urls } = requestData;
      if (!urls || urls.length === 0) {
        const resp: WorkerResponse = {
          success: false,
          error: "No URLs provided",
        };
        self.postMessage(resp);
        return;
      }

      const sources = await collectSourcesFromUrls(urls);
      const formulas: FormulaDefinition[] = await parser.parseFormulasFromText(
        sources
      );

      // Mark all imported formulas with creationType "imported"
      const markedFormulas = formulas.map((formula) => ({
        ...formula,
        creationType: "imported" as const,
      }));

      // Persist to IndexedDB
      await db.transaction("rw", db.formulas, async () => {
        await db.formulas.clear();
        if (markedFormulas.length > 0) {
          await db.formulas.bulkPut(markedFormulas);
        }
      });

      const resp: WorkerResponse = { success: true, count: formulas.length };
      self.postMessage(resp);
    } else if (requestData.type === "local") {
      const { sources, fileData } = requestData;
      if (!sources || sources.length === 0) {
        const resp: WorkerResponse = {
          success: false,
          error: "No files provided",
        };
        self.postMessage(resp);
        return;
      }

      const formulas: FormulaDefinition[] = await parser.parseFormulasFromText(sources);

      // Create a map of file name to file data for quick lookup
      const fileDataMap = new Map(fileData.map(file => [file.name, file]));

      // Mark all uploaded formulas with creationType "uploaded" and add local info
      const markedFormulas = formulas.map((formula) => {
        // Find the source file that contains this formula
        const sourceFile = sources.find(source =>
          source.content.includes(formula.id) ||
          (formula.sourceCode && source.content.includes(formula.sourceCode.substring(0, 50)))
        );

        const fileInfo = sourceFile ? fileDataMap.get(sourceFile.path) : null;

        return {
          ...formula,
          creationType: "uploaded" as const,
          localInfo: fileInfo ? {
            fileName: fileInfo.name,
            fileSize: fileInfo.size,
            lastModified: fileInfo.lastModified,
            uploadTimestamp: new Date(),
          } : undefined,
        };
      });

      // Persist to IndexedDB (append instead of replace for local uploads)
      await db.transaction("rw", db.formulas, async () => {
        if (markedFormulas.length > 0) {
          await db.formulas.bulkPut(markedFormulas);
        }
      });

      const resp: WorkerResponse = { success: true, count: formulas.length };
      self.postMessage(resp);
    }
  } catch (e) {
    const resp: WorkerResponse = {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
    self.postMessage(resp);
  }
};
