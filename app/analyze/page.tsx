"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProgressSteps from "@/components/ProgressSteps";
import {
  formatPullRequestDiff,
  getFileContent,
  getFileTree,
  getPullRequestFiles,
  selectKeyFiles,
} from "@/lib/github";
import { extractImportGraph, generateSessionId } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { saveAnalysisSession } from "@/lib/db";

function AnalyzeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const owner = searchParams.get("owner") || "";
  const repo = searchParams.get("repo") || "";
  const url = searchParams.get("url") || "";
  const prNumber = searchParams.get("pr") ? Number(searchParams.get("pr")) : undefined;

  const [currentStep, setCurrentStep] = useState(1);
  const [currentFile, setCurrentFile] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!owner || !repo) {
      setErrorMessage("Missing repository parameters. Redirecting to landing page...");
      const timer = setTimeout(() => router.push("/"), 3000);
      return () => clearTimeout(timer);
    }

    let isCancelled = false;

    async function runPipeline() {
      try {
        // Step 1: Fetch File Tree
        if (isCancelled) return;
        setCurrentStep(1);
        setCurrentFile("Fetching tree from GitHub API...");
        const fullTree = await getFileTree(owner, repo);

        // Step 2: Select Key Files
        if (isCancelled) return;
        setCurrentStep(2);
        setCurrentFile("Evaluating file dependencies...");
        let prDiff = "";
        let prFilePaths: string[] = [];

        if (prNumber) {
          setCurrentFile(`Fetching pull request #${prNumber} diff...`);
          const prFiles = await getPullRequestFiles(owner, repo, prNumber);
          prDiff = formatPullRequestDiff(prFiles);
          prFilePaths = prFiles.map((file) => file.filename);
        }

        const keyPaths = Array.from(new Set([...prFilePaths, ...selectKeyFiles(fullTree)])).slice(0, 35);

        // Step 3: Fetch Key File Contents
        if (isCancelled) return;
        setCurrentStep(3);
        const fileContents: Record<string, string> = {};
        for (let i = 0; i < keyPaths.length; i++) {
          if (isCancelled) return;
          const path = keyPaths[i];
          setCurrentFile(`Reading: ${path}`);
          const content = await getFileContent(owner, repo, path);
          fileContents[path] = content;
        }

        if (prDiff) {
          fileContents[`__pull_request_${prNumber}_diff__.diff`] = prDiff;
        }

        const importGraph = extractImportGraph(fileContents);

        // Step 4: AI analysis call
        if (isCancelled) return;
        setCurrentStep(4);
        setCurrentFile("Initiating analysis...");
        const analyzeRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner,
            repo,
            fileTree: fullTree,
            keyFiles: fileContents,
            prNumber,
          }),
        });

        if (!analyzeRes.ok) {
          const errData = await analyzeRes.json().catch(() => ({}));
          throw new Error(errData.error || "AI analysis failed.");
        }

        const reader = analyzeRes.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let guideJSON: any = null;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // keep partial line in buffer

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const chunk = JSON.parse(line);
                if (chunk.type === "status") {
                  setCurrentFile(chunk.message);
                } else if (chunk.type === "result") {
                  guideJSON = chunk.data;
                } else if (chunk.type === "error") {
                  throw new Error(chunk.error);
                }
              } catch (err: any) {
                console.error("Failed to parse chunk:", err);
                if (err.message && !err.message.includes("Unexpected end of JSON")) {
                  throw err;
                }
              }
            }
          }
        }

        if (!guideJSON) {
          throw new Error("No analysis result received from server.");
        }

        // Step 5: Save & Navigate
        if (isCancelled) return;
        setCurrentStep(5);
        setCurrentFile("Wrapping up onboarding playbook...");

        const sessionId = generateSessionId();

        // Save in sessionStorage
        sessionStorage.setItem(`onboardpilot_analysis_${sessionId}`, JSON.stringify(guideJSON));
        sessionStorage.setItem(`onboardpilot_context_${sessionId}`, JSON.stringify(fileContents));
        sessionStorage.setItem(`onboardpilot_graph_${sessionId}`, JSON.stringify(importGraph));
        sessionStorage.setItem(
          `onboardpilot_repo_${sessionId}`,
          JSON.stringify({ owner, repo, url, prNumber })
        );

        try {
          await saveAnalysisSession(
            sessionId,
            user ? user.uid : "guest",
            { owner, repo, url },
            guideJSON,
            []
          );
        } catch (dbErr) {
          console.error("Failed to persist session to Firestore:", dbErr);
        }

        router.push(`/guide/${sessionId}`);
      } catch (err: any) {
        if (isCancelled) return;
        console.error(err);

        let friendlyMessage = "Failed to analyze repository. Please try again.";
        if (err.message === "REPO_NOT_FOUND") {
          friendlyMessage = "Repository not found or is private. Make sure it's a public GitHub repo.";
        } else if (err.message === "RATE_LIMITED") {
          friendlyMessage = "GitHub API rate limit hit. Please try again in a few minutes or configure GITHUB_PAT.";
        } else if (err.message === "PR_NOT_FOUND") {
          friendlyMessage = "Pull request not found. Check that the PR URL is public and still exists.";
        } else if (err.message === "GITHUB_ERROR") {
          friendlyMessage = "Failed to communicate with GitHub. Check your network or repository name.";
        } else if (err.message?.includes("Both AI providers are temporarily busy")) {
          friendlyMessage = "Both AI providers are temporarily busy. Please retry in a minute.";
        } else if (err.message) {
          friendlyMessage = err.message;
        }

        setErrorMessage(friendlyMessage);
      }
    }

    runPipeline();

    return () => {
      isCancelled = true;
    };
  }, [owner, repo, url, router]);

  const handleCancel = () => {
    router.push("/");
  };

  if (errorMessage) {
    return (
      <main className="w-full max-w-[600px] px-6 py-12 flex flex-col items-center justify-center text-center">
        <header className="mb-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-error-container/30 border-2 border-error flex items-center justify-center text-error mb-6 shadow-sm">
            <span className="material-symbols-outlined text-[32px] font-bold">close</span>
          </div>
          <h1 className="font-display-lg text-2xl font-bold tracking-tight text-on-surface mb-2">
            Analysis Blocked
          </h1>
          <p className="font-body-lg text-text-muted text-sm max-w-md leading-relaxed">
            We ran into an issue while preparing this onboarding run.
          </p>
        </header>

        <div className="bg-surface-white border border-border-subtle rounded-xl p-6 w-full text-xs md:text-sm text-error font-medium shadow-sm mb-8 text-left flex items-start gap-3 leading-relaxed">
          <span className="material-symbols-outlined text-[20px] text-error mt-0.5 shrink-0">warning</span>
          <p>{errorMessage}</p>
        </div>

        <button
          onClick={handleCancel}
          className="bg-[#DEC29A] text-on-primary-fixed text-label-sm font-label-sm px-6 py-3 rounded-[2px] hover:bg-[#FCDEB5] transition-colors cursor-pointer text-xs font-bold shadow-sm"
        >
          Return to home
        </button>
      </main>
    );
  }

  return (
    <main className="w-full max-w-[600px] px-margin-mobile md:px-margin-desktop py-12 flex flex-col items-center">
      {/* Logo Header */}
      <header className="mb-16 flex flex-col items-center text-center select-none">
        <img
          alt="OnboardPilot Logo"
          className="h-12 w-auto object-contain mb-8"
          src="/logo.png"
        />
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-4 tracking-tight text-3xl md:text-4xl font-semibold">
          Analyzing Repository
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md text-sm md:text-base leading-relaxed">
          Please wait while OpenAI maps your project architecture and prepares the onboarding workspace.
        </p>
      </header>

      {/* Progressive loading container */}
      <ProgressSteps
        currentStep={currentStep}
        currentFile={currentFile}
        onCancel={handleCancel}
      />
    </main>
  );
}

export default function AnalyzePage() {
  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col items-center justify-center font-body-md selection:bg-surface-dim">
      <Suspense fallback={<div>Loading query parameters...</div>}>
        <AnalyzeContent />
      </Suspense>
    </div>
  );
}
