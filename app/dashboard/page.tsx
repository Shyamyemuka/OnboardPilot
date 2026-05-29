"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { SessionDocument } from "@/lib/db";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, signInWithGitHub, logOut } = useAuth();
  const [sessions, setSessions] = useState<SessionDocument[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Redirect to home if not signed in
      router.push("/");
      return;
    }

    async function loadSessions() {
      if (!user) return;
      try {
        const res = await fetch(`/api/db?uid=${encodeURIComponent(user.uid)}`);
        const data = await res.json();
        setSessions(data.sessions || []);
      } catch (err) {
        console.error("Error loading dashboard sessions:", err);
      } finally {
        setFetching(false);
      }
    }

    loadSessions();
  }, [user, loading, router]);

  if (loading || (user && fetching)) {
    return (
      <div className="bg-surface-container-lowest text-on-surface min-h-screen flex items-center justify-center font-body-md select-none text-center">
        <div className="flex flex-col items-center">
          <span className="material-symbols-outlined text-[48px] text-[#DEC29A] spinner-minimal mb-4">
            progress_activity
          </span>
          <p className="text-body-lg text-text-muted">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest text-on-surface font-body-md min-h-screen flex flex-col relative overflow-hidden">
      {/* TopNavBar */}
      <nav className="w-full flex justify-between items-center h-16 px-4 md:px-16 max-w-7xl mx-auto border-b border-surface-variant bg-surface-container-lowest z-50">
        <div className="flex items-center cursor-pointer" onClick={() => router.push("/")}>
          <img
            alt="OnboardPilot Logo"
            className="h-10 w-auto object-contain select-none"
            src="/logo.png"
          />
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/")}
                className="bg-primary text-white border border-transparent px-4 py-2 rounded text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                New Scan
              </button>
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
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-16 py-12 z-10">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-display-lg-mobile md:text-headline-lg font-display-lg font-bold tracking-tight text-on-surface mb-2">
              My Dashboard
            </h1>
            <p className="text-text-muted text-xs md:text-sm font-medium">
              Manage and resume your previous repository onboarding workspaces.
            </p>
          </div>
          <div className="text-xs text-text-muted font-mono bg-surface-container px-3 py-1.5 rounded border border-border-subtle">
            Logged in as: <span className="font-semibold text-on-surface">{user?.email}</span>
          </div>
        </header>

        {sessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => router.push(`/guide/${session.id}`)}
                className="bg-surface border border-border-subtle hover:border-[#DEC29A] hover:shadow-md transition-all rounded-xl p-5 cursor-pointer flex flex-col justify-between group h-48"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="bg-secondary-container/20 text-[#0051d5] border border-secondary-container/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                      {session.analysis.language || "Unknown"}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-semibold text-body-lg text-on-surface truncate group-hover:text-primary transition-colors">
                    {session.repoName}
                  </h3>
                  <p className="text-text-muted text-xs truncate mb-4">
                    {session.repoOwner}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-border-subtle/55 pt-3 mt-auto">
                  <span className="text-[11px] text-text-muted font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">chat_bubble_outline</span>
                    {session.messages?.length || 0} messages
                  </span>
                  <span className="text-xs font-bold text-primary flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Open Guide
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 border border-dashed border-border-subtle rounded-2xl bg-surface text-center flex flex-col items-center max-w-lg mx-auto mt-12">
            <div className="w-16 h-16 rounded-full bg-[#FCDEB5]/30 border border-[#DEC29A]/30 flex items-center justify-center text-[#574325] mb-6 shadow-sm">
              <span className="material-symbols-outlined text-[32px]">folder_zip</span>
            </div>
            <h3 className="text-headline-md font-semibold text-on-surface mb-2 select-none">
              No Scans Yet
            </h3>
            <p className="text-text-muted text-sm leading-relaxed mb-8 max-w-xs">
              You haven't scanned any public repositories. Let's analyze a repository to generate your first interactive developer onboarding blueprint!
            </p>
            <button
              onClick={() => router.push("/")}
              className="bg-primary text-white text-xs font-bold px-6 py-3 rounded hover:bg-slate-800 transition-colors cursor-pointer shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Scan Repository
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full flex flex-col md:flex-row justify-between items-center py-6 px-4 md:px-16 max-w-7xl mx-auto border-t border-surface-variant bg-surface-container-lowest text-on-surface-variant text-label-sm font-label-sm text-xs font-medium select-none mt-auto">
        <div>© 2026 OnboardPilot. Built for engineers.</div>
        <div className="flex gap-6 mt-4 md:mt-0">
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
