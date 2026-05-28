"use client";

import { useState } from "react";
import { parseGitHubUrl } from "@/lib/utils";

interface UrlInputProps {
  onSubmit: (owner: string, repo: string, url: string, prNumber?: number) => void;
}

export default function UrlInput({ onSubmit }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = parseGitHubUrl(url.trim());
    if (!parsed) {
      setError("Please enter a valid public GitHub repository or pull request URL.");
      return;
    }

    onSubmit(parsed.owner, parsed.repo, url.trim(), parsed.prNumber);
  };

  const handleExampleSelect = (exampleUrl: string) => {
    setUrl(exampleUrl);
    setError(null);
  };

  return (
    <div className="w-full max-w-[600px] mt-8 flex flex-col items-center">
      <form onSubmit={handleSubmit} className="w-full relative">
        <div className="flex items-center bg-surface-container-lowest border border-surface-variant rounded focus-within:border-[#A3ABC4] transition-colors p-2 shadow-sm">
          <span className="material-symbols-outlined text-[#A3ABC4] ml-3 mr-2">link</span>
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            placeholder="https://github.com/organization/repository or /pull/123"
            className="tonal-input flex-1 bg-transparent border-none text-body-lg font-body-lg placeholder-outline-variant text-on-surface py-3 px-2 w-full focus:ring-0 focus:outline-none"
            autoComplete="off"
            spellCheck="false"
          />
          <button
            type="submit"
            className="bg-[#DEC29A] text-on-primary-fixed text-label-sm font-label-sm px-6 py-3 rounded-[2px] hover:bg-[#FCDEB5] transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap font-medium"
          >
            Start Pilot
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </form>

      {error && (
        <p className="text-error text-sm mt-3 w-full text-left flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </p>
      )}

      {/* Example Chips */}
      <div className="mt-8 flex flex-col items-center gap-4 w-full">
        <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider text-xs">
          Try an example
        </span>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => handleExampleSelect("https://github.com/microsoft/VibeVoice")}
            type="button"
            className="bg-surface-container text-on-surface-variant text-label-sm font-label-sm px-3 py-1.5 rounded-[2px] border border-transparent hover:border-[#A3ABC4] transition-all flex items-center gap-1.5 cursor-pointer text-xs font-medium"
          >
            <span className="material-symbols-outlined text-[14px] text-[#A3ABC4]">code</span>
            microsoft/VibeVoice
          </button>
          <button
            onClick={() => handleExampleSelect("https://github.com/expressjs/express")}
            type="button"
            className="bg-surface-container text-on-surface-variant text-label-sm font-label-sm px-3 py-1.5 rounded-[2px] border border-transparent hover:border-[#A3ABC4] transition-all flex items-center gap-1.5 cursor-pointer text-xs font-medium"
          >
            <span className="material-symbols-outlined text-[14px] text-[#A3ABC4]">speed</span>
            expressjs/express
          </button>
          <button
            onClick={() => handleExampleSelect("https://github.com/vercel/next.js")}
            type="button"
            className="bg-surface-container text-on-surface-variant text-label-sm font-label-sm px-3 py-1.5 rounded-[2px] border border-transparent hover:border-[#A3ABC4] transition-all flex items-center gap-1.5 cursor-pointer text-xs font-medium"
          >
            <span className="material-symbols-outlined text-[14px] text-[#A3ABC4]">bolt</span>
            vercel/next.js
          </button>
        </div>
      </div>
    </div>
  );
}
