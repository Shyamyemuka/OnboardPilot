import type { ImportGraphNode } from "@/types";

export function parseGitHubUrl(url: string): { owner: string; repo: string; prNumber?: number } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const prIndex = parts.indexOf("pull");
    const prNumber =
      prIndex !== -1 && parts[prIndex + 1] && /^\d+$/.test(parts[prIndex + 1])
        ? Number(parts[prIndex + 1])
        : undefined;

    return { owner: parts[0], repo: parts[1].replace(".git", ""), prNumber };
  } catch {
    return null;
  }
}

export function parseCodexJSON<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Second attempt: find the first { and last } and extract
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        throw new Error("Failed to parse Codex JSON response");
      }
    }
    throw new Error("Failed to parse Codex JSON response");
  }
}

export function truncateFile(content: string, maxLines: number): string {
  const lines = content.split("\n");
  if (lines.length <= maxLines) return content;
  return lines.slice(0, maxLines).join("\n") + `\n... (truncated at ${maxLines} lines)`;
}

export function generateSessionId(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function resolveRelativeImport(fromPath: string, importPath: string, allPaths: string[]): string | null {
  if (!importPath.startsWith(".")) return importPath;

  const fromParts = fromPath.split("/");
  fromParts.pop();

  for (const part of importPath.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      fromParts.pop();
    } else {
      fromParts.push(part);
    }
  }

  const base = fromParts.join("/");
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.py`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.jsx`,
  ];

  return candidates.find((candidate) => allPaths.includes(candidate)) || base;
}

export function extractImportGraph(files: Record<string, string>): ImportGraphNode[] {
  const allPaths = Object.keys(files);

  return allPaths
    .filter((path) => /\.(ts|tsx|js|jsx|mjs|cjs|py)$/.test(path))
    .map((path) => {
      const content = files[path] || "";
      const imports = new Set<string>();
      const patterns = [
        /import\s+(?:[^'"]+\s+from\s+)?["']([^"']+)["']/g,
        /export\s+[^'"]+\s+from\s+["']([^"']+)["']/g,
        /require\(["']([^"']+)["']\)/g,
        /^\s*from\s+([a-zA-Z0-9_./]+)\s+import\s+/gm,
        /^\s*import\s+([a-zA-Z0-9_./]+)/gm,
      ];

      for (const pattern of patterns) {
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(content)) !== null) {
          const resolved = resolveRelativeImport(path, match[1], allPaths);
          if (resolved) imports.add(resolved);
        }
      }

      return { path, imports: Array.from(imports).slice(0, 12) };
    })
    .filter((node) => node.imports.length > 0)
    .slice(0, 35);
}
