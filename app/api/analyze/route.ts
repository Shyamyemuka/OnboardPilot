import { NextResponse } from "next/server";
import { analyzeRepo } from "@/lib/codex";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { owner, repo, fileTree, keyFiles, prNumber } = body;

    if (!owner || !repo || !fileTree || !keyFiles) {
      return NextResponse.json(
        { error: "Missing required parameters: owner, repo, fileTree, keyFiles" },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "No AI API key is configured on the server. Set OPENROUTER_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    const analysis = await analyzeRepo(fileTree, keyFiles, prNumber);
    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("Error in /api/analyze:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error during repository analysis" },
      { status: 500 }
    );
  }
}
