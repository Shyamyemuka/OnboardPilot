"use client";

import { useRouter } from "next/navigation";
import UrlInput from "@/components/UrlInput";

export default function LandingPage() {
  const router = useRouter();

  const handleUrlSubmit = (owner: string, repo: string, url: string) => {
    // Navigate to /analyze with URL query parameters
    router.push(`/analyze?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&url=${encodeURIComponent(url)}`);
  };

  return (
    <div className="bg-surface-container-lowest text-on-surface font-body-md min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* TopNavBar Built from JSON */}
      <nav className="absolute top-0 w-full flex justify-between items-center h-16 px-4 md:px-16 max-w-7xl mx-auto border-b border-surface-variant bg-surface-container-lowest z-50">
        <div className="flex items-center gap-4">
          <img
            alt="OnboardPilot Logo"
            className="h-8 w-auto object-contain"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdb4c8InNQLgfEF-FTl6McOpe1Sr8KFpjFtV0_x3EiHtqpcjjVzw_xrHIybekvFQ78N-0JOP_FJ9n9bgaWR_gQikb1PmK7eVO76Ji2qc3_cfnkaevN9d97rKfciK0AzHhYsZozItcdaTc7leNIldoaHmshyZd7HIayv-ZnN8AkhCdwVzu1VBPY0yMxA8DcwIU2xVKvE1BVcS7MX7i_641D2oQDfSLqVla4eGuWl082B-5I2HDC-wz5yrJUf7i4Uebvenw-Mex0HZyq"
          />
        </div>
        <div className="hidden md:flex gap-8 items-center">
          <a className="text-on-surface-variant hover:text-on-surface transition-colors duration-200 text-label-sm font-label-sm text-xs font-semibold cursor-pointer">
            Docs
          </a>
          <a className="text-on-surface-variant hover:text-on-surface transition-colors duration-200 text-label-sm font-label-sm text-xs font-semibold cursor-pointer">
            Pricing
          </a>
        </div>
        <div className="flex items-center gap-4">
          <button className="hover:bg-surface-container-low transition-colors duration-200 p-2 rounded-full flex items-center justify-center opacity-80 hover:opacity-100 cursor-pointer">
            <span className="material-symbols-outlined text-[#A3ABC4]">account_circle</span>
          </button>
          <button className="bg-[#DEC29A] text-on-primary-fixed text-label-sm font-label-sm px-4 py-2 rounded-[2px] hover:bg-[#FCDEB5] transition-colors cursor-pointer text-xs font-semibold">
            Connect GitHub
          </button>
        </div>
      </nav>

      {/* Main Hero Content */}
      <main className="w-full max-w-[800px] px-4 md:px-16 flex flex-col items-center text-center mt-24 z-10 select-none pb-24 md:pb-0">
        {/* Logo Hero Area */}
        <div className="mb-8 flex flex-col items-center">
          <img
            alt="OnboardPilot Logo Main"
            className="w-48 h-auto mb-6 object-contain"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdb4c8InNQLgfEF-FTl6McOpe1Sr8KFpjFtV0_x3EiHtqpcjjVzw_xrHIybekvFQ78N-0JOP_FJ9n9bgaWR_gQikb1PmK7eVO76Ji2qc3_cfnkaevN9d97rKfciK0AzHhYsZozItcdaTc7leNIldoaHmshyZd7HIayv-ZnN8AkhCdwVzu1VBPY0yMxA8DcwIU2xVKvE1BVcS7MX7i_641D2oQDfSLqVla4eGuWl082B-5I2HDC-wz5yrJUf7i4Uebvenw-Mex0HZyq"
          />
          <h1 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-on-surface tracking-tight mb-4 text-3xl md:text-5xl font-light">
            Instant developer onboarding for any GitHub repository.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl text-sm md:text-base leading-relaxed">
            Enter a public GitHub repository URL to instantly generate docs, setup guides, and architectural overviews mapped to your environment.
          </p>
        </div>

        {/* Input Component */}
        <UrlInput onSubmit={handleUrlSubmit} />
      </main>

      {/* Footer Built from JSON */}
      <footer className="absolute bottom-0 w-full flex flex-col md:flex-row justify-between items-center py-6 px-4 md:px-16 max-w-7xl mx-auto border-t border-surface-variant bg-surface-container-lowest text-on-surface-variant text-label-sm font-label-sm text-xs font-medium">
        <div className="mb-4 md:mb-0">© 2026 OnboardPilot. Built for engineers.</div>
        <div className="flex gap-6">
          <a className="hover:text-on-surface transition-colors cursor-pointer">Privacy</a>
          <a className="hover:text-on-surface transition-colors cursor-pointer">Terms</a>
          <a className="hover:text-on-surface transition-colors cursor-pointer">Changelog</a>
          <a className="hover:text-on-surface transition-colors cursor-pointer" href="https://github.com" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </footer>

      {/* Subtle background noise/grid for "engineer" feel without cluttering */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.1] z-0"
        style={{
          backgroundImage: "radial-gradient(#A3ABC4 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      ></div>
    </div>
  );
}
