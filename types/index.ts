export interface GuideJSON {
  repoName: string;
  language: string;
  framework: string;
  architectureSummary: string;
  directoryBreakdown: { path: string; role: string; important: boolean }[];
  keyFiles: { path: string; description: string; mustRead: boolean }[];
  coreModules: { name: string; files: string[]; description: string }[];
  starterTasks: {
    title: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    files: string[];
    description: string;
  }[];
  mermaidFlowchart: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface FileEntry {
  path: string;
  content: string;
  score: number;
}
