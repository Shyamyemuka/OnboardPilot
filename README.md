# OnboardPilot

**The day you join a new codebase is the loneliest day in software engineering. OnboardPilot fixes that.**

OnboardPilot takes any public GitHub repository URL and generates a personalized developer onboarding guide — architecture breakdown, annotated key files, core module explanations, and suggested first tasks — powered by OpenAI Codex. Then lets you chat with it.

Built for the **OpenAI x Outskill AI Builders Hackathon** (May 2026).

---

## What It Does

Paste a GitHub URL. Get back:

- **Architecture Overview** — plain-English summary of what the project is and how it's structured
- **Annotated Directory Breakdown** — every important folder explained in one line
- **Key Files** — the files you actually need to read first, and why
- **Core Modules** — grouped by concern (auth, routing, data layer, utils...)
- **Suggested First Tasks** — beginner-tagged starting points with relevant files linked
- **Q&A Chat** — ask any follow-up question about the codebase, answered using the full repo context

---

## Tech Stack

- **Next.js 15.3.2** — App Router, API routes
- **TypeScript 5.8**
- **OpenAI Codex** (`codex-mini-latest`) — core intelligence
- **GitHub REST API v3** — repo fetching
- **Tailwind CSS 4.1**
- **Vercel** — deployment

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- OpenAI API key with Codex access

### Setup

```bash
# Clone the repo
git clone https://github.com/your-username/onboardpilot
cd onboardpilot

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Add your OPENAI_API_KEY to .env.local

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```env
# Required
OPENAI_API_KEY=sk-...

# Optional — increases GitHub API rate limit from 60 to 5000 req/hr
GITHUB_PAT=ghp_...
```

---

## Usage

1. Go to the app
2. Paste any public GitHub repository URL (e.g., `https://github.com/fastapi/fastapi`)
3. Wait ~30–45 seconds for Codex to analyze the codebase
4. Read your custom onboarding guide
5. Ask follow-up questions in the chat panel

---

## Project Structure

```
onboardpilot/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── analyze/page.tsx          # Analysis loading + pipeline
│   ├── guide/[sessionId]/        # Guide + chat
│   └── api/
│       ├── analyze/route.ts      # Codex analysis endpoint
│       └── chat/route.ts         # Codex Q&A endpoint
├── components/                   # UI components
├── lib/
│   ├── github.ts                 # GitHub API helpers
│   ├── codex.ts                  # Codex API helpers
│   ├── prompts.ts                # System prompts
│   └── utils.ts                  # Utilities
└── types/index.ts                # TypeScript types
```

---

## Deploy to Vercel

```bash
pnpm build       # Verify build locally first
vercel deploy    # Or push to GitHub and connect in Vercel dashboard
```

Add `OPENAI_API_KEY` in Vercel → Project Settings → Environment Variables.

---

## Limitations (v1)

- Public repositories only (no private repo support)
- Very large repos (10,000+ files) are analyzed using a prioritized subset of ~35 key files
- No persistent history — sessions are browser-scoped

---

## License

MIT
