import { NextResponse } from "next/server";
import { regenerateSection } from "@/lib/codex";
import { updateSessionAnalysis } from "@/lib/db";
import type { GuideJSON } from "@/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { section, repoName, analysisJSON, sessionId } = body;

    if (!section || !repoName || !analysisJSON) {
      return NextResponse.json(
        { error: "Missing required parameters: section, repoName, analysisJSON" },
        { status: 400 }
      );
    }

    const validSections = ["architecture", "workflow", "directory", "keyFiles", "modules", "tasks"];
    if (!validSections.includes(section)) {
      return NextResponse.json(
        { error: `Invalid section. Must be one of: ${validSections.join(", ")}` },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "No AI API key is configured on the server." },
        { status: 500 }
      );
    }

    const result = await regenerateSection(section, repoName, analysisJSON);
    
    let newValue: any;
    let analysisField: keyof GuideJSON;

    if (section === "architecture") {
      newValue = result.architectureSummary;
      analysisField = "architectureSummary";
    } else if (section === "workflow") {
      newValue = result.mermaidFlowchart;
      analysisField = "mermaidFlowchart";
    } else if (section === "directory") {
      newValue = result.directoryBreakdown;
      analysisField = "directoryBreakdown";
    } else if (section === "keyFiles") {
      newValue = result.keyFiles;
      analysisField = "keyFiles";
    } else if (section === "modules") {
      newValue = result.coreModules;
      analysisField = "coreModules";
    } else if (section === "tasks") {
      newValue = result.starterTasks;
      analysisField = "starterTasks";
    } else {
      throw new Error(`Unhandled section: ${section}`);
    }

    if (!newValue) {
      throw new Error(`Failed to generate a valid response for section: ${section}`);
    }

    // If a sessionId is supplied, let's update the full analysis object in Firestore!
    if (sessionId) {
      try {
        const fullAnalysis = JSON.parse(analysisJSON);
        fullAnalysis[analysisField] = newValue;
        await updateSessionAnalysis(sessionId, fullAnalysis);
      } catch (dbErr) {
        console.error("Failed to update regenerated analysis in Firestore:", dbErr);
      }
    }

    return NextResponse.json({ [analysisField]: newValue });
  } catch (error: any) {
    console.error("Error in /api/regenerate:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error during section regeneration" },
      { status: 500 }
    );
  }
}
