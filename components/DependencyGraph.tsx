"use client";

import { useMemo, useState } from "react";
import type { ImportGraphNode } from "@/types";

interface DependencyGraphProps {
  graph: ImportGraphNode[];
}

export default function DependencyGraph({ graph }: DependencyGraphProps) {
  const [selectedPath, setSelectedPath] = useState(graph[0]?.path || "");

  const selectedNode = graph.find((node) => node.path === selectedPath) || graph[0];

  const importedBy = useMemo(() => {
    if (!selectedNode) return [];
    return graph
      .filter((node) => node.imports.includes(selectedNode.path))
      .map((node) => node.path);
  }, [graph, selectedNode]);

  if (!graph || graph.length === 0) {
    return (
      <p className="text-text-muted text-sm italic">
        No source imports were detected in the selected key files.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
      <div className="border border-border-subtle bg-surface-white rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-border-subtle text-[10px] uppercase tracking-wider font-bold text-text-muted bg-surface-bright">
          File Nodes
        </div>
        <div className="max-h-[320px] overflow-y-auto p-2 space-y-1">
          {graph.map((node) => {
            const isSelected = node.path === selectedNode?.path;
            return (
              <button
                key={node.path}
                onClick={() => setSelectedPath(node.path)}
                className={`w-full text-left px-2 py-2 rounded text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[#FCDEB5]/40 text-[#271901] font-semibold"
                    : "hover:bg-surface-container-low text-on-surface-variant"
                }`}
                title={node.path}
              >
                <span className="font-mono-code block truncate">{node.path}</span>
                <span className="text-[10px] text-text-muted">{node.imports.length} imports</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border border-border-subtle bg-surface-white rounded-lg p-4 min-h-[320px]">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-mono-code text-sm font-bold text-on-surface break-all">
              {selectedNode?.path}
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Click another file to trace direct imports and reverse dependencies.
            </p>
          </div>
          <span className="material-symbols-outlined text-[#A3ABC4]">account_tree</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-[10px] uppercase tracking-wider font-bold text-text-muted mb-2">
              Imports
            </h4>
            <div className="space-y-2">
              {selectedNode?.imports.map((target) => (
                <button
                  key={target}
                  onClick={() => graph.some((node) => node.path === target) && setSelectedPath(target)}
                  className="w-full text-left border border-border-subtle rounded px-3 py-2 text-xs bg-surface-bright hover:border-[#A3ABC4] transition-colors cursor-pointer"
                  title={target}
                >
                  <span className="font-mono-code break-all">{target}</span>
                </button>
              ))}
              {selectedNode?.imports.length === 0 && (
                <p className="text-xs text-text-muted italic">No direct imports detected.</p>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-wider font-bold text-text-muted mb-2">
              Imported By
            </h4>
            <div className="space-y-2">
              {importedBy.map((source) => (
                <button
                  key={source}
                  onClick={() => setSelectedPath(source)}
                  className="w-full text-left border border-border-subtle rounded px-3 py-2 text-xs bg-surface-bright hover:border-[#A3ABC4] transition-colors cursor-pointer"
                  title={source}
                >
                  <span className="font-mono-code break-all">{source}</span>
                </button>
              ))}
              {importedBy.length === 0 && (
                <p className="text-xs text-text-muted italic">No selected key file imports this node.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
