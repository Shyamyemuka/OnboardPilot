import OpenAI from "openai";
import { ANALYSIS_SYSTEM_PROMPT, BLUEPRINT_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT, THEME_EXPLAIN_SYSTEM_PROMPT, REGENERATE_SECTION_SYSTEM_PROMPT } from "./prompts";
import { parseCodexJSON } from "./utils";
import type { BlueprintJSON, GuideJSON } from "@/types";

// Helper functions to dynamically instantiate clients at runtime, preventing Next.js build-time static evaluation
function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-static-builds",
    timeout: 15000,
    maxRetries: 0,
  });
}

function getOpenRouterClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || "dummy-key-for-static-builds",
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "OnboardPilot",
    },
    timeout: 15000,
    maxRetries: 0,
  });
}

function getOpenRouterClientNoTimeout(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || "dummy-key-for-static-builds",
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "OnboardPilot",
    },
    maxRetries: 0,
  });
}
const OPENAI_MODEL = process.env.OPENAI_MODEL || "codex-mini-latest";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "qwen/qwen3-coder:free";
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
  const delays = [500];
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

  console.log(`[AI] Calling OpenAI with model: ${OPENAI_MODEL}`);
  const response = await withRetry(() =>
    getOpenAIClient().responses.create({
      model: OPENAI_MODEL,
      instructions,
      input,
    })
  );

  const outputText = response.output_text;
  if (!outputText) {
    throw new Error("Empty response from OpenAI API");
  }

  console.log(`[AI] OpenAI request successful.`);
  return outputText;
}

async function callOpenRouter(instructions: string, input: string): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API Key is not configured on the server.");
  }

  console.log(`[AI] Calling OpenRouter with model: ${OPENROUTER_MODEL}`);
  const response = await withRetry(() =>
    getOpenRouterClient().chat.completions.create({
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

  console.log(`[AI] OpenRouter request successful.`);
  return outputText;
}

async function callOpenRouterNoTimeout(instructions: string, input: string): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API Key is not configured on the server.");
  }

  console.log(`[AI] Calling OpenRouter (No Timeout) with model: ${OPENROUTER_MODEL}`);
  const response = await withRetry(() =>
    getOpenRouterClientNoTimeout().chat.completions.create({
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

  console.log(`[AI] OpenRouter (No Timeout) request successful.`);
  return outputText;
}

async function callGemini(instructions: string, input: string): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error("Gemini API Key is not configured on the server.");
  }

  console.log(`[AI] Calling Gemini fallback with model: ${GEMINI_MODEL}`);
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

  console.log(`[AI] Gemini fallback request successful.`);
  return outputText;
}

async function generateWithFallback(
  instructions: string,
  input: string,
  onStatus?: (message: string) => void
): Promise<string> {
  // Level 1: OpenRouter (with 15s limit) / OpenAI
  try {
    if (process.env.OPENROUTER_API_KEY) {
      onStatus?.(`OpenRouter is being used (${OPENROUTER_MODEL})`);
      return await callOpenRouter(instructions, input);
    }
    onStatus?.(`OpenAI is being used (${OPENAI_MODEL})`);
    return await callOpenAI(instructions, input);
  } catch (err1) {
    console.warn(`[AI] Level 1 AI provider failed. Error: ${err1}. Attempting Gemini fallback (Level 2)...`);

    // Level 2: Gemini
    onStatus?.(`Gemini is being used (${GEMINI_MODEL})`);
    try {
      return await callGemini(instructions, input);
    } catch (err2) {
      console.warn(`[AI] Level 2 Gemini failed. Error: ${err2}. Attempting OpenRouter No Timeout (Level 3)...`);

      // Level 3: OpenRouter (No Timeout)
      try {
        if (process.env.OPENROUTER_API_KEY) {
          onStatus?.(`OpenRouter No-Timeout is being used (${OPENROUTER_MODEL})`);
          return await callOpenRouterNoTimeout(instructions, input);
        }
        throw new Error("OpenRouter key not available for no-timeout retry");
      } catch (err3) {
        console.warn(`[AI] Level 3 OpenRouter No-Timeout failed. Error: ${err3}. Attempting Gemini retry (Level 4)...`);

        // Level 4: Gemini (Final retry)
        onStatus?.(`Gemini retry is being used (${GEMINI_MODEL})`);
        try {
          return await callGemini(instructions, input);
        } catch (err4) {
          console.error(`[AI] All AI providers failed. final error: ${err4}`);
          throw new Error("Both AI models are temporarily out of API credits or service limits. Please wait and try again.");
        }
      }
    }
  }
}

export async function analyzeRepo(
  fileTree: string[],
  keyFiles: Record<string, string>,
  prNumber?: number,
  onStatus?: (message: string) => void
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

  const outputText = await generateWithFallback(ANALYSIS_SYSTEM_PROMPT, input, onStatus);

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

export async function generateThemeExplanation(
  theme: string,
  analysisJSON: string
): Promise<any> {
  const instructions = THEME_EXPLAIN_SYSTEM_PROMPT(theme, analysisJSON);
  const input = `Explain this repository within the context/theme of the movie or show: ${theme}`;
  const outputText = await generateWithFallback(instructions, input);
  return parseCodexJSON<any>(outputText);
}

export async function regenerateSection(
  section: string,
  repoName: string,
  analysisJSON: string
): Promise<any> {
  const instructions = REGENERATE_SECTION_SYSTEM_PROMPT(section, repoName, analysisJSON);
  const input = `Regenerate the ${section} section for repository: ${repoName}`;
  const outputText = await generateWithFallback(instructions, input);
  return parseCodexJSON<any>(outputText);
}
