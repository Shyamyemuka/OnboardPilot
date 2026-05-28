"use client";

import { useEffect, useState, useRef } from "react";

interface MermaidRendererProps {
  chart: string;
}

function cleanMermaidLabel(label: string): string {
  return label
    .replace(/["`]/g, "'")
    .replace(/[()]/g, "")
    .replace(/&/g, "and")
    .replace(/[{}<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeMermaidChart(chart: string): string {
  return chart
    .replace(/^```mermaid\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .split("\n")
    .map((line) => {
      const withoutSemicolon = line.replace(/;\s*$/, "");
      return withoutSemicolon.replace(
        /([A-Za-z][A-Za-z0-9_-]*)\[([^\]\n]+)\]/g,
        (_match, id: string, label: string) => `${id}["${cleanMermaidLabel(label)}"]`
      );
    })
    .join("\n")
    .trim();
}

function removeMermaidErrorArtifacts() {
  document
    .querySelectorAll("body > svg[id^='mermaid-'], body > div[id^='dmermaid'], body > .mermaid")
    .forEach((element) => {
      const text = element.textContent || "";
      if (text.includes("Syntax error in text") || text.includes("mermaid version")) {
        element.remove();
      }
    });
}

export default function MermaidRenderer({ chart }: MermaidRendererProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAndRender() {
      try {
        setSvg(null);
        setError(null);
        removeMermaidErrorArtifacts();

        const safeChart = sanitizeMermaidChart(chart);
        // Dynamically import mermaid to keep initial bundle sizes low
        const mermaid = (await import("mermaid")).default;
        
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "loose",
        });

        // Generate a unique ID for this render instance
        const id = `mermaid-svg-${Math.random().toString(36).substr(2, 9)}`;
        
        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(id, safeChart);
        removeMermaidErrorArtifacts();
        
        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (err: any) {
        console.error("Mermaid parsing error:", err);
        removeMermaidErrorArtifacts();
        if (isMounted) {
          setError(
            "Could not render the visual workflow due to a diagram syntax error. Here is the raw diagram instead:"
          );
        }
      }
    }

    loadAndRender();

    return () => {
      isMounted = false;
      removeMermaidErrorArtifacts();
    };
  }, [chart]);

  if (error) {
    return (
      <div className="flex flex-col gap-4 p-4 rounded-xl border border-error-container bg-surface-container-low">
        <div className="flex items-center gap-2 text-error">
          <span className="material-symbols-outlined">warning</span>
          <span className="font-semibold text-body-md">{error}</span>
        </div>
        <pre className="p-4 rounded-lg bg-surface-container-high text-label-sm font-mono overflow-auto max-h-[300px] border border-outline-variant">
          {sanitizeMermaidChart(chart)}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[250px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        <span className="text-body-sm text-outline">Generating visual workflow...</span>
      </div>
    );
  }

  return (
    <div 
      ref={elementRef}
      className="p-4 rounded-xl border border-outline-variant bg-surface-container-low overflow-auto flex justify-center items-center max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
