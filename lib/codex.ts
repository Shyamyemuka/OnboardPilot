import OpenAI from "openai";
import { ANALYSIS_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT } from "./prompts";
import { parseCodexJSON } from "./utils";
import type { GuideJSON } from "@/types";

// Fallback dummy key to prevent Next.js static analysis crash during npm run build
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-static-builds" });
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1";
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

async function callOpenAI(instructions: string, input: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API Key is not configured on the server.");
  }

  const response = await openai.responses.create({
    model: OPENAI_MODEL,
    instructions,
    input,
  });

  const outputText = response.output_text;
  if (!outputText) {
    throw new Error("Empty response from OpenAI API");
  }

  return outputText;
}

async function callGemini(instructions: string, input: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API Key is not configured on the server.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
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

  const data = (await response.json()) as GeminiGenerateContentResponse;
  if (!response.ok) {
    throw new Error(data.error?.message || "Gemini API request failed");
  }

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
  try {
    return await callOpenAI(instructions, input);
  } catch (openAIError) {
    console.warn("OpenAI API failed; attempting Gemini fallback:", openAIError);

    try {
      return await callGemini(instructions, input);
    } catch (geminiError) {
      console.error("Gemini fallback failed:", geminiError);

      if (!process.env.GEMINI_API_KEY) {
        throw openAIError;
      }
      throw geminiError;
    }
  }
}

export async function analyzeRepo(
  fileTree: string[],
  keyFiles: Record<string, string>
): Promise<GuideJSON> {
  const input = `
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
