"use client";

interface FileItem {
  path: string;
  description: string;
  mustRead: boolean;
}

interface FileCardProps {
  file: FileItem;
}

export default function FileCard({ file }: FileCardProps) {
  return (
    <div className="p-4 border border-border-subtle rounded bg-surface-white hover:border-outline-variant transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.01)] group">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="material-symbols-outlined text-[#A3ABC4] shrink-0">
            description
          </span>
          <span className="font-mono-code text-mono-code text-on-surface font-medium truncate break-all block" title={file.path}>
            {file.path}
          </span>
        </div>
        {file.mustRead && (
          <span className="bg-primary-container text-on-primary-container border border-[#DEC29A]/30 px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider whitespace-nowrap shrink-0">
            Must Read
          </span>
        )}
      </div>
      <p className="text-text-muted text-xs leading-relaxed pl-8">
        {file.description}
      </p>
    </div>
  );
}
