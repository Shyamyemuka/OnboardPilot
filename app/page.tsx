"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UrlInput from "@/components/UrlInput";
import { useAuth } from "@/context/AuthContext";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading, signInWithGitHub, logOut } = useAuth();

  const [pendingScan, setPendingScan] = useState<{ owner: string; repo: string; url: string; prNumber?: number } | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleUrlSubmit = (owner: string, repo: string, url: string, prNumber?: number) => {
    if (!user) {
      // User is not signed in -> show the soft warning popup/modal
      setPendingScan({ owner, repo, url, prNumber });
      setShowWarningModal(true);
      return;
    }

    // User is signed in -> proceed straight to analysis
    proceedToAnalysis(owner, repo, url, prNumber);
  };

  const proceedToAnalysis = (owner: string, repo: string, url: string, prNumber?: number) => {
    const prParam = prNumber ? `&pr=${encodeURIComponent(String(prNumber))}` : "";
    router.push(
      `/analyze?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&url=${encodeURIComponent(url)}${prParam}`
    );
  };

  const handleContinueAsGuest = () => {
    if (pendingScan) {
      proceedToAnalysis(pendingScan.owner, pendingScan.repo, pendingScan.url, pendingScan.prNumber);
    }
    setShowWarningModal(false);
  };

  const handleSignInAndProceed = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGitHub();
      // If sign in succeeds, the useEffect or current scope will have the user.
      // But wait! signInWithPopup returns, then user updates in state asynchronously.
      // To ensure they proceed directly, we will let them sign in, and then proceed
      // once authenticated. We can redirect them immediately with the pending scan params.
      if (pendingScan) {
        proceedToAnalysis(pendingScan.owner, pendingScan.repo, pendingScan.url, pendingScan.prNumber);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSigningIn(false);
      setShowWarningModal(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest text-on-surface font-body-md min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* TopNavBar */}
      <nav className="absolute top-0 w-full flex justify-between items-center h-16 px-4 md:px-16 max-w-7xl mx-auto border-b border-surface-variant bg-surface-container-lowest z-50">
        <div className="flex items-center cursor-pointer" onClick={() => router.push("/")}>
          <img
            alt="OnboardPilot Logo"
            className="h-10 w-auto object-contain select-none"
            src="/logo.png"
          />
        </div>

        {/* Dynamic Auth Header elements */}
        <div className="flex items-center gap-4">
          {loading ? (
            <span className="material-symbols-outlined text-[20px] text-[#A3ABC4] spinner-minimal">
              progress_activity
            </span>
          ) : user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-on-surface hover:text-[#DEC29A] transition-colors text-xs font-bold cursor-pointer uppercase tracking-wider flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">dashboard</span>
                Dashboard
              </button>
              <span className="text-border-subtle select-none">|</span>
              {/* User Avatar fetched from GitHub profile email profile pic */}
              <img
                alt={user.displayName || "User Profile"}
                className="h-8 w-8 rounded-full border border-border-subtle shadow-sm object-cover"
                src={user.photoURL || "https://lh3.googleusercontent.com/a/default-user=s80-p"}
                title={user.email || "Signed In"}
              />
              <button
                onClick={logOut}
                className="text-on-surface-variant hover:text-primary transition-colors text-xs font-bold cursor-pointer uppercase tracking-wider flex items-center gap-1.5"
              >
                Sign Out
                <span className="material-symbols-outlined text-[14px]">logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => signInWithGitHub()}
              className="bg-[#DEC29A] text-on-primary-fixed text-label-sm font-label-sm px-4 py-2 rounded-[2px] hover:bg-[#FCDEB5] transition-colors cursor-pointer text-xs font-semibold"
            >
              Sign In with GitHub
            </button>
          )}
        </div>
      </nav>

      {/* Main Hero Content */}
      <main className="w-full max-w-[800px] px-4 md:px-16 flex flex-col items-center text-center mt-24 z-10 select-none pb-24 md:pb-0">
        {/* Logo Hero Area */}
        <div className="mb-8 flex flex-col items-center">
          <img
            alt="OnboardPilot Logo Main"
            className="w-64 h-auto mb-6 object-contain"
            src="/logo.png"
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

      {/* Warning Guest Modal Overlay */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface-white border border-border-subtle rounded-xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up select-none">
            <button
              onClick={() => setShowWarningModal(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-primary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-[#FCDEB5]/30 border border-[#DEC29A]/30 flex items-center justify-center text-[#574325] mb-4 shadow-sm">
                <span className="material-symbols-outlined text-[24px]">key</span>
              </div>

              <h3 className="text-lg font-semibold text-on-surface mb-2">
                Unsaved Guest Session
              </h3>
              <p className="text-text-muted text-xs md:text-sm leading-relaxed mb-6">
                You are currently running in **Guest Mode**. Your analysis guide and Copilot chat history will be active for this session but **will not be saved** to your account history.
              </p>

              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={handleSignInAndProceed}
                  disabled={isSigningIn}
                  className="w-full bg-[#DEC29A] text-on-primary-fixed text-xs font-bold py-3 rounded hover:bg-[#FCDEB5] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-75"
                >
                  {isSigningIn ? (
                    <span className="material-symbols-outlined text-[16px] spinner-minimal">
                      progress_activity
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">login</span>
                  )}
                  Sign In with GitHub & Save
                </button>
                <button
                  onClick={handleContinueAsGuest}
                  className="w-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-bold py-3 rounded transition-colors cursor-pointer"
                >
                  Continue as Guest
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="absolute bottom-0 w-full flex flex-col md:flex-row justify-between items-center py-6 px-4 md:px-16 max-w-7xl mx-auto border-t border-surface-variant bg-surface-container-lowest text-on-surface-variant text-label-sm font-label-sm text-xs font-medium select-none">
        <div className="mb-4 md:mb-0">© 2026 OnboardPilot. Built for engineers.</div>
        <div className="flex gap-6">
          <a
            onClick={() => router.push("/how-it-works")}
            className="hover:text-on-surface transition-colors cursor-pointer font-bold text-[#DEC29A] hover:underline"
          >
            How it works
          </a>
        </div>
      </footer>

      {/* Background Noise Grid */}
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
