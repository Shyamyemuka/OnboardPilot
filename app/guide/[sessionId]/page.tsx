"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import type { GuideJSON, ChatMessage, ImportGraphNode } from "@/types";
import GuidePanel from "@/components/GuidePanel";
import ChatPanel from "@/components/ChatPanel";
import { useAuth } from "@/context/AuthContext";
import { getSessionData, saveAnalysisSession, updateSessionMessages, getUserSessions, type SessionDocument } from "@/lib/db";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default function GuidePage({ params }: PageProps) {
  const router = useRouter();
  const { sessionId } = use(params);
  const { user, loading, signInWithGitHub, logOut } = useAuth();

  const [analysis, setAnalysis] = useState<GuideJSON | null>(null);
  const [analysisJSON, setAnalysisJSON] = useState<string>("");
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string; url: string } | null>(null);
  const [fileContext, setFileContext] = useState<Record<string, string>>({});
  const [importGraph, setImportGraph] = useState<ImportGraphNode[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [previousSessions, setPreviousSessions] = useState<SessionDocument[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 1. Core Session Hydration Logic (Firestore vs SessionStorage)
  useEffect(() => {
    if (!sessionId) return;
    setIsHydrating(true);
    setError(null);

    async function hydrateSession() {
      try {
        // Try fetching from Firestore first
        const firestoreSession = await getSessionData(sessionId);

        if (firestoreSession) {
          setAnalysis(firestoreSession.analysis);
          setAnalysisJSON(JSON.stringify(firestoreSession.analysis));
          setRepoInfo({
            owner: firestoreSession.repoOwner,
            repo: firestoreSession.repoName,
            url: firestoreSession.repoUrl,
          });
          setMessages(firestoreSession.messages || []);
          const savedContext = sessionStorage.getItem(`onboardpilot_context_${sessionId}`);
          const savedGraph = sessionStorage.getItem(`onboardpilot_graph_${sessionId}`);
          if (savedContext) setFileContext(JSON.parse(savedContext));
          if (savedGraph) setImportGraph(JSON.parse(savedGraph));
          setIsHydrating(false);
          return;
        }

        // If Firestore session doesn't exist, check local sessionStorage fallback
        const savedAnalysis = sessionStorage.getItem(`onboardpilot_analysis_${sessionId}`);
        const savedContext = sessionStorage.getItem(`onboardpilot_context_${sessionId}`);
        const savedGraph = sessionStorage.getItem(`onboardpilot_graph_${sessionId}`);
        const savedRepo = sessionStorage.getItem(`onboardpilot_repo_${sessionId}`);

        if (savedAnalysis && savedRepo) {
          const parsedAnalysis = JSON.parse(savedAnalysis);
          const parsedRepo = JSON.parse(savedRepo);

          setAnalysis(parsedAnalysis);
          setAnalysisJSON(savedAnalysis);
          if (savedContext) setFileContext(JSON.parse(savedContext));
          if (savedGraph) setImportGraph(JSON.parse(savedGraph));
          setRepoInfo(parsedRepo);
          setMessages([
            {
              role: "assistant",
              content: `Hello! I've mapped the **${parsedAnalysis.repoName}** codebase and generated your onboarding blueprint. Ask me anything about the directories, modules, routing, or how to get started on your first issue!`,
            },
          ]);

          // Mid-session Auth Migration:
          // If the user was a guest but has now logged in, automatically save this session to Firestore!
          if (user) {
            await saveAnalysisSession(
              sessionId,
              user.uid,
              parsedRepo,
              parsedAnalysis,
              [
                {
                  role: "assistant",
                  content: `Hello! I've mapped the **${parsedAnalysis.repoName}** codebase and generated your onboarding blueprint. Ask me anything about the directories, modules, routing, or how to get started on your first issue!`,
                },
              ]
            );
            // Refresh sidebar history
            loadUserHistory(user.uid);
          }

          setIsHydrating(false);
          return;
        }

        // Neither exist -> Session is invalid
        setError("Onboarding guide not found. Redirecting to landing page...");
        setTimeout(() => router.push("/"), 3000);
      } catch (err) {
        console.error("Hydration error:", err);
        setError("Error loading onboarding workspace.");
        setTimeout(() => router.push("/"), 3000);
      }
    }

    // Delay slightly if auth state is loading to prevent premature guest fallback
    if (!loading) {
      hydrateSession();
    }
  }, [sessionId, user, loading, router]);

  // 2. Fetch User Scanning History
  const loadUserHistory = async (uid: string) => {
    try {
      const history = await getUserSessions(uid);
      setPreviousSessions(history);
    } catch (err) {
      console.error("Error loading user history:", err);
    }
  };

  useEffect(() => {
    if (user) {
      loadUserHistory(user.uid);
    } else {
      setPreviousSessions([]);
    }
  }, [user]);

  // 3. Q&A Message saving
  const handleUpdateMessages = async (updatedMessages: ChatMessage[]) => {
    setMessages(updatedMessages);
    if (user && sessionId) {
      try {
        await updateSessionMessages(sessionId, updatedMessages);
      } catch (err) {
        console.error("Failed to persist message history:", err);
      }
    }
  };

  const handleDownloadMarkdown = () => {
    if (!analysis || !repoInfo) return;

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

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `onboarding_guide_${analysis.repoName.toLowerCase()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMigrationLogin = async () => {
    try {
      await signInWithGitHub();
    } catch (err) {
      console.error(err);
    }
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

  if (isHydrating || loading) {
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
    <div className="bg-background text-on-surface h-screen flex flex-col font-body-md text-body-md overflow-hidden relative">
      {/* TopNavBar */}
      <header className="bg-surface border-b border-border-subtle shrink-0 shadow-sm z-30">
        <div className="flex justify-between items-center h-16 w-full px-4 md:px-16 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 md:gap-4 select-none">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-[#A3ABC4] hover:text-primary transition-colors p-1.5 rounded cursor-pointer"
              title="Toggle Scan History"
            >
              <span className="material-symbols-outlined text-[20px]">
                {sidebarOpen ? "menu_open" : "menu"}
              </span>
            </button>
            <div
              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => router.push("/")}
            >
              <img
                alt="OnboardPilot Logo"
                className="h-10 w-auto object-contain select-none"
                src="/logo.png"
              />
            </div>
            <span className="text-text-muted text-label-sm font-label-sm px-1 select-none hidden sm:inline">/</span>
            <span className="text-xs md:text-sm font-body-md font-bold text-on-surface bg-surface-container px-2 py-0.5 rounded border border-border-subtle max-w-[150px] md:max-w-xs truncate">
              {repoInfo?.owner}/{repoInfo?.repo}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-2 px-3 py-1.5 border border-border-subtle rounded bg-surface-white hover:bg-surface-container-low hover:border-outline-variant transition-all text-xs font-semibold shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span className="hidden md:inline">Download .md</span>
            </button>

            {/* Dynamic Avatar pic based on GitHub email */}
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="text-on-surface hover:text-[#DEC29A] transition-colors text-xs font-bold cursor-pointer uppercase tracking-wider flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">dashboard</span>
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
                <span className="text-border-subtle select-none">|</span>
                <img
                  alt="Profile"
                  className="h-8 w-8 rounded-full border border-border-subtle shadow-sm object-cover"
                  src={user.photoURL || "https://lh3.googleusercontent.com/a/default-user"}
                  title={user.email || "Signed In"}
                />
              </div>
            ) : (
              <button
                onClick={handleMigrationLogin}
                className="bg-[#FCDEB5] text-[#271901] px-4 py-2 rounded text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
              >
                Sign In
              </button>
            )}

            <button
              onClick={() => router.push("/")}
              className="bg-primary text-white border border-transparent px-4 py-2 rounded text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              New Scan
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Core Area */}
      <div className="flex-1 flex overflow-hidden w-full max-w-7xl mx-auto relative">
        {/* Left Side History Sidebar drawer */}
        {sidebarOpen && (
          <aside className="absolute md:relative inset-y-0 left-0 w-[220px] bg-surface border-r border-border-subtle z-20 flex flex-col shrink-0 transition-transform duration-300 shadow-lg md:shadow-none">
            <div className="p-4 border-b border-border-subtle shrink-0 font-semibold text-xs tracking-wider uppercase text-text-muted flex items-center gap-1.5 select-none bg-surface-bright">
              <span className="material-symbols-outlined text-[16px]">history</span>
              Previous Scans
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {user ? (
                previousSessions.length > 0 ? (
                  previousSessions.map((session) => {
                    const isActive = session.id === sessionId;
                    return (
                      <button
                        key={session.id}
                        onClick={() => router.push(`/guide/${session.id}`)}
                        className={`w-full text-left p-2.5 rounded border transition-all cursor-pointer flex flex-col gap-1 ${
                          isActive
                            ? "bg-surface-white border-[#DEC29A] shadow-sm font-semibold text-primary"
                            : "bg-transparent border-transparent hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs truncate w-full">
                          <span className="material-symbols-outlined text-[14px] text-[#A3ABC4]">
                            description
                          </span>
                          <span className="truncate">{session.repoName}</span>
                        </div>
                        <span className="text-[10px] text-text-muted truncate block">
                          {session.repoOwner}
                        </span>
                        <div className="flex gap-1.5 mt-1">
                          <span className="bg-surface-container px-1 py-0.5 rounded text-[8px] font-bold text-text-muted uppercase">
                            {session.analysis.language || "code"}
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-text-muted text-[11px] italic text-center py-6">
                    No scans saved yet. Start by analyzing a repository!
                  </p>
                )
              ) : (
                <div className="p-4 border border-dashed border-border-subtle rounded-lg bg-surface-bright text-center flex flex-col items-center">
                  <span className="material-symbols-outlined text-[32px] text-[#DEC29A] mb-3">
                    lock
                  </span>
                  <h4 className="text-xs font-semibold text-on-surface mb-1 select-none">
                    Save Scan History
                  </h4>
                  <p className="text-text-muted text-[10px] leading-relaxed mb-4">
                    Connect GitHub to automatically save this onboarding playbook and access past scan logs.
                  </p>
                  <button
                    onClick={handleMigrationLogin}
                    className="w-full bg-[#DEC29A] text-on-primary-fixed text-[10px] font-bold py-2 rounded hover:bg-[#FCDEB5] transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[14px]">login</span>
                    Sign In with GitHub
                  </button>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Main Guide documentation */}
        {analysis && (
          <GuidePanel
            analysis={analysis}
            fileContext={fileContext}
            importGraph={importGraph}
          />
        )}

        {/* Right Copilot Chat Drawer */}
        {analysis && (
          <ChatPanel
            repoName={analysis.repoName}
            analysisJSON={analysisJSON}
            // Passing the active persisted messages state statefully
            messagesState={{ messages, setMessages: handleUpdateMessages }}
          />
        )}
      </div>
    </div>
  );
}
