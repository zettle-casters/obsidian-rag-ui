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

const MAX_VISIBLE_NODES = 5;

export function ThinkingBlock({ nodes, isThinking }: ThinkingBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllNodes, setShowAllNodes] = useState(false);

  if (nodes.length === 0 && !isThinking) {
    return null;
  }

  const visibleNodes = showAllNodes ? nodes : nodes.slice(-MAX_VISIBLE_NODES);
  const hiddenCount = nodes.length - MAX_VISIBLE_NODES;

  return (
    <div className="max-w-[85%] rounded-lg border border-muted-foreground/20 bg-muted/10 shadow-sm">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/20 transition-colors rounded-t-lg"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/70" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/70" />
        )}
        <span className="text-xs text-muted-foreground/90 italic">
          Thinking
          {isThinking && (
            <span className="ml-1.5 inline-flex gap-0.5">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
            </span>
          )}
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-2 border-t border-muted-foreground/10">
          {/* Show older nodes button */}
          {hiddenCount > 0 && !showAllNodes && (
            <button
              onClick={() => setShowAllNodes(true)}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground/90 mb-2 transition-colors"
            >
              + показать {hiddenCount} ранних шагов
            </button>
          )}

          {/* Nodes list */}
          <div className="space-y-1">
            {visibleNodes.map((node, index) => (
              <div key={index} className="flex items-start gap-2 text-xs">
                {node.status === 'running' ? (
                  <Loader2 className="w-3 h-3 mt-0.5 text-primary/70 animate-spin flex-shrink-0" />
                ) : (
                  <span className="text-green-500/70 text-sm leading-3 flex-shrink-0">✓</span>
                )}
                <span className="text-foreground/70 leading-relaxed">
                  {NODE_LABELS[node.node] || node.node}
                  {node.message && (
                    <span className="text-muted-foreground/60 ml-1.5">— {node.message}</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Collapse older nodes button */}
          {showAllNodes && hiddenCount > 0 && (
            <button
              onClick={() => setShowAllNodes(false)}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground/90 mt-2 transition-colors"
            >
              - скрыть ранние шаги
            </button>
          )}
        </div>
      )}
    </div>
  );
}
