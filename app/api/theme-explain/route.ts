import { NextResponse } from "next/server";
import { generateThemeExplanation } from "@/lib/codex";
import { updateSessionTheme } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { theme, analysisJSON, sessionId, reset } = body;

    // Handle resetting the theme on the server side
    if (reset && sessionId) {
      try {
        await updateSessionTheme(sessionId, null);
        return NextResponse.json({ success: true });
      } catch (dbErr: any) {
        console.error("Failed to reset session theme in Firestore:", dbErr);
        return NextResponse.json(
          { error: dbErr?.message || "Failed to reset session theme in database" },
          { status: 500 }
        );
      }
    }

    if (!theme || !analysisJSON) {
      return NextResponse.json(
        { error: "Missing required parameters: theme, analysisJSON" },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "No AI API key is configured on the server. Set OPENROUTER_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    const result = await generateThemeExplanation(theme, analysisJSON);
    
    // Save in Firestore if sessionId is provided
    if (sessionId && result) {
      try {
        const resultData = { ...result, themeName: theme };
        await updateSessionTheme(sessionId, resultData);
      } catch (dbErr: any) {
        console.error("Failed to persist session theme in Firestore:", dbErr);
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in /api/theme-explain:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error during theme explanation generation" },
      { status: 500 }
    );
  }
}
