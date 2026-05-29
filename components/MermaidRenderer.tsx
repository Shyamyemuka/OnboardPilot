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

  const downloadPNG = () => {
    if (!elementRef.current) return;
    const svgEl = elementRef.current.querySelector("svg");
    if (!svgEl) return;

    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const DOMURL = window.URL || window.webkitURL || window;
    const blobURL = DOMURL.createObjectURL(svgBlob);

    const base64Svg = window.btoa(unescape(encodeURIComponent(svgString)));
    const dataURL = `data:image/svg+xml;base64,${base64Svg}`;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const rect = svgEl.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        try {
          const pngURL = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.href = pngURL;
          downloadLink.download = "visual_workflow.png";
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        } catch (exportErr) {
          console.error("Canvas export failed:", exportErr);
          // Fallback to direct SVG download if canvas gets tainted
          const downloadLink = document.createElement("a");
          downloadLink.href = dataURL;
          downloadLink.download = "visual_workflow.svg";
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
      }
    };
    image.src = dataURL;
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div 
        ref={elementRef}
        className="p-4 rounded-xl border border-outline-variant bg-surface-container-low overflow-auto flex justify-center items-center max-w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="flex justify-end pr-1">
        <button
          onClick={downloadPNG}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle rounded bg-surface-white hover:bg-surface-container-low hover:border-outline-variant transition-all text-xs font-semibold shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">image</span>
          Download Image (PNG)
        </button>
      </div>
    </div>
  );
}
