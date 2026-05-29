"use client";

import { useEffect, useState } from "react";
import type { GuideJSON } from "@/types";
import DirectoryTree from "./DirectoryTree";
import FileCard from "./FileCard";
import StarterTasks from "./StarterTasks";
import MermaidRenderer from "./MermaidRenderer";
import DependencyGraph from "./DependencyGraph";
import BlueprintModal from "./BlueprintModal";
import type { BlueprintJSON, ImportGraphNode } from "@/types";
import { getFileContent } from "@/lib/github";
import { extractImportGraph } from "@/lib/utils";

interface GuidePanelProps {
  analysis: GuideJSON;
  sessionId?: string;
  fileContext?: Record<string, string>;
  importGraph?: ImportGraphNode[];
  repoInfo?: { owner: string; repo: string };
  initialThemeData?: any;
}

export default function GuidePanel({
  analysis,
  sessionId,
  fileContext = {},
  importGraph = [],
  repoInfo,
  initialThemeData,
}: GuidePanelProps) {
  const [sections, setSections] = useState({
    architecture: true,
    workflow: true,
    dependencies: true,
    popCulture: false,
    directory: true,
    keyFiles: true,
    modules: true,
    tasks: true,
  });
  const [blueprint, setBlueprint] = useState<BlueprintJSON | null>(null);
  const [isBlueprintLoading, setIsBlueprintLoading] = useState(false);
  const [blueprintError, setBlueprintError] = useState<string | null>(null);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState(false);
  const [blueprintCache, setBlueprintCache] = useState<Record<string, BlueprintJSON>>({});

  const [themeInput, setThemeInput] = useState("");
  const [isThemeLoading, setIsThemeLoading] = useState(false);
  const [themeData, setThemeData] = useState<any>(null);
  const [themeError, setThemeError] = useState<string | null>(null);

  const [activeAnalysis, setActiveAnalysis] = useState<GuideJSON>(analysis);
  const [activeImportGraph, setActiveImportGraph] = useState<ImportGraphNode[]>(importGraph);
  const [regeneratingSections, setRegeneratingSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setActiveAnalysis(analysis);
  }, [analysis]);

  useEffect(() => {
    setActiveImportGraph(importGraph);
  }, [importGraph]);

  const handleRegenerateSection = async (section: "architecture" | "workflow" | "directory" | "keyFiles" | "modules" | "tasks") => {
    setRegeneratingSections((prev) => ({ ...prev, [section]: true }));

    try {
      const response = await fetch("/api/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          repoName: activeAnalysis.repoName,
          analysisJSON: JSON.stringify(activeAnalysis),
          sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Regeneration for ${section} failed.`);
      }

      const data = await response.json();
      const updated = { ...activeAnalysis };

      if (section === "architecture") {
        updated.architectureSummary = data.architectureSummary;
      } else if (section === "workflow") {
        updated.mermaidFlowchart = data.mermaidFlowchart;
      } else if (section === "directory") {
        updated.directoryBreakdown = data.directoryBreakdown;
      } else if (section === "keyFiles") {
        updated.keyFiles = data.keyFiles;
      } else if (section === "modules") {
        updated.coreModules = data.coreModules;
      } else if (section === "tasks") {
        updated.starterTasks = data.starterTasks;
      }

      setActiveAnalysis(updated);

      if (sessionId) {
        sessionStorage.setItem(`onboardpilot_analysis_${sessionId}`, JSON.stringify(updated));
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || `Could not regenerate ${section}.`);
    } finally {
      setRegeneratingSections((prev) => ({ ...prev, [section]: false }));
    }
  };

  const handleRefreshDependencyGraph = () => {
    setRegeneratingSections((prev) => ({ ...prev, dependencies: true }));
    setTimeout(() => {
      try {
        const refreshedGraph = extractImportGraph(fileContext);
        setActiveImportGraph(refreshedGraph);
        if (sessionId) {
          sessionStorage.setItem(`onboardpilot_graph_${sessionId}`, JSON.stringify(refreshedGraph));
        }
      } catch (err) {
        console.error("Failed to refresh dependency graph:", err);
      } finally {
        setRegeneratingSections((prev) => ({ ...prev, dependencies: false }));
      }
    }, 500);
  };

  useEffect(() => {
    if (initialThemeData) {
      setThemeData(initialThemeData);
      setThemeInput(initialThemeData.themeName || "");
    }
  }, [initialThemeData]);

  const getLoaderMessage = (theme: string) => {
    const t = theme.toLowerCase();
    if (t.includes("stranger things")) return "Entering the Upside Down...";
    if (t.includes("harry potter")) return "Consulting the Sorting Hat...";
    if (t.includes("star wars")) return "Exploring a galaxy far, far away...";
    if (t.includes("matrix")) return "Connecting to the Matrix...";
    if (t.includes("lord of the rings") || t.includes("lotr")) return "Forging the One Ring...";
    if (t.includes("marvel") || t.includes("avengers")) return "Assembling the Avengers...";
    return `Preparing the ${theme} universe...`;
  };

  const handleGenerateTheme = async () => {
    if (!themeInput.trim()) return;
    setIsThemeLoading(true);
    setThemeError(null);
    setThemeData(null);

    try {
      const response = await fetch("/api/theme-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: themeInput.trim(),
          analysisJSON: JSON.stringify(activeAnalysis),
          sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Theme explanation generation failed.");
      }

      const data = await response.json();
      const resultData = { ...data, themeName: themeInput.trim() };

      setThemeData(resultData);

      if (sessionId) {
        sessionStorage.setItem(`onboardpilot_theme_${sessionId}`, JSON.stringify(resultData));
      }
    } catch (error: any) {
      setThemeError(error?.message || "Could not generate analogy for this theme.");
    } finally {
      setIsThemeLoading(false);
    }
  };

  const handleResetTheme = async () => {
    setThemeData(null);
    setThemeInput("");
    setThemeError(null);

    try {
      if (sessionId) {
        sessionStorage.removeItem(`onboardpilot_theme_${sessionId}`);
        await fetch("/api/theme-explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reset: true,
            sessionId,
          }),
        });
      }
    } catch (err) {
      console.error("Failed to reset theme on server:", err);
    }
  };

  const getBlueprintStorageKey = () =>
    sessionId ? `onboardpilot_blueprints_${sessionId}` : "";

  const getTaskKey = (task: GuideJSON["starterTasks"][number]) =>
    `${task.title}::${task.difficulty}::${task.files.join("|")}`;

  useEffect(() => {
    const storageKey = getBlueprintStorageKey();
    if (!storageKey) return;

    try {
      const savedBlueprints = sessionStorage.getItem(storageKey);
      if (savedBlueprints) {
        setBlueprintCache(JSON.parse(savedBlueprints));
      }
    } catch (error) {
      console.error("Failed to load cached blueprints:", error);
    }
  }, [sessionId]);

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerateBlueprint = async (task: GuideJSON["starterTasks"][number]) => {
    const taskKey = getTaskKey(task);
    const cachedBlueprint = blueprintCache[taskKey];

    setIsBlueprintOpen(true);
    setBlueprintError(null);

    if (cachedBlueprint) {
      setBlueprint(cachedBlueprint);
      setIsBlueprintLoading(false);
      return;
    }

    setIsBlueprintLoading(true);
    setBlueprint(null);

    try {
      const relevantContext: Record<string, string> = {};
      const missingPaths: string[] = [];

      for (const path of task.files) {
        if (fileContext[path]) {
          relevantContext[path] = fileContext[path];
        } else {
          missingPaths.push(path);
        }
      }

      if (missingPaths.length > 0) {
        if (!repoInfo) {
          throw new Error("Repository metadata is missing. Cannot fetch source snippets.");
        }
        
        console.log(`[Blueprint] Fetching ${missingPaths.length} missing source files from GitHub API:`, missingPaths);
        setBlueprintError("Fetching missing files from GitHub...");

        for (const path of missingPaths) {
          const content = await getFileContent(repoInfo.owner, repoInfo.repo, path);
          if (content) {
            relevantContext[path] = content;
            // Cache locally so we don't fetch it again
            fileContext[path] = content;
          }
        }

        // Save updated fileContext back in sessionStorage for the rest of the session
        const contextStorageKey = sessionId ? `onboardpilot_context_${sessionId}` : "";
        if (contextStorageKey) {
          sessionStorage.setItem(contextStorageKey, JSON.stringify(fileContext));
        }

        setBlueprintError(null); // clear temporary loading message
      }

      if (Object.keys(relevantContext).length === 0) {
        throw new Error("No source snippets are available for this task in the current session.");
      }

      const response = await fetch("/api/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, fileContext: relevantContext }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Blueprint generation failed.");
      }

      const generatedBlueprint = await response.json();
      const updatedCache = { ...blueprintCache, [taskKey]: generatedBlueprint };

      setBlueprint(generatedBlueprint);
      setBlueprintCache(updatedCache);

      const storageKey = getBlueprintStorageKey();
      if (storageKey) {
        sessionStorage.setItem(storageKey, JSON.stringify(updatedCache));
      }
    } catch (error: any) {
      setBlueprintError(error?.message || "Could not generate a blueprint for this task.");
    } finally {
      setIsBlueprintLoading(false);
    }
  };

  return (
    <section className="flex-1 overflow-y-auto pr-2 md:pr-6 py-6 pb-24 h-full">
      <div className="max-w-3xl">
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="bg-secondary-container/20 text-[#0051d5] border border-secondary-container/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
              {activeAnalysis.language || "Unknown Language"}
            </span>
            {activeAnalysis.framework && activeAnalysis.framework !== "None" && (
              <span className="bg-[#FCDEB5]/30 text-[#574325] border border-[#DEC29A]/30 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                {activeAnalysis.framework}
              </span>
            )}
          </div>
          <h1 className="text-display-lg-mobile md:text-display-lg font-display-lg mb-2 font-bold tracking-tight text-on-surface">
            {activeAnalysis.repoName} Onboarding Guide
          </h1>
          <p className="text-text-muted text-xs font-medium">
            AI-generated developer playbook mapped directly from source code.
          </p>
        </div>

        {/* Section: Architecture Overview */}
        <div className="mb-10 border-b border-surface-variant/40 pb-6">
          <h2
            onClick={() => toggleSection("architecture")}
            className="text-headline-md font-headline-md mb-4 flex items-center gap-2.5 cursor-pointer hover:text-[#DEC29A] transition-colors select-none font-semibold text-on-surface w-full"
          >
            <span className="material-symbols-outlined text-[20px] text-[#A3ABC4]">architecture</span>
            Architecture Overview
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRegenerateSection("architecture");
                }}
                disabled={regeneratingSections.architecture}
                className="text-[#A3ABC4] hover:text-primary transition-all p-1.5 rounded hover:bg-surface-container disabled:opacity-50 cursor-pointer flex items-center justify-center"
                title="Regenerate architecture summary"
              >
                <span className={`material-symbols-outlined text-[16px] ${regeneratingSections.architecture ? 'spinner-minimal text-[#DEC29A]' : ''}`}>
                  refresh
                </span>
              </button>
              <span className="material-symbols-outlined text-[18px] text-text-muted">
                {sections.architecture ? "expand_less" : "expand_more"}
              </span>
            </div>
          </h2>
          {sections.architecture && (
            <div className="text-on-surface-variant text-sm space-y-4 leading-relaxed pl-1 transition-all">
              <p>{activeAnalysis.architectureSummary || "No architecture summary available."}</p>
            </div>
          )}
        </div>

        {/* Section: Visual Workflow */}
        <div className="mb-10 border-b border-surface-variant/40 pb-6">
          <h2
            onClick={() => toggleSection("workflow")}
            className="text-headline-md font-headline-md mb-4 flex items-center gap-2.5 cursor-pointer hover:text-[#DEC29A] transition-colors select-none font-semibold text-on-surface w-full"
          >
            <span className="material-symbols-outlined text-[20px] text-[#A3ABC4]">insights</span>
            Visual Workflow
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRegenerateSection("workflow");
                }}
                disabled={regeneratingSections.workflow}
                className="text-[#A3ABC4] hover:text-primary transition-all p-1.5 rounded hover:bg-surface-container disabled:opacity-50 cursor-pointer flex items-center justify-center"
                title="Regenerate visual flowchart"
              >
                <span className={`material-symbols-outlined text-[16px] ${regeneratingSections.workflow ? 'spinner-minimal text-[#DEC29A]' : ''}`}>
                  refresh
                </span>
              </button>
              <span className="material-symbols-outlined text-[18px] text-text-muted">
                {sections.workflow ? "expand_less" : "expand_more"}
              </span>
            </div>
          </h2>
          {sections.workflow && (
            <div className="transition-all pl-1">
              {activeAnalysis.mermaidFlowchart ? (
                <MermaidRenderer chart={activeAnalysis.mermaidFlowchart} />
              ) : (
                <p className="text-text-muted text-sm italic">No visual workflow flowchart available. Click refresh to generate one.</p>
              )}
            </div>
          )}
        </div>

        {/* Section: Dependency Graph */}
        <div className="mb-10 border-b border-surface-variant/40 pb-6">
          <h2
            onClick={() => toggleSection("dependencies")}
            className="text-headline-md font-headline-md mb-4 flex items-center gap-2.5 cursor-pointer hover:text-[#DEC29A] transition-colors select-none font-semibold text-on-surface w-full"
          >
            <span className="material-symbols-outlined text-[20px] text-[#A3ABC4]">hub</span>
            Dependency Graph
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefreshDependencyGraph();
                }}
                disabled={regeneratingSections.dependencies}
                className="text-[#A3ABC4] hover:text-primary transition-all p-1.5 rounded hover:bg-surface-container disabled:opacity-50 cursor-pointer flex items-center justify-center"
                title="Refresh dependency graph"
              >
                <span className={`material-symbols-outlined text-[16px] ${regeneratingSections.dependencies ? 'spinner-minimal text-[#DEC29A]' : ''}`}>
                  refresh
                </span>
              </button>
              <span className="material-symbols-outlined text-[18px] text-text-muted">
                {sections.dependencies ? "expand_less" : "expand_more"}
              </span>
            </div>
          </h2>
          {sections.dependencies && (
            <div className="transition-all">
              <DependencyGraph graph={activeImportGraph} />
            </div>
          )}
        </div>

        {/* Section: Pop Culture Explainer Mode */}
        <div className="mb-10 border-b border-surface-variant/40 pb-6">
          <h2
            onClick={() => toggleSection("popCulture")}
            className="text-headline-md font-headline-md mb-4 flex items-center gap-2.5 cursor-pointer hover:text-[#DEC29A] transition-colors select-none font-semibold text-on-surface w-full"
          >
            <span className="material-symbols-outlined text-[20px] text-[#A3ABC4]">theater_comedy</span>
            Pop Culture Explainer Mode
            <div className="ml-auto flex items-center gap-2 shrink-0">
              {themeData && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateTheme();
                  }}
                  disabled={isThemeLoading}
                  className="text-[#A3ABC4] hover:text-primary transition-all p-1.5 rounded hover:bg-surface-container disabled:opacity-50 cursor-pointer flex items-center justify-center"
                  title="Regenerate theme analogies"
                >
                  <span className={`material-symbols-outlined text-[16px] ${isThemeLoading ? 'spinner-minimal text-[#DEC29A]' : ''}`}>
                    refresh
                  </span>
                </button>
              )}
              <span className="material-symbols-outlined text-[18px] text-text-muted">
                {sections.popCulture ? "expand_less" : "expand_more"}
              </span>
            </div>
          </h2>
          {sections.popCulture && (
            <div className="transition-all pl-1 space-y-4">
              {!themeData && !isThemeLoading ? (
                <div className="bg-surface-bright border border-border-subtle p-5 rounded-lg shadow-sm">
                  <h3 className="text-sm font-semibold text-on-surface mb-2">
                    Explain codebase using a movie or web series
                  </h3>
                  <p className="text-text-muted text-xs leading-relaxed mb-4">
                    Type in any movie, show, or fictional universe. Our AI will analyze your codebase and explain modules as characters/concepts, then draw a visual character relation flowchart.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleGenerateTheme();
                    }}
                    className="flex flex-col sm:flex-row gap-3"
                  >
                    <input
                      type="text"
                      value={themeInput}
                      onChange={(e) => setThemeInput(e.target.value)}
                      placeholder="e.g. Stranger Things, Harry Potter, Star Wars..."
                      disabled={isThemeLoading}
                      className="flex-1 bg-surface-white border border-border-subtle rounded px-3 py-2 text-xs focus:outline-none focus:border-[#DEC29A] disabled:opacity-50 text-on-surface"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isThemeLoading || !themeInput.trim()}
                      className="bg-[#DEC29A] text-on-primary-fixed hover:bg-[#FCDEB5] disabled:bg-surface-container disabled:text-text-muted px-5 py-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">magic_button</span>
                      Explain Code
                    </button>
                  </form>
                  {themeError && (
                    <p className="text-error text-xs mt-3 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                      {themeError}
                    </p>
                  )}
                </div>
              ) : isThemeLoading ? (
                <div className="bg-surface-bright border border-border-subtle p-8 rounded-lg shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                  <span className="material-symbols-outlined text-[36px] text-[#DEC29A] spinner-minimal">
                    progress_activity
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                      {getLoaderMessage(themeInput)}
                    </h4>
                    <p className="text-[10px] text-text-muted mt-1">
                      AI is casting its creative spells on the repository structure...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Results introductory card */}
                  <div className="bg-surface-bright border border-border-subtle p-5 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div>
                        <span className="bg-[#FCDEB5]/30 text-[#574325] border border-[#DEC29A]/30 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider mb-1 inline-block">
                          {themeData.themeName || themeInput || "Pop Culture Explainer"}
                        </span>
                        <h3 className="font-semibold text-body-md text-on-surface">
                          Codebase Analogy Universe
                        </h3>
                      </div>
                      <button
                        onClick={handleResetTheme}
                        className="text-text-muted hover:text-primary border border-border-subtle px-2.5 py-1 rounded bg-surface-white text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[12px]">refresh</span>
                        Try another theme
                      </button>
                    </div>
                    <p className="text-text-muted text-xs leading-relaxed">
                      {themeData.analogySummary}
                    </p>
                  </div>

                  {/* Character Mapping Cards */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                      Character & Component Mappings
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {themeData.mappings?.map((map: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-4 border border-border-subtle bg-surface-bright rounded-lg shadow-sm hover:border-[#DEC29A] transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="font-mono-code text-[11px] bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant max-w-[150px] truncate" title={map.codeElement}>
                                {map.codeElement.split("/").pop()}
                              </span>
                              <span className="text-[10px] font-bold text-text-muted uppercase">matches</span>
                            </div>
                            <h5 className="font-semibold text-xs text-primary mb-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-[#DEC29A]">face</span>
                              {map.themeElement}
                            </h5>
                            <p className="text-text-muted text-[11px] leading-relaxed">
                              {map.explanation}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Themed Visual Workflow */}
                  {themeData.mermaidFlowchart && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                        Themed Visual Workflow
                      </h4>
                      <MermaidRenderer chart={themeData.mermaidFlowchart} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section: Directory Breakdown */}
        <div className="mb-10 border-b border-surface-variant/40 pb-6">
          <h2
            onClick={() => toggleSection("directory")}
            className="text-headline-md font-headline-md mb-4 flex items-center gap-2.5 cursor-pointer hover:text-[#DEC29A] transition-colors select-none font-semibold text-on-surface w-full"
          >
            <span className="material-symbols-outlined text-[20px] text-[#A3ABC4]">folder_open</span>
            Directory Breakdown
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRegenerateSection("directory");
                }}
                disabled={regeneratingSections.directory}
                className="text-[#A3ABC4] hover:text-primary transition-all p-1.5 rounded hover:bg-surface-container disabled:opacity-50 cursor-pointer flex items-center justify-center"
                title="Regenerate directory breakdown"
              >
                <span className={`material-symbols-outlined text-[16px] ${regeneratingSections.directory ? 'spinner-minimal text-[#DEC29A]' : ''}`}>
                  refresh
                </span>
              </button>
              <span className="material-symbols-outlined text-[18px] text-text-muted">
                {sections.directory ? "expand_less" : "expand_more"}
              </span>
            </div>
          </h2>
          {sections.directory && (
            <div className="transition-all">
              <DirectoryTree breakdown={activeAnalysis.directoryBreakdown} />
            </div>
          )}
        </div>

        {/* Section: Key Files */}
        <div className="mb-10 border-b border-surface-variant/40 pb-6">
          <h2
            onClick={() => toggleSection("keyFiles")}
            className="text-headline-md font-headline-md mb-4 flex items-center gap-2.5 cursor-pointer hover:text-[#DEC29A] transition-colors select-none font-semibold text-on-surface w-full"
          >
            <span className="material-symbols-outlined text-[20px] text-[#A3ABC4]">file_present</span>
            Key Files to Read
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRegenerateSection("keyFiles");
                }}
                disabled={regeneratingSections.keyFiles}
                className="text-[#A3ABC4] hover:text-primary transition-all p-1.5 rounded hover:bg-surface-container disabled:opacity-50 cursor-pointer flex items-center justify-center"
                title="Regenerate key files breakdown"
              >
                <span className={`material-symbols-outlined text-[16px] ${regeneratingSections.keyFiles ? 'spinner-minimal text-[#DEC29A]' : ''}`}>
                  refresh
                </span>
              </button>
              <span className="material-symbols-outlined text-[18px] text-text-muted">
                {sections.keyFiles ? "expand_less" : "expand_more"}
              </span>
            </div>
          </h2>
          {sections.keyFiles && (
            <div className="space-y-3 transition-all">
              {activeAnalysis.keyFiles && activeAnalysis.keyFiles.length > 0 ? (
                activeAnalysis.keyFiles.map((file, idx) => (
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
            className="text-headline-md font-headline-md mb-4 flex items-center gap-2.5 cursor-pointer hover:text-[#DEC29A] transition-colors select-none font-semibold text-on-surface w-full"
          >
            <span className="material-symbols-outlined text-[20px] text-[#A3ABC4]">deployed_code</span>
            Core Modules
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRegenerateSection("modules");
                }}
                disabled={regeneratingSections.modules}
                className="text-[#A3ABC4] hover:text-primary transition-all p-1.5 rounded hover:bg-surface-container disabled:opacity-50 cursor-pointer flex items-center justify-center"
                title="Regenerate core modules"
              >
                <span className={`material-symbols-outlined text-[16px] ${regeneratingSections.modules ? 'spinner-minimal text-[#DEC29A]' : ''}`}>
                  refresh
                </span>
              </button>
              <span className="material-symbols-outlined text-[18px] text-text-muted">
                {sections.modules ? "expand_less" : "expand_more"}
              </span>
            </div>
          </h2>
          {sections.modules && (
            <div className="space-y-4 transition-all pl-1">
              {activeAnalysis.coreModules && activeAnalysis.coreModules.length > 0 ? (
                activeAnalysis.coreModules.map((mod, idx) => (
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
            className="text-headline-md font-headline-md mb-4 flex items-center gap-2.5 cursor-pointer hover:text-[#DEC29A] transition-colors select-none font-semibold text-on-surface w-full"
          >
            <span className="material-symbols-outlined text-[20px] text-[#A3ABC4]">task_alt</span>
            Starter Tasks
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRegenerateSection("tasks");
                }}
                disabled={regeneratingSections.tasks}
                className="text-[#A3ABC4] hover:text-primary transition-all p-1.5 rounded hover:bg-surface-container disabled:opacity-50 cursor-pointer flex items-center justify-center"
                title="Regenerate starter tasks"
              >
                <span className={`material-symbols-outlined text-[16px] ${regeneratingSections.tasks ? 'spinner-minimal text-[#DEC29A]' : ''}`}>
                  refresh
                </span>
              </button>
              <span className="material-symbols-outlined text-[18px] text-text-muted">
                {sections.tasks ? "expand_less" : "expand_more"}
              </span>
            </div>
          </h2>
          {sections.tasks && (
            <div className="transition-all">
              <StarterTasks
                tasks={activeAnalysis.starterTasks}
                hasBlueprint={(task) => Boolean(blueprintCache[getTaskKey(task)])}
                onGenerateBlueprint={handleGenerateBlueprint}
              />
            </div>
          )}
        </div>
      </div>

      {isBlueprintOpen && (
        <BlueprintModal
          blueprint={blueprint}
          isLoading={isBlueprintLoading}
          error={blueprintError}
          onClose={() => setIsBlueprintOpen(false)}
        />
      )}
    </section>
  );
}
