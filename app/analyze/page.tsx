"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProgressSteps from "@/components/ProgressSteps";
import { getFileTree, selectKeyFiles, getFileContent } from "@/lib/github";
import { generateSessionId } from "@/lib/utils";

function AnalyzeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const owner = searchParams.get("owner") || "";
  const repo = searchParams.get("repo") || "";
  const url = searchParams.get("url") || "";

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
        const keyPaths = selectKeyFiles(fullTree);

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

        // Step 4: AI analysis call
        if (isCancelled) return;
        setCurrentStep(4);
        setCurrentFile("Communicating with OpenAI...");
        const analyzeRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner,
            repo,
            fileTree: fullTree,
            keyFiles: fileContents,
          }),
        });

        if (!analyzeRes.ok) {
          const errData = await analyzeRes.json().catch(() => ({}));
          throw new Error(errData.error || "AI analysis failed.");
        }

        const guideJSON = await analyzeRes.json();

        // Step 5: Save & Navigate
        if (isCancelled) return;
        setCurrentStep(5);
        setCurrentFile("Wrapping up onboarding playbook...");

        const sessionId = generateSessionId();

        // Save in sessionStorage
        sessionStorage.setItem(`onboardpilot_analysis_${sessionId}`, JSON.stringify(guideJSON));
        sessionStorage.setItem(`onboardpilot_context_${sessionId}`, JSON.stringify(fileContents));
        sessionStorage.setItem(
          `onboardpilot_repo_${sessionId}`,
          JSON.stringify({ owner, repo, url })
        );

        router.push(`/guide/${sessionId}`);
      } catch (err: any) {
        if (isCancelled) return;
        console.error(err);

        let friendlyMessage = "Failed to analyze repository. Please try again.";
        if (err.message === "REPO_NOT_FOUND") {
          friendlyMessage = "Repository not found or is private. Make sure it's a public GitHub repo.";
        } else if (err.message === "RATE_LIMITED") {
          friendlyMessage = "GitHub API rate limit hit. Please try again in a few minutes or configure GITHUB_PAT.";
        } else if (err.message === "GITHUB_ERROR") {
          friendlyMessage = "Failed to communicate with GitHub. Check your network or repository name.";
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
            We ran into an issue parsing the codebase repository.
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
          className="h-16 w-auto object-contain mb-8"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdb4c8InNQLgfEF-FTl6McOpe1Sr8KFpjFtV0_x3EiHtqpcjjVzw_xrHIybekvFQ78N-0JOP_FJ9n9bgaWR_gQikb1PmK7eVO76Ji2qc3_cfnkaevN9d97rKfciK0AzHhYsZozItcdaTc7leNIldoaHmshyZd7HIayv-ZnN8AkhCdwVzu1VBPY0yMxA8DcwIU2xVKvE1BVcS7MX7i_641D2oQDfSLqVla4eGuWl082B-5I2HDC-wz5yrJUf7i4Uebvenw-Mex0HZyq"
        />
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-4 tracking-tight text-3xl md:text-4xl font-semibold">
          Analyzing Repository
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md text-sm md:text-base leading-relaxed">
          Please wait while OpenAI maps your project architecture and generates comprehensive documentation.
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
