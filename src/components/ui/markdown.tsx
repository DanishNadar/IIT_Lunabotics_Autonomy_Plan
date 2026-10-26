"use client";

import { Check, Copy } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SnippetLabel } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { Badge } from "./primitives";

const Mermaid = dynamic(() => import("./mermaid").then((m) => m.Mermaid), { ssr: false, loading: () => <div className="h-24 animate-pulse rounded bg-panel-3" /> });

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-tech", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer noopener">
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            const lang = /language-(\w+)/.exec(className ?? "")?.[1];
            const text = String(children).replace(/\n$/, "");
            if (lang === "mermaid") return <Mermaid chart={text} />;
            if (!lang && !text.includes("\n")) return <code>{children}</code>;
            return <CodeBlock code={text} language={lang ?? "text"} bare />;
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

const LABEL: Record<SnippetLabel, { text: string; tone: "ok" | "info" | "warn"; tip: string }> = {
  verified: { text: "Verified", tone: "ok", tip: "Standard command/syntax confirmed against official documentation." },
  illustrative: { text: "Illustrative", tone: "info", tip: "Shows the idea; not tested against our code." },
  adapt: { text: "Requires adaptation", tone: "warn", tip: "Starting point — change topics, frames and values for our rover." },
};

export function CodeBlock({ code, language, title, label, note, bare }: { code: string; language: string; title?: ReactNode; label?: SnippetLabel; note?: string; bare?: boolean }) {
  const [copied, setCopied] = useState(false);
  const l = label ? LABEL[label] : null;
  return (
    <div className={cn("overflow-hidden rounded-md border border-line bg-panel-2", !bare && "my-0")}>
      <div className="flex items-center gap-2 border-b border-line px-2.5 py-1">
        {title && <span className="truncate text-[11px] font-medium text-fg-2">{title}</span>}
        <span className="font-mono text-[10px] text-faint uppercase">{language}</span>
        {l && (
          <Badge tone={l.tone} title={l.tip}>
            {l.text}
          </Badge>
        )}
        <button
          className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted hover:bg-panel-3 hover:text-fg"
          onClick={() => {
            void navigator.clipboard?.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-2.5 font-mono text-[12px] leading-relaxed text-fg-2">
        <code>{code}</code>
      </pre>
      {note && <p className="border-t border-line px-2.5 py-1.5 text-[11px] text-muted">{note}</p>}
    </div>
  );
}
