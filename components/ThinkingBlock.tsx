'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

export interface NodeEvent {
  node: string;
  status: 'running' | 'completed';
  message?: string;
}

interface ThinkingBlockProps {
  nodes: NodeEvent[];
  isThinking: boolean;
}

const NODE_LABELS: Record<string, string> = {
  reformulate: 'Переформулировка запроса',
  search: 'Поиск по базе знаний',
  check_context: 'Проверка достаточности контекста',
  extend_context: 'Расширение контекста',
  generate_answer: 'Генерация ответа',
};

export function ThinkingBlock({ nodes, isThinking }: ThinkingBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (nodes.length === 0 && !isThinking) {
    return null;
  }

  return (
    <div className="max-w-[85%] rounded-lg border border-border bg-muted/30 shadow-sm mb-4">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/50 transition-colors rounded-t-lg"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="font-mono text-sm text-muted-foreground font-medium">
          Thinking
          {isThinking && (
            <span className="ml-2 inline-flex gap-1">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
            </span>
          )}
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-3 space-y-2 border-t border-border">
          {nodes.map((node, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              {node.status === 'running' ? (
                <Loader2 className="w-4 h-4 mt-0.5 text-primary animate-spin flex-shrink-0" />
              ) : (
                <span className="text-green-500 text-base leading-4 flex-shrink-0">✓</span>
              )}
              <span className="text-foreground">
                {NODE_LABELS[node.node] || node.node}
                {node.message && (
                  <span className="text-muted-foreground ml-2">— {node.message}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
