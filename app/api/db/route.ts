import { NextResponse } from "next/server";
import { getSessionData, saveAnalysisSession, updateSessionMessages, getUserSessions } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const uid = searchParams.get("uid");

  try {
    if (sessionId) {
      const data = await getSessionData(sessionId);
      return NextResponse.json({ session: data });
    } else if (uid) {
      const data = await getUserSessions(uid);
      return NextResponse.json({ sessions: data });
    }
    return NextResponse.json({ error: "Missing sessionId or uid parameter" }, { status: 400 });
  } catch (err: any) {
    console.error("DB GET API Error:", err);
    return NextResponse.json({ error: err?.message || "Database fetch error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, sessionId, uid, repoInfo, analysis, messages, themeData } = body;

    if (action === "save") {
      await saveAnalysisSession(sessionId, uid, repoInfo, analysis, messages, themeData);
      return NextResponse.json({ success: true });
    } else if (action === "updateMessages") {
      await updateSessionMessages(sessionId, messages);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("DB POST API Error:", err);
    return NextResponse.json({ error: err?.message || "Database update error" }, { status: 500 });
  }
}
