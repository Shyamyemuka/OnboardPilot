"use client";

import { useEffect, useState } from "react";

interface ProgressStepsProps {
  currentStep: number; // 1 to 5
  currentFile?: string;
  onCancel?: () => void;
}

export default function ProgressSteps({ currentStep, currentFile, onCancel }: ProgressStepsProps) {
  const [dots, setDots] = useState(".");

  // Simulating small text pulsing / typing animation for active states
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    { number: 1, label: "Fetching repository structure..." },
    { number: 2, label: "Identifying key files..." },
    { number: 3, label: "Reading core modules..." },
    { number: 4, label: "Codex is analyzing..." },
    { number: 5, label: "Building your guide..." },
  ];

  // Calculate percentage for top progress bar
  const progressPercent = Math.min(((currentStep - 1) / steps.length) * 100 + 10, 100);

  return (
    <div className="w-full max-w-[600px] bg-surface-white border border-border-subtle rounded-xl p-8 relative overflow-hidden shadow-[0_4px_20px_rgba(15,23,42,0.03)]">
      {/* Overall Progress Bar (Top Edge) */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-surface-container-high">
        <div
          className="h-full bg-[#DEC29A] transition-all duration-1000 ease-out"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      {/* Steps List */}
      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-px before:bg-gradient-to-b before:from-border-subtle before:via-border-subtle before:to-transparent">
        {steps.map((step) => {
          const isCompleted = currentStep > step.number;
          const isActive = currentStep === step.number;
          const isPending = currentStep < step.number;

          return (
            <div
              key={step.number}
              className={`relative flex items-start gap-6 group transition-opacity duration-300 ${
                isPending ? "opacity-40" : "opacity-100"
              }`}
            >
              {/* Step indicator node */}
              <div className="z-10 shrink-0">
                {isCompleted ? (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-white border border-border-subtle text-green-500 font-bold transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-[14px] text-[#A3ABC4] font-bold">check</span>
                  </div>
                ) : isActive ? (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-white border-2 border-[#DEC29A] transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-[14px] text-[#DEC29A] spinner-minimal font-bold">
                      progress_activity
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-container-low border border-border-subtle">
                    <span className="w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
                  </div>
                )}
              </div>

              {/* Step text detail */}
              <div className={`flex flex-col pt-0.5 ${isActive ? "step-active-text" : ""}`}>
                <span
                  className={`font-label-sm text-label-sm uppercase tracking-wider mb-1 text-[11px] font-bold ${
                    isActive ? "text-[#DEC29A]" : "text-on-surface-variant"
                  }`}
                >
                  Step {step.number}
                </span>
                <span
                  className={`font-body-md text-body-md ${
                    isActive
                      ? "text-[#DEC29A] font-semibold"
                      : isCompleted
                      ? "text-[#A3ABC4]"
                      : "text-on-surface-variant"
                  }`}
                >
                  {step.label}
                  {isActive && dots}
                </span>

                {/* Subtext info for Active modules */}
                {isActive && currentFile && (
                  <div className="mt-2">
                    <span className="font-mono-code text-mono-code text-text-muted text-xs bg-surface-container-low px-2 py-1 rounded inline-block">
                      {currentFile}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {onCancel && (
        <div className="mt-12 text-center">
          <button
            onClick={onCancel}
            className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors border-b border-transparent hover:border-border-subtle pb-1 uppercase tracking-wider text-xs cursor-pointer"
          >
            Cancel Analysis
          </button>
        </div>
      )}
    </div>
  );
}
