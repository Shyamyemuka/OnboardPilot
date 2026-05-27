import { NextResponse } from "next/server";
import { chatWithRepo } from "@/lib/codex";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, repoName, analysisJSON } = body;

    if (!messages || !Array.isArray(messages) || !repoName || !analysisJSON) {
      return NextResponse.json(
        { error: "Missing required parameters: messages, repoName, analysisJSON" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "No AI API key is configured on the server. Set OPENAI_API_KEY or GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    const reply = await chatWithRepo(messages, repoName, analysisJSON);
    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error during chat interaction" },
      { status: 500 }
    );
  }
}
