"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "@/types";
import { useAuth } from "@/context/AuthContext";

interface ChatPanelProps {
  repoName: string;
  analysisJSON: string;
  messagesState?: {
    messages: ChatMessage[];
    setMessages: (msgs: ChatMessage[]) => void;
  };
}

export default function ChatPanel({ repoName, analysisJSON, messagesState }: ChatPanelProps) {
  const { user } = useAuth();

  // Use stateful props if passed from parent workspace, otherwise fall back to local state
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  
  const messages = messagesState ? messagesState.messages : localMessages;
  const setMessages = messagesState ? messagesState.setMessages : setLocalMessages;

  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize the textarea height dynamically based on input content length
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  // Initialize with greeting message only if empty (or if using local state)
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: `Hello! I've mapped the **${repoName}** codebase and generated your onboarding playbook. Ask me anything about the directories, modules, routing, or how to get started on your first issue!`,
        },
      ]);
    }
  }, [repoName, setMessages]);

  // Scroll to bottom whenever messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          repoName,
          analysisJSON,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to communicate with Copilot server.");
      }

      const data = await res.json();
      setMessages([...updatedMessages, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  return (
    <aside className="w-full md:w-[400px] flex flex-col bg-surface-white border-l border-border-subtle shrink-0 h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface-bright shrink-0 select-none shadow-sm">
        <div className="flex items-center gap-2">
          <img
            alt="Copilot"
            className="w-5 h-5 object-contain"
            src="/logo2.png"
          />
          <h3 className="font-semibold text-body-md font-body-lg text-on-surface">Copilot</h3>
        </div>
        <div className="text-[10px] uppercase tracking-wider font-bold text-text-muted bg-surface-container px-2 py-0.5 rounded border border-border-subtle">
          Mini-Latest
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";

          return (
            <div key={idx} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
              {/* Avatar Icon */}
              {isUser ? (
                user?.photoURL ? (
                  <img
                    alt="User"
                    className="w-8 h-8 rounded border border-border-subtle shadow-sm object-cover shrink-0"
                    src={user.photoURL}
                  />
                ) : (
                  <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 shadow-sm bg-[#A3ABC4] text-white">
                    <span className="material-symbols-outlined text-[16px] font-bold">
                      person
                    </span>
                  </div>
                )
              ) : (
                <img
                  alt="Copilot"
                  className="w-8 h-8 rounded border border-border-subtle shadow-sm object-contain p-1 shrink-0 bg-surface-container-low"
                  src="/logo2.png"
                />
              )}

              {/* Message Bubble */}
              <div
                className={`p-3 rounded-lg max-w-[85%] text-xs md:text-sm leading-relaxed shadow-sm font-body-md ${
                  isUser
                    ? "bg-[#A3ABC4] text-white rounded-tr-none font-medium"
                    : "bg-surface-container-low text-on-surface rounded-tl-none border border-border-subtle"
                }`}
              >
                <div className="whitespace-pre-wrap space-y-2">
                  {msg.content.split("\n").map((paragraph, pIdx) => {
                    // Split by code blocks first
                    const codeParts = paragraph.split(/`([^`]+)`/g);
                    return (
                      <p key={pIdx}>
                        {codeParts.map((codePart, codePartIdx) => {
                          const isCode = codePartIdx % 2 === 1;
                          if (isCode) {
                            return (
                              <code
                                key={codePartIdx}
                                className={`font-mono-code text-[11px] px-1 py-0.5 rounded ${
                                  isUser
                                    ? "bg-slate-700/30 text-white font-bold"
                                    : "bg-surface-white border border-border-subtle text-secondary font-medium"
                                }`}
                              >
                                {codePart}
                              </code>
                            );
                          }

                          // If not a code block, parse markdown bold (**text**)
                          const boldParts = codePart.split(/\*\*([^*]+)\*\*/g);
                          return boldParts.map((boldPart, boldPartIdx) => {
                            const isBold = boldPartIdx % 2 === 1;
                            if (isBold) {
                              return (
                                <strong key={boldPartIdx} className="font-extrabold text-primary">
                                  {boldPart}
                                </strong>
                              );
                            }
                            return boldPart;
                          });
                        })}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading state indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded bg-surface-container-low text-primary flex items-center justify-center shrink-0 spinner-minimal">
              <span className="material-symbols-outlined text-[16px] text-primary">progress_activity</span>
            </div>
            <div className="bg-surface-container-low p-3 rounded-lg rounded-tl-none text-xs md:text-sm text-text-muted border border-border-subtle shadow-sm flex items-center gap-2">
              <span>Thinking</span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A3ABC4] animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#A3ABC4] animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#A3ABC4] animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-error-container/40 border border-error/20 p-3 rounded-lg text-xs text-error flex items-start gap-2">
            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">error</span>
            <div>
              <p className="font-semibold">Chat error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border-subtle bg-surface-bright shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputValue);
          }}
          className="relative flex items-end w-full"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(inputValue);
              }
            }}
            disabled={isLoading}
            placeholder="Ask a question about the repo..."
            className="w-full bg-surface-white border border-border-subtle rounded-lg py-2.5 pl-4 pr-10 text-xs md:text-sm font-body-md focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all placeholder-text-muted disabled:opacity-75 resize-none overflow-y-auto"
            style={{ minHeight: "42px", maxHeight: "120px" }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-2 bottom-2 text-text-muted hover:text-primary transition-colors p-1 disabled:opacity-40 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </form>

        {/* Suggestion Chips */}
        <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 max-w-full select-none no-scrollbar">
          <button
            onClick={() => handleSuggestionClick("Explain the directory structure")}
            type="button"
            className="text-[10px] text-text-muted font-label-sm border border-border-subtle px-2 py-1 rounded bg-surface-white cursor-pointer hover:bg-surface-container-low hover:text-on-surface whitespace-nowrap transition-colors"
          >
            Explain structure
          </button>
          <button
            onClick={() => handleSuggestionClick("Where does routing happen?")}
            type="button"
            className="text-[10px] text-text-muted font-label-sm border border-border-subtle px-2 py-1 rounded bg-surface-white cursor-pointer hover:bg-surface-container-low hover:text-on-surface whitespace-nowrap transition-colors"
          >
            Where is routing?
          </button>
          <button
            onClick={() => handleSuggestionClick("How do I run tests?")}
            type="button"
            className="text-[10px] text-text-muted font-label-sm border border-border-subtle px-2 py-1 rounded bg-surface-white cursor-pointer hover:bg-surface-container-low hover:text-on-surface whitespace-nowrap transition-colors"
          >
            Find tests
          </button>
        </div>
      </div>
    </aside>
  );
}
