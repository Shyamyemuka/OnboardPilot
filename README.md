# OnboardPilot

**AI-powered onboarding guides for unfamiliar GitHub repositories.**

OnboardPilot turns a public GitHub repo URL into a structured developer onboarding workspace: architecture summary, important folders, must-read files, core modules, a visual workflow, starter tasks, and a chat panel for follow-up questions.

Built for the **OpenAI x Outskill AI Builders Hackathon**.

## Demo Flow

1. Paste a public GitHub repository URL.
2. OnboardPilot fetches the repo tree and selects the most useful files.
3. OpenAI analyzes the codebase and returns a structured onboarding guide.
4. The app renders a clean developer workspace with diagrams, file notes, and starter tasks.
5. Ask questions in the built-in copilot chat.
6. Sign in with GitHub to save scan history, or continue as a guest with browser session storage.

## What It Shows

- **Architecture overview**: plain-English explanation of how the repo is organized.
- **Visual workflow**: Mermaid diagram generated from the codebase.
- **Directory breakdown**: important folders explained in context.
- **Key files**: the files a new contributor should read first.
- **Core modules**: major parts of the system grouped by responsibility.
- **Starter tasks**: beginner-friendly tasks with relevant files attached.
- **Copilot chat**: follow-up Q&A grounded in the generated guide.
- **Markdown export**: download the onboarding guide as a `.md` file.
- **Optional saved history**: GitHub sign-in stores previous scans in Firebase.

## AI Setup

OpenAI is the primary AI provider.

The app uses the OpenAI Responses API with:

```env
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4.1
```

Because hackathon API credits can run out while testing, Gemini is included as a backup provider. If the OpenAI request fails because of quota, billing, model access, or another API error, the server automatically retries the same analysis or chat request with Gemini.

```env
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
```

All AI calls stay server-side in `app/api/*`. No API keys are exposed to the browser.

## Tech Stack

- **Next.js 15.3.8** with App Router
- **TypeScript 5.8**
- **Tailwind CSS 4.1**
- **OpenAI Responses API** as the primary AI provider
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
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4.1
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
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

For the hackathon demo, the minimum required variables are `OPENAI_API_KEY`, `OPENAI_MODEL`, `GEMINI_API_KEY`, and `GEMINI_MODEL`.

## Current Limits

- Public GitHub repositories only.
- Large repos are analyzed through a prioritized subset of key files.
- Guest sessions stay in the browser. Sign in with GitHub to save scan history.

## License

MIT
