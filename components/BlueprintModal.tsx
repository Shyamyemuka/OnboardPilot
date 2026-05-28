"use client";

import type { BlueprintJSON } from "@/types";

interface BlueprintModalProps {
  blueprint: BlueprintJSON | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

export default function BlueprintModal({ blueprint, isLoading, error, onClose }: BlueprintModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[88vh] overflow-hidden bg-surface-white border border-border-subtle rounded-xl shadow-2xl flex flex-col">
        <header className="px-5 py-4 border-b border-border-subtle bg-surface-bright flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-text-muted">
              Code Change Blueprint
            </p>
            <h2 className="text-lg font-bold text-on-surface">
              {blueprint?.title || "Generating mock PR..."}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-primary transition-colors cursor-pointer"
            title="Close"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </header>

        <div className="overflow-y-auto p-5">
          {isLoading && (
            <div className="min-h-[360px] flex flex-col items-center justify-center text-center gap-3">
              <span className="material-symbols-outlined text-[36px] text-[#DEC29A] spinner-minimal">
                progress_activity
              </span>
              <p className="text-sm text-text-muted">
                Simulating the first pull request for this starter task...
              </p>
            </div>
          )}

          {error && (
            <div className="border border-error/20 bg-error-container/30 rounded-lg p-4 text-error text-sm">
              {error}
            </div>
          )}

          {blueprint && !isLoading && (
            <div className="space-y-6">
              <p className="text-sm text-on-surface-variant leading-relaxed max-w-3xl">
                {blueprint.summary}
              </p>

              <section>
                <h3 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#A3ABC4]">checklist</span>
                  Edit and Verify Checklist
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {blueprint.checklist.map((item, idx) => (
                    <div
                      key={idx}
                      className="border border-border-subtle bg-surface-bright rounded px-3 py-2 text-xs text-on-surface-variant flex gap-2"
                    >
                      <span className="font-bold text-[#574325]">{idx + 1}.</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#A3ABC4]">difference</span>
                  Mock Pull Request Diff
                </h3>
                {blueprint.changes.map((change, idx) => (
                  <article key={idx} className="border border-border-subtle rounded-lg overflow-hidden bg-surface-white">
                    <div className="px-4 py-3 border-b border-border-subtle bg-surface-bright">
                      <h4 className="font-mono-code text-xs font-bold text-on-surface break-all">
                        {change.path}
                      </h4>
                      <p className="text-xs text-text-muted mt-1">{change.explanation}</p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                      <div className="border-b lg:border-b-0 lg:border-r border-border-subtle">
                        <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-text-muted bg-surface-container-low">
                          Original
                        </div>
                        <pre className="p-3 text-[11px] overflow-auto max-h-[360px] font-mono-code whitespace-pre-wrap">
                          {change.original}
                        </pre>
                      </div>
                      <div>
                        <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-text-muted bg-[#FCDEB5]/30">
                          Proposed
                        </div>
                        <pre className="p-3 text-[11px] overflow-auto max-h-[360px] font-mono-code whitespace-pre-wrap">
                          {change.modified}
                        </pre>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
