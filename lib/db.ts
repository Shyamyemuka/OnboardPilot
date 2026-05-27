import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { GuideJSON, ChatMessage } from "@/types";

export interface SessionDocument {
  id?: string;
  uid: string;
  repoOwner: string;
  repoName: string;
  repoUrl: string;
  analysis: GuideJSON;
  messages: ChatMessage[];
  createdAt: any;
  lastActiveAt: any;
}

export async function saveAnalysisSession(
  sessionId: string,
  uid: string,
  repoInfo: { owner: string; repo: string; url: string },
  analysis: GuideJSON,
  messages: ChatMessage[] = []
): Promise<void> {
  const sessionRef = doc(db, "sessions", sessionId);
  await setDoc(sessionRef, {
    uid,
    repoOwner: repoInfo.owner,
    repoName: repoInfo.repo,
    repoUrl: repoInfo.url,
    analysis,
    messages,
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
  });
}

export async function updateSessionMessages(
  sessionId: string,
  messages: ChatMessage[]
): Promise<void> {
  const sessionRef = doc(db, "sessions", sessionId);
  await updateDoc(sessionRef, {
    messages,
    lastActiveAt: serverTimestamp(),
  });
}

export async function getSessionData(sessionId: string): Promise<SessionDocument | null> {
  const sessionRef = doc(db, "sessions", sessionId);
  const snap = await getDoc(sessionRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as SessionDocument;
}

export async function getUserSessions(uid: string): Promise<SessionDocument[]> {
  const q = query(
    collection(db, "sessions"),
    where("uid", "==", uid),
    orderBy("lastActiveAt", "desc")
  );

  const snap = await getDocs(q);
  const sessions: SessionDocument[] = [];
  snap.forEach((d) => {
    sessions.push({ id: d.id, ...d.data() } as SessionDocument);
  });
  return sessions;
}
