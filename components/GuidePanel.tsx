"use client";

import { useState } from "react";
import type { GuideJSON } from "@/types";
import DirectoryTree from "./DirectoryTree";
import FileCard from "./FileCard";
import StarterTasks from "./StarterTasks";
import MermaidRenderer from "./MermaidRenderer";

interface GuidePanelProps {
  analysis: GuideJSON;
}

export default function GuidePanel({ analysis }: GuidePanelProps) {
  const [sections, setSections] = useState({
    architecture: true,
    workflow: true,
    directory: true,
    keyFiles: true,
    modules: true,
    tasks: true,
  });

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section className="flex-1 overflow-y-auto pr-2 md:pr-6 py-6 pb-24 h-full">
      <div className="max-w-3xl">
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="bg-secondary-container/20 text-[#0051d5] border border-secondary-container/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
              {analysis.language || "Unknown Language"}
            </span>
            {analysis.framework && analysis.framework !== "None" && (
              <span className="bg-[#FCDEB5]/30 text-[#574325] border border-[#DEC29A]/30 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                {analysis.framework}
              </span>
            )}
          </div>
          <h1 className="text-display-lg-mobile md:text-display-lg font-display-lg mb-2 font-bold tracking-tight text-on-surface">
            {analysis.repoName} Onboarding Guide
          </h1>
          <p className="text-text-muted text-xs font-medium">
            AI-generated developer playbook mapped directly from source code.
          </p>
        </div>

        {/* Section: Architecture Overview */}
        <div className="mb-10 border-b border-surface-variant/40 pb-6">
          <h2
            onClick={() => toggleSection("architecture")}
            className="text-headline-md font-headline-md mb-4 flex items-center gap-2.5 cursor-pointer hover:text-[#DEC29A] transition-colors select-none font-semibold text-on-surface"
          >
            <span className="material-symbols-outlined text-[20px] text-[#A3ABC4]">architecture</span>
            Architecture Overview
            <span className="material-symbols-outlined text-[18px] ml-auto text-text-muted">
              {sections.architecture ? "expand_less" : "expand_more"}
            </span>
          </h2>
          {sections.architecture && (
            <div className="text-on-surface-variant text-sm space-y-4 leading-relaxed pl-1 transition-all">
              <p>{analysis.architectureSummary || "No architecture summary available."}</p>
            </div>
          )}
        </div>

        {/* Section: Visual Workflow */}
        {analysis.mermaidFlowchart && (
          <div className="mb-10 border-b border-surface-variant/40 pb-6">
            <h2
              onClick={() => toggleSection("workflow")}
              className="text-headline-md font-headline-md mb-4 flex items-center gap-2.5 cursor-pointer hover:text-[#DEC29A] transition-colors select-none font-semibold text-on-surface"
            >
              <span className="material-symbols-outlined text-[20px] text-[#A3ABC4]">insights</span>
              Visual Workflow
              <span className="material-symbols-outlined text-[18px] ml-auto text-text-muted">
                {sections.workflow ? "expand_less" : "expand_more"}
              </span>
            </h2>
            {sections.workflow && (
              <div className="transition-all pl-1">
                <MermaidRenderer chart={analysis.mermaidFlowchart} />
              </div>
            )}
          </div>
        )}

        {/* Section: Directory Breakdown */}
        <div className="mb-10 border-b border-surface-variant/40 pb-6">
          <h2
            onClick={() => toggleSection("directory")}
            className="text-headline-md font-headline-md mb-4 flex items-center gap-2.5 cursor-pointer hover:text-[#DEC29A] transition-colors select-none font-semibold text-on-surface"
          >
            <span className="material-symbols-outlined text-[20px] text-[#A3ABC4]">folder_open</span>
            Directory Breakdown
            <span className="material-symbols-outlined text-[18px] ml-auto text-text-muted">
              {sections.directory ? "expand_less" : "expand_more"}
            </span>
          </h2>
          {sections.directory && (
            <div className="transition-all">
              <DirectoryTree breakdown={analysis.directoryBreakdown} />
            </div>
          )}
        </div>

        {/* Section: Key Files */}
        <div className="mb-10 border-b border-surface-variant/40 pb-6">
          <h2
            onClick={() => toggleSection("keyFiles")}
            className="text-headline-md font-headline-md mb-4 flex items-center gap-2.5 cursor-pointer hover:text-[#DEC29A] transition-colors select-none font-semibold text-on-surface"
          >
            <span className="material-symbols-outlined text-[20px] text-[#A3ABC4]">file_present</span>
            Key Files to Read
            <span className="material-symbols-outlined text-[18px] ml-auto text-text-muted">
              {sections.keyFiles ? "expand_less" : "expand_more"}
            </span>
          </h2>
          {sections.keyFiles && (
            <div className="space-y-3 transition-all">
              {analysis.keyFiles && analysis.keyFiles.length > 0 ? (
                analysis.keyFiles.map((file, idx) => (
                  <FileCard key={idx} file={file} />
                ))
              ) : (
                <p className="text-text-muted text-sm italic">No annotated key files documented.</p>
              )}
            </div>
          )}
        </div>

        {/* Section: Core Modules */}
        <div className="mb-10 border-b border-surface-variant/40 pb-6">
          <h2
            onClick={() => toggleSection("modules")}
            className="text-headline-md font-headline-md mb-4 flex items-center gap-2.5 cursor-pointer hover:text-[#DEC29A] transition-colors select-none font-semibold text-on-surface"
          >
            <span className="material-symbols-outlined text-[20px] text-[#A3ABC4]">deployed_code</span>
            Core Modules
            <span className="material-symbols-outlined text-[18px] ml-auto text-text-muted">
              {sections.modules ? "expand_less" : "expand_more"}
            </span>
          </h2>
          {sections.modules && (
            <div className="space-y-4 transition-all pl-1">
              {analysis.coreModules && analysis.coreModules.length > 0 ? (
                analysis.coreModules.map((mod, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-border-subtle bg-surface-bright rounded-lg shadow-sm"
                  >
                    <h3 className="font-semibold text-body-md text-on-surface mb-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                      {mod.name}
                    </h3>
                    <p className="text-text-muted text-xs leading-relaxed mb-3">
                      {mod.description}
                    </p>
                    {mod.files && mod.files.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase">Files:</span>
                        {mod.files.map((file, fileIdx) => (
                          <span
                            key={fileIdx}
                            className="font-mono-code text-[10px] bg-surface-white border border-border-subtle px-1.5 py-0.5 rounded text-on-surface-variant max-w-[150px] truncate"
                            title={file}
                          >
                            {file.split("/").pop()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-text-muted text-sm italic">No primary modules identified.</p>
              )}
            </div>
          )}
        </div>

        {/* Section: Starter Tasks */}
        <div className="mb-10">
          <h2
            onClick={() => toggleSection("tasks")}
            className="text-headline-md font-headline-md mb-4 flex items-center gap-2.5 cursor-pointer hover:text-[#DEC29A] transition-colors select-none font-semibold text-on-surface"
          >
            <span className="material-symbols-outlined text-[20px] text-[#A3ABC4]">task_alt</span>
            Starter Tasks
            <span className="material-symbols-outlined text-[18px] ml-auto text-text-muted">
              {sections.tasks ? "expand_less" : "expand_more"}
            </span>
          </h2>
          {sections.tasks && (
            <div className="transition-all">
              <StarterTasks tasks={analysis.starterTasks} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
