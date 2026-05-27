"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import type { GuideJSON } from "@/types";
import GuidePanel from "@/components/GuidePanel";
import ChatPanel from "@/components/ChatPanel";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default function GuidePage({ params }: PageProps) {
  const router = useRouter();
  const { sessionId } = use(params);

  const [analysis, setAnalysis] = useState<GuideJSON | null>(null);
  const [analysisJSON, setAnalysisJSON] = useState<string>("");
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const savedAnalysis = sessionStorage.getItem(`onboardpilot_analysis_${sessionId}`);
    const savedRepo = sessionStorage.getItem(`onboardpilot_repo_${sessionId}`);

    if (!savedAnalysis || !savedRepo) {
      setError("Session expired or invalid. Redirecting back to landing page...");
      const timer = setTimeout(() => router.push("/"), 3000);
      return () => clearTimeout(timer);
    }

    try {
      setAnalysis(JSON.parse(savedAnalysis));
      setAnalysisJSON(savedAnalysis);
      setRepoInfo(JSON.parse(savedRepo));
    } catch {
      setError("Corrupted session data. Redirecting back to landing page...");
      const timer = setTimeout(() => router.push("/"), 3000);
      return () => clearTimeout(timer);
    }
  }, [sessionId, router]);

  const handleDownloadMarkdown = () => {
    if (!analysis || !repoInfo) return;

    // Beautifully serialize analysis JSON to Markdown
    let md = `# Onboarding Guide — ${analysis.repoName}\n\n`;
    md += `**Language:** ${analysis.language || "Unknown"}\n`;
    md += `**Framework:** ${analysis.framework || "None"}\n`;
    md += `**Repository URL:** [${repoInfo.owner}/${repoInfo.repo}](${repoInfo.url})\n\n`;

    md += `## Architecture Overview\n\n${analysis.architectureSummary || "No overview available."}\n\n`;

    md += `## Directory Breakdown\n\n`;
    if (analysis.directoryBreakdown && analysis.directoryBreakdown.length > 0) {
      analysis.directoryBreakdown.forEach((dir) => {
        md += `- \`${dir.path}\` — ${dir.role} ${dir.important ? "*(Priority)*" : ""}\n`;
      });
    } else {
      md += `No directory breakdown available.\n`;
    }
    md += `\n`;

    md += `## Key Files to Read\n\n`;
    if (analysis.keyFiles && analysis.keyFiles.length > 0) {
      analysis.keyFiles.forEach((file) => {
        md += `### \`${file.path}\` ${file.mustRead ? "*(Must Read)*" : ""}\n`;
        md += `${file.description}\n\n`;
      });
    } else {
      md += `No key files documented.\n\n`;
    }

    md += `## Core Modules\n\n`;
    if (analysis.coreModules && analysis.coreModules.length > 0) {
      analysis.coreModules.forEach((mod) => {
        md += `### ${mod.name}\n`;
        md += `${mod.description}\n`;
        if (mod.files && mod.files.length > 0) {
          md += `**Key Files:** ${mod.files.map((f) => `\`${f}\``).join(", ")}\n`;
        }
        md += `\n`;
      });
    } else {
      md += `No primary modules identified.\n\n`;
    }

    md += `## Suggested Starter Tasks\n\n`;
    if (analysis.starterTasks && analysis.starterTasks.length > 0) {
      analysis.starterTasks.forEach((task) => {
        md += `### [${task.difficulty.toUpperCase()}] ${task.title}\n`;
        md += `${task.description}\n`;
        if (task.files && task.files.length > 0) {
          md += `**Relevant Files:** ${task.files.map((f) => `\`${f}\``).join(", ")}\n`;
        }
        md += `\n`;
      });
    } else {
      md += `No starter tasks suggested.\n`;
    }

    // Trigger download
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `onboarding_guide_${analysis.repoName.toLowerCase()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <div className="bg-background text-on-surface min-h-screen flex items-center justify-center font-body-md select-none text-center p-6">
        <div className="max-w-md flex flex-col items-center">
          <span className="material-symbols-outlined text-[48px] text-error mb-4 spinner-minimal">
            progress_activity
          </span>
          <p className="text-body-lg text-on-surface font-semibold mb-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!analysis || !repoInfo) {
    return (
      <div className="bg-background text-on-surface min-h-screen flex items-center justify-center font-body-md select-none text-center">
        <div className="flex flex-col items-center">
          <span className="material-symbols-outlined text-[48px] text-[#DEC29A] spinner-minimal mb-4">
            progress_activity
          </span>
          <p className="text-body-lg text-text-muted">Hydrating onboarding guide...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-surface h-screen flex flex-col font-body-md text-body-md overflow-hidden">
      {/* TopNavBar */}
      <header className="bg-surface border-b border-border-subtle shrink-0 shadow-sm z-10">
        <div className="flex justify-between items-center h-16 w-full px-4 md:px-16 max-w-7xl mx-auto">
          <div className="flex items-center gap-4 select-none">
            <img
              alt="OnboardPilot"
              className="h-8 w-8 object-contain cursor-pointer"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdb4c8InNQLgfEF-FTl6McOpe1Sr8KFpjFtV0_x3EiHtqpcjjVzw_xrHIybekvFQ78N-0JOP_FJ9n9bgaWR_gQikb1PmK7eVO76Ji2qc3_cfnkaevN9d97rKfciK0AzHhYsZozItcdaTc7leNIldoaHmshyZd7HIayv-ZnN8AkhCdwVzu1VBPY0yMxA8DcwIU2xVKvE1BVcS7MX7i_641D2oQDfSLqVla4eGuWl082B-5I2HDC-wz5yrJUf7i4Uebvenw-Mex0HZyq"
              onClick={() => router.push("/")}
            />
            <span
              className="text-body-lg font-headline-md font-bold tracking-tight text-primary cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => router.push("/")}
            >
              OnboardPilot
            </span>
            <span className="text-text-muted text-label-sm font-label-sm px-1 md:px-2 select-none">/</span>
            <span className="text-xs md:text-sm font-body-md font-bold text-on-surface bg-surface-container px-2 py-0.5 rounded border border-border-subtle max-w-[120px] md:max-w-xs truncate">
              {repoInfo.owner}/{repoInfo.repo}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-2 px-3 py-1.5 border border-border-subtle rounded bg-surface-white hover:bg-surface-container-low hover:border-outline-variant transition-all text-xs font-semibold shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span className="hidden sm:inline">Download .md</span>
            </button>
            <button className="text-primary hover:bg-surface-container-low p-2 rounded transition-colors duration-200 cursor-pointer hidden sm:flex">
              <span className="material-symbols-outlined">account_circle</span>
            </button>
            <button
              onClick={() => router.push("/")}
              className="bg-[#FCDEB5] text-[#271901] px-4 py-2 rounded text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
            >
              New Scan
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden w-full max-w-7xl mx-auto md:px-16 px-4">
        {/* Left Panel: Guide */}
        <GuidePanel analysis={analysis} />

        {/* Right Panel: Chat */}
        <ChatPanel repoName={analysis.repoName} analysisJSON={analysisJSON} />
      </main>
    </div>
  );
}
