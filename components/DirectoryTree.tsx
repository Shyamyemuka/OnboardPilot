"use client";

interface DirectoryItem {
  path: string;
  role: string;
  important: boolean;
}

interface DirectoryTreeProps {
  breakdown: DirectoryItem[];
}

export default function DirectoryTree({ breakdown }: DirectoryTreeProps) {
  if (!breakdown || breakdown.length === 0) {
    return <p className="text-text-muted text-sm italic">No directory breakdown available.</p>;
  }

  return (
    <div className="bg-surface-white border border-border-subtle rounded-lg p-4 font-mono-code text-mono-code text-on-surface-variant overflow-x-auto shadow-sm">
      <div className="min-w-[320px] space-y-1">
        {breakdown.map((item, idx) => {
          // Normalize trailing slash and compute depth
          const normalizedPath = item.path.replace(/^\.\//, "");
          const isDir = normalizedPath.endsWith("/") || item.path.includes("/") && !normalizedPath.split("/").pop()?.includes(".");
          const parts = normalizedPath.split("/").filter(Boolean);
          const name = parts.length > 0 ? parts[parts.length - 1] + (isDir ? "/" : "") : normalizedPath;
          const depth = Math.max(0, parts.length - (isDir ? 1 : 1));

          // Set margins dynamically
          const indentClass = depth === 1 ? "pl-4" : depth === 2 ? "pl-8" : depth >= 3 ? "pl-12" : "";

          return (
            <div
              key={idx}
              className={`flex items-start md:items-center gap-2 py-1.5 hover:bg-surface-container-low/40 rounded px-2 transition-colors ${indentClass}`}
            >
              <span className="material-symbols-outlined text-[16px] text-[#A3ABC4] shrink-0 mt-0.5 md:mt-0">
                {isDir ? "folder" : "description"}
              </span>
              <span className="font-medium text-on-surface shrink-0">{name}</span>
              {item.role && (
                <span className="text-text-muted text-[11px] ml-2 break-all line-clamp-1">
                  — {item.role}
                </span>
              )}
              {item.important && (
                <span className="bg-[#DEC29A]/15 text-[#574325] text-[9px] px-1.5 py-0.5 rounded font-sans uppercase font-bold tracking-wider shrink-0 ml-auto md:ml-2">
                  Key
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
