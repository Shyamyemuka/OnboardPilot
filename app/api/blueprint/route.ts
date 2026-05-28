import { NextResponse } from "next/server";
import { generateBlueprint } from "@/lib/codex";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { task, fileContext } = body;

    if (!task || !fileContext || typeof fileContext !== "object") {
      return NextResponse.json(
        { error: "Missing required parameters: task, fileContext" },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "No AI API key is configured on the server. Set OPENROUTER_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    const blueprint = await generateBlueprint(task, fileContext);
    return NextResponse.json(blueprint);
  } catch (error: any) {
    console.error("Error in /api/blueprint:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error during blueprint generation" },
      { status: 500 }
    );
  }
}
