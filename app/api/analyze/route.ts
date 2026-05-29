import { analyzeRepo } from "@/lib/codex";
import { NextResponse } from "next/server";

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

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) => {
          controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
        };

        try {
          const analysis = await analyzeRepo(fileTree, keyFiles, prNumber, (statusMessage) => {
            send({ type: "status", message: statusMessage });
          });
          send({ type: "result", data: analysis });
        } catch (error: any) {
          console.error("Error inside analyzeRepo stream start:", error);
          send({ type: "error", error: error?.message || "Analysis failed" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Error in /api/analyze:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error during repository analysis" },
      { status: 500 }
    );
  }
}
