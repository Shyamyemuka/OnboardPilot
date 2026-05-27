"use client";

import { useEffect, useState, useRef } from "react";

interface MermaidRendererProps {
  chart: string;
}

export default function MermaidRenderer({ chart }: MermaidRendererProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAndRender() {
      try {
        setError(null);
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
        const { svg: renderedSvg } = await mermaid.render(id, chart.trim());
        
        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (err: any) {
        console.error("Mermaid parsing error:", err);
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
          {chart}
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
