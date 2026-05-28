import { truncateFile } from "./utils";

export interface PullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export async function getFileTree(owner: string, repo: string): Promise<string[]> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_PAT) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_PAT}`;
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
    { headers, next: { revalidate: 60 } }
  );

  if (!res.ok) {
    if (res.status === 404) throw new Error("REPO_NOT_FOUND");
    if (res.status === 403) throw new Error("RATE_LIMITED");
    throw new Error("GITHUB_ERROR");
  }

  const data = await res.json();
  if (!data.tree || !Array.isArray(data.tree)) {
    throw new Error("GITHUB_ERROR");
  }

  return data.tree
    .filter((item: { type: string }) => item.type === "blob")
    .map((item: { path: string }) => item.path);
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<string> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_PAT) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_PAT}`;
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`,
    { headers, next: { revalidate: 3600 } }
  );

  if (!res.ok) return "";

  const data = await res.json();
  if (!data || data.encoding !== "base64" || typeof data.content !== "string") return "";

  const decoded = Buffer.from(data.content, "base64").toString("utf-8");
  return truncateFile(decoded, 200); // max 200 lines as per hard rules
}

export async function getPullRequestFiles(
  owner: string,
  repo: string,
  prNumber: number
): Promise<PullRequestFile[]> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_PAT) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_PAT}`;
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
    { headers, next: { revalidate: 60 } }
  );

  if (!res.ok) {
    if (res.status === 404) throw new Error("PR_NOT_FOUND");
    if (res.status === 403) throw new Error("RATE_LIMITED");
    throw new Error("GITHUB_ERROR");
  }

  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("GITHUB_ERROR");

  return data.map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch,
  }));
}

export function formatPullRequestDiff(files: PullRequestFile[]): string {
  return files
    .map((file) => {
      const patch = file.patch || "(No text patch available for this file.)";
      return [
        `diff -- ${file.filename}`,
        `status: ${file.status}, +${file.additions}, -${file.deletions}`,
        patch,
      ].join("\n");
    })
    .join("\n\n");
}

export function scoreFile(path: string): number {
  if (/node_modules|\.lock$|dist\/|build\/|\.min\.|__pycache__/.test(path)) return 0;
  if (/README/i.test(path)) return 100;
  if (/^(package\.json|pyproject\.toml|go\.mod|Cargo\.toml)$/.test(path)) return 90;
  if (/\.(config|env)\./.test(path) || path.endsWith(".env")) return 80;
  if (/^(src|lib|core|app)\/[^/]+\.[^/]+$/.test(path)) return 70;
  if (/\/(main|index|app)\.[^/]+$/.test(path)) return 70;
  if (/route|model|schema|service|controller/i.test(path)) return 60;
  if (/test|spec|__test__|\.test\.|\.spec\./.test(path)) return 5;
  return 30;
}

export function selectKeyFiles(paths: string[]): string[] {
  const scored = paths
    .map((path) => ({ path, score: scoreFile(path) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 35) // cap at 35 files as per AGENTS.md
    .map(({ path }) => path);

  return scored;
}
