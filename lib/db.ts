import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
} from "firebase/firestore";
import type { GuideJSON, ChatMessage } from "@/types";

export interface SessionDocument {
  id?: string;
  uid: string;
  repoOwner: string;
  repoName: string;
  repoUrl: string;
  analysis: GuideJSON;
  messages: ChatMessage[];
  createdAt: number;
  themeData?: {
    themeName: string;
    analogySummary: string;
    mappings: Array<{ codeElement: string; themeElement: string; explanation: string }>;
    mermaidFlowchart: string;
  } | null;
}

// Firestore physical storage document interface
interface SessionData {
  uid: string;
  repoOwner: string;
  repoName: string;
  repoUrl: string;
  analysisJSON: string; // stored as stringified JSON to avoid Firestore structural depth limits
  messages: ChatMessage[];
  createdAt: number;
  themeDataJSON?: string | null;
}

const SESSIONS_COLLECTION = "sessions";

/**
 * Saves a new analysis session to Firestore
 */
export async function saveAnalysisSession(
  sessionId: string,
  uid: string,
  repoInfo: { owner: string; repo: string; url: string },
  analysis: GuideJSON,
  messages: ChatMessage[] = [],
  themeData?: any
): Promise<void> {
  const sessionDocRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const data: SessionData = {
    uid,
    repoOwner: repoInfo.owner,
    repoName: repoInfo.repo,
    repoUrl: repoInfo.url,
    analysisJSON: JSON.stringify(analysis),
    messages,
    createdAt: Date.now(),
    themeDataJSON: themeData ? JSON.stringify(themeData) : null,
  };
  await setDoc(sessionDocRef, data);
}

/**
 * Updates the chat messages inside an active session
 */
export async function updateSessionMessages(
  sessionId: string,
  messages: ChatMessage[]
): Promise<void> {
  const sessionDocRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(sessionDocRef, {
    messages,
  });
}

/**
 * Updates the structural analysis GuideJSON inside an active session in Firestore
 */
export async function updateSessionAnalysis(
  sessionId: string,
  analysis: GuideJSON
): Promise<void> {
  const sessionDocRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(sessionDocRef, {
    analysisJSON: JSON.stringify(analysis),
  });
}

/**
 * Updates the theme explanation inside an active session in Firestore
 */
export async function updateSessionTheme(
  sessionId: string,
  themeData: any
): Promise<void> {
  const sessionDocRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(sessionDocRef, {
    themeDataJSON: themeData ? JSON.stringify(themeData) : null,
  });
}

/**
 * Fetches all sessions for a specific user ID
 */
export async function getUserSessions(uid: string): Promise<SessionDocument[]> {
  const sessionsRef = collection(db, SESSIONS_COLLECTION);
  const q = query(
    sessionsRef,
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );

  const querySnapshot = await getDocs(q);
  const sessions: SessionDocument[] = [];
  
  querySnapshot.forEach((doc) => {
    const rawData = doc.data() as SessionData;
    try {
      sessions.push({
        id: doc.id,
        uid: rawData.uid,
        repoOwner: rawData.repoOwner,
        repoName: rawData.repoName,
        repoUrl: rawData.repoUrl,
        analysis: JSON.parse(rawData.analysisJSON),
        messages: rawData.messages || [],
        createdAt: rawData.createdAt,
        themeData: rawData.themeDataJSON ? JSON.parse(rawData.themeDataJSON) : null,
      });
    } catch (parseErr) {
      console.error(`Failed to parse session JSON for document ${doc.id}:`, parseErr);
    }
  });
  
  return sessions;
}

/**
 * Retrieves a single session by its unique ID
 */
export async function getSessionData(sessionId: string): Promise<SessionDocument | null> {
  const sessionDocRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const docSnap = await getDoc(sessionDocRef);
  
  if (docSnap.exists()) {
    const rawData = docSnap.data() as SessionData;
    try {
      return {
        id: docSnap.id,
        uid: rawData.uid,
        repoOwner: rawData.repoOwner,
        repoName: rawData.repoName,
        repoUrl: rawData.repoUrl,
        analysis: JSON.parse(rawData.analysisJSON),
        messages: rawData.messages || [],
        createdAt: rawData.createdAt,
        themeData: rawData.themeDataJSON ? JSON.parse(rawData.themeDataJSON) : null,
      };
    } catch (parseErr) {
      console.error(`Failed to parse session JSON for document ${docSnap.id}:`, parseErr);
      return null;
    }
  }
  
  return null;
}
