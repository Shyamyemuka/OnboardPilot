# OnboardPilot

**AI-powered onboarding guides for unfamiliar GitHub repositories.**

OnboardPilot turns a public GitHub repo or pull request URL into a structured developer onboarding workspace: architecture summary, important folders, must-read files, core modules, visual workflows, starter tasks, code-change blueprints, and a chat panel for follow-up questions.

Built for the **OpenAI x Outskill AI Builders Hackathon**.

## Demo Flow

1. Paste a public GitHub repository URL or pull request URL.
2. OnboardPilot fetches the repo tree and selects the most useful files.
3. If the URL is a PR, OnboardPilot also fetches the PR diff and explains the change in context.
4. OpenAI analyzes the codebase and returns a structured onboarding guide.
5. The app renders a clean developer workspace with diagrams, file notes, dependency tracing, and starter tasks.
6. Click **Generate Blueprint** on a starter task to simulate a first pull request.
7. Ask questions in the built-in copilot chat.
8. Sign in with GitHub to save scan history, or continue as a guest with browser session storage.

## What It Shows

- **Architecture overview**: plain-English explanation of how the repo is organized.
- **Visual workflow**: Mermaid diagram generated from the codebase.
- **Interactive dependency graph**: click a file node to trace imports and reverse dependencies.
- **Directory breakdown**: important folders explained in context.
- **Key files**: the files a new contributor should read first.
- **Core modules**: major parts of the system grouped by responsibility.
- **Starter tasks**: beginner-friendly tasks with relevant files attached.
- **Code Change Blueprint**: a mock PR view with original vs proposed code, inline explanations, and a verification checklist.
- **PR onboarding mode**: paste a pull request URL to generate an onboarding guide focused on that change.
- **Copilot chat**: follow-up Q&A grounded in the generated guide.
- **Markdown export**: download the onboarding guide as a `.md` file.
- **Optional saved history**: GitHub sign-in stores previous scans in Firebase.

## AI Setup

OpenRouter is the recommended primary provider for the demo. If you are using a **free OpenRouter API token** (with a $0 balance), you can route your requests through highly capable free models like Qwen 3 Coder.

Use:

```env
OPENROUTER_API_KEY=sk-or-your-openrouter-api-key
OPENROUTER_MODEL=qwen/qwen3-coder:free
NEXT_PUBLIC_APP_URL=https://your-vercel-url.vercel.app
```

If `OPENROUTER_API_KEY` is not set, the app falls back to the official OpenAI API:

```env
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=codex-mini-latest
```

Because API credits can run out while testing, Gemini is included as a backup provider. If the primary request fails because of quota, billing, model access, high demand, or another API error (e.g. attempting to call a paid model with a free OpenRouter token), the server automatically retries the same analysis or chat request with Gemini.

```env
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
```

All AI calls stay server-side in `app/api/*`. No API keys are exposed to the browser. Detailed logs about model routing and fallback transitions are output to the server terminal.

## Tech Stack

- **Next.js 15.3.8** with App Router
- **TypeScript 5.8**
- **Tailwind CSS 4.1**
- **OpenRouter / OpenAI-compatible API** as the primary AI provider
- **Gemini API** as the fallback AI provider
- **GitHub REST API** for public repository ingestion
- **Mermaid** for generated workflow diagrams
- **Firebase Auth + Firestore** for optional saved scan history
- **Vercel** for deployment

## Local Setup

```bash
git clone https://github.com/Shyamyemuka/OnboardPilot.git
cd OnboardPilot
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Required for AI:

```env
OPENROUTER_API_KEY=sk-or-your-openrouter-api-key
OPENROUTER_MODEL=qwen/qwen3-coder:free
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=codex-mini-latest
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
NEXT_PUBLIC_APP_URL=https://your-vercel-url.vercel.app
```

Optional for higher GitHub API limits:

```env
GITHUB_PAT=ghp_your_github_personal_access_token
```

Optional for saved scan history:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import the project into Vercel.
3. Add the environment variables listed above in Vercel Project Settings.
4. Deploy.

For the hackathon demo, the minimum recommended variables are `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `GEMINI_API_KEY`, and `GEMINI_MODEL`.

## Current Limits

- Public GitHub repositories only.
- Large repos are analyzed through a prioritized subset of key files.
- Guest sessions stay in the browser. Sign in with GitHub to save scan history.

## License

MIT
