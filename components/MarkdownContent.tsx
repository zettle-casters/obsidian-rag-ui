'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

interface MarkdownContentProps {
  content: string;
}

// Convert LaTeX delimiters to formats that remark-math understands
function preprocessLatex(text: string): string {
  return text
    // --- INLINE MATH ---
    // \( ... \) → $ ... $
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$')

    // --- DISPLAY MATH ---
    // \[ ... \] → $$ ... $$
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$\n$1\n$$$$')

    // equation / equation* → $$ ... $$
    .replace(
      /\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g,
      '$$$$\n$1\n$$$$'
    )

    // align / align* → aligned
    .replace(
      /\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g,
      '$$$$\n\\begin{aligned}\n$1\n\\end{aligned}\n$$$$'
    )

    // gather / gather* → gathered
    .replace(
      /\\begin\{gather\*?\}([\s\S]*?)\\end\{gather\*?\}/g,
      '$$$$\n\\begin{gathered}\n$1\n\\end{gathered}\n$$$$'
    );
}


export function MarkdownContent({ content }: MarkdownContentProps) {
  const processedContent = preprocessLatex(content);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex]}
      className="markdown-content"
      components={{
        // Code blocks
        code: ({ node, inline, className, children, ...props }: any) => {
          const match = /language-(\w+)/.exec(className || '');
          return !inline ? (
            <code
              className={`block bg-muted/50 rounded-md p-3 my-2 overflow-x-auto text-sm ${className || ''}`}
              {...props}
            >
              {children}
            </code>
          ) : (
            <code
              className="bg-muted/50 rounded px-1.5 py-0.5 text-sm font-mono"
              {...props}
            >
              {children}
            </code>
          );
        },
        // Headings
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold mt-6 mb-3 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-bold mt-5 mb-2 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold mt-4 mb-2 first:mt-0">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-base font-semibold mt-3 mb-1 first:mt-0">{children}</h4>
        ),
        // Paragraphs
        p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
        // Lists
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary/30 pl-4 my-3 italic text-muted-foreground">
            {children}
          </blockquote>
        ),
        // Tables
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="min-w-full border-collapse border border-border">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/50">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="border border-border px-3 py-2 text-left font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-border px-3 py-2">{children}</td>
        ),
        // Horizontal rule
        hr: () => <hr className="my-4 border-border" />,
        // Strong/Bold
        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        // Emphasis/Italic
        em: ({ children }) => <em className="italic">{children}</em>,
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
}
