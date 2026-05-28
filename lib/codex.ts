import OpenAI from "openai";
import { ANALYSIS_SYSTEM_PROMPT, BLUEPRINT_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT } from "./prompts";
import { parseCodexJSON } from "./utils";
import type { BlueprintJSON, GuideJSON } from "@/types";

// Fallback dummy key to prevent Next.js static analysis crash during npm run build
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-static-builds" });
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "dummy-key-for-static-builds",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "OnboardPilot",
  },
});
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4.1";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

type GeminiGenerateContentResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
  error?: {
    message?: string;
  };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

function isTemporaryProviderError(error: unknown): boolean {
  const status = getErrorStatus(error);
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    status === 429 ||
    status === 503 ||
    message.includes("429") ||
    message.includes("503") ||
    message.includes("rate limit") ||
    message.includes("high demand") ||
    message.includes("service unavailable") ||
    message.includes("overloaded")
  );
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  const delays = [800, 1800];
  let lastError: unknown;

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTemporaryProviderError(error) || attempt === delays.length) {
        break;
      }
      await sleep(delays[attempt]);
    }
  }

  throw lastError;
}

async function callOpenAI(instructions: string, input: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API Key is not configured on the server.");
  }

  const response = await withRetry(() =>
    openai.responses.create({
      model: OPENAI_MODEL,
      instructions,
      input,
    })
  );

  const outputText = response.output_text;
  if (!outputText) {
    throw new Error("Empty response from OpenAI API");
  }

  return outputText;
}

async function callOpenRouter(instructions: string, input: string): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API Key is not configured on the server.");
  }

  const response = await withRetry(() =>
    openrouter.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: input },
      ],
    })
  );

  const outputText = response.choices[0]?.message?.content?.trim();
  if (!outputText) {
    throw new Error("Empty response from OpenRouter API");
  }

  return outputText;
}

async function callGemini(instructions: string, input: string): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error("Gemini API Key is not configured on the server.");
  }

  const response = await withRetry(async () => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiApiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: instructions }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: input }],
            },
          ],
        }),
      }
    );

    if (!res.ok) {
      const errorData = (await res.json().catch(() => ({}))) as GeminiGenerateContentResponse;
      const error = new Error(errorData.error?.message || "Gemini API request failed") as Error & {
        status?: number;
      };
      error.status = res.status;
      throw error;
    }

    return res;
  });

  const data = (await response.json()) as GeminiGenerateContentResponse;
  const outputText = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!outputText) {
    throw new Error("Empty response from Gemini API");
  }

  return outputText;
}

async function generateWithFallback(instructions: string, input: string): Promise<string> {
  let primaryError: unknown;

  try {
    if (process.env.OPENROUTER_API_KEY) {
      return await callOpenRouter(instructions, input);
    }
    return await callOpenAI(instructions, input);
  } catch (error) {
    primaryError = error;
    console.warn("Primary AI provider failed; attempting Gemini fallback:", primaryError);

    try {
      return await callGemini(instructions, input);
    } catch (geminiError) {
      console.error("Gemini fallback failed:", geminiError);

      if (isTemporaryProviderError(primaryError) && isTemporaryProviderError(geminiError)) {
        throw new Error("Both AI providers are temporarily busy. Please retry in a minute.");
      }

      if (!process.env.GEMINI_API_KEY) {
        throw primaryError;
      }
      throw geminiError;
    }
  }
}

export async function analyzeRepo(
  fileTree: string[],
  keyFiles: Record<string, string>,
  prNumber?: number
): Promise<GuideJSON> {
  const input = `
MODE:
${prNumber ? `Pull Request onboarding for PR #${prNumber}. Explain how the diff changes the existing architecture.` : "Repository onboarding."}

FILE TREE:
${fileTree.join("\n")}

KEY FILE CONTENTS:
${Object.entries(keyFiles)
  .map(([path, content]) => `\n--- ${path} ---\n${content}`)
  .join("\n")}
`.trim();

  const outputText = await generateWithFallback(ANALYSIS_SYSTEM_PROMPT, input);

  return parseCodexJSON<GuideJSON>(outputText);
}

export async function chatWithRepo(
  messages: { role: "user" | "assistant"; content: string }[],
  repoName: string,
  analysisJSON: string
): Promise<string> {
  // Cap history at last 10 messages to avoid context overflow
  const recentMessages = messages.slice(-10);

  const conversationText = recentMessages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  return generateWithFallback(CHAT_SYSTEM_PROMPT(repoName, analysisJSON), conversationText);
}

export async function generateBlueprint(
  task: { title: string; difficulty: string; files: string[]; description: string },
  fileContext: Record<string, string>
): Promise<BlueprintJSON> {
  const input = `
STARTER TASK:
${JSON.stringify(task, null, 2)}

RELEVANT FILES:
${Object.entries(fileContext)
  .map(([path, content]) => `\n--- ${path} ---\n${content}`)
  .join("\n")}
`.trim();

  const outputText = await generateWithFallback(BLUEPRINT_SYSTEM_PROMPT, input);
  return parseCodexJSON<BlueprintJSON>(outputText);
}
