'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Loader2, MoreVertical, Send } from 'lucide-react';
import { appendChatMessage, createChat, streamAgentResponse } from '@/lib/api';
import { MarkdownContent } from '@/components/MarkdownContent';
import { ThinkingBlock, NodeEvent } from '@/components/ThinkingBlock';
import { generateUUID } from '@/lib/utils';
import type { LlmModel, Vault } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  thinkingNodes?: NodeEvent[];
}

interface ChatInterfaceProps {
  vaultId: string;
  onBack?: () => void;
  chatId?: string;
  threadId?: string;
  title?: string;
  subtitle?: string;
  modelName?: string;
  modelDisplayName?: string;
  modelAvatarUrl?: string;
  vaultOptions?: Vault[];
  modelOptions?: LlmModel[];
  initialMessages?: Message[];
  readOnly?: boolean;
  shareState?: {
    isShared: boolean;
    shareUrl?: string | null;
  };
  onTitleCommit?: (title: string) => void | Promise<void>;
  onVaultChange?: (vaultId: string) => void | Promise<void>;
  onModelChange?: (modelName: string) => void | Promise<void>;
  onShareToggle?: () => void | Promise<void>;
  onShareCopy?: () => void | Promise<void>;
  savingLabel?: string | null;
  onChatCreated?: (chatId: string, threadId: string) => void;
}

export function ChatInterface({
  vaultId,
  onBack,
  chatId: initialChatId,
  threadId: initialThreadId,
  title,
  subtitle,
  modelName,
  modelDisplayName,
  modelAvatarUrl,
  vaultOptions,
  modelOptions,
  initialMessages,
  readOnly = false,
  shareState,
  onTitleCommit,
  onVaultChange,
  onModelChange,
  onShareToggle,
  onShareCopy,
  savingLabel,
  onChatCreated,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(initialThreadId || '');
  const [chatId, setChatId] = useState(initialChatId || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title || '');

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    setTitleDraft(title || '');
  }, [title]);

  useEffect(() => {
    if (initialChatId) {
      setChatId(initialChatId);
    }
    if (initialThreadId) {
      setThreadId(initialThreadId);
    }
  }, [initialChatId, initialThreadId]);

  // Check if user is already at the bottom
  const isUserAtBottom = () => {
    if (!scrollContainerRef.current) return true;
    const container = scrollContainerRef.current;
    return container.scrollHeight - container.scrollTop - container.clientHeight < 50;
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (isUserAtBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      // Also scroll the container to ensure visibility
      scrollContainerRef.current?.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Scroll to bottom when user sends a message (not during streaming)
  useEffect(() => {
    if (!isStreaming) {
      scrollToBottom();
    }
  }, [messages, isStreaming]);

  const commitTitle = async () => {
    if (!onTitleCommit) {
      setIsEditingTitle(false);
      return;
    }
    const nextTitle = titleDraft.trim() || 'Новый чат';
    await onTitleCommit(nextTitle);
    setIsEditingTitle(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || readOnly) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Scroll to show the user message immediately
    setTimeout(() => {
      scrollToBottom();
    }, 50);

    let assistantContent = '';
    let thinkingNodes: NodeEvent[] = [];
    let isGeneratingAnswer = false;

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      thinkingNodes: []
    };
    setMessages((prev) => [...prev, assistantMessage]);
    setIsStreaming(true); // Start streaming - no auto-scroll during streaming

    try {
      let activeChatId = chatId;
      let activeThreadId = threadId;

      if (!activeChatId) {
        const created = await createChat({
          vault_id: vaultId,
          title: input.trim().slice(0, 80),
          model_name: modelName || undefined,
          thread_id: activeThreadId || undefined,
        });
        activeChatId = created.id;
        activeThreadId = created.thread_id || generateUUID();
        setChatId(activeChatId);
        setThreadId(activeThreadId);
        onChatCreated?.(activeChatId, activeThreadId);
      }

      if (activeChatId) {
        appendChatMessage(activeChatId, { role: 'user', content: userMessage.content }).catch((error) => {
          console.error('Failed to save user message:', error);
        });
      }

      for await (const event of streamAgentResponse(input, vaultId, activeThreadId, activeChatId, modelName)) {
        if (event.type === 'node_start') {
          // Нода начала работу
          const newNode: NodeEvent = {
            node: event.node,
            status: 'running',
          };
          thinkingNodes = [...thinkingNodes, newNode];

          // Проверяем, началась ли генерация ответа
          if (event.node === 'generate_answer') {
            isGeneratingAnswer = true;
          }

          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: assistantContent,
              thinkingNodes: thinkingNodes,
            };
            return newMessages;
          });
        } else if (event.type === 'node_complete') {
          // Нода завершила работу
          thinkingNodes = thinkingNodes.map((node) =>
            node.node === event.node && node.status === 'running'
              ? { ...node, status: 'completed' as const }
              : node
          );

          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: assistantContent,
              thinkingNodes: thinkingNodes,
            };
            return newMessages;
          });
        } else if (event.type === 'token') {
          // Токены от LLM приходят только после начала generate_answer
          if (isGeneratingAnswer) {
            assistantContent += event.content;
            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                role: 'assistant',
                content: assistantContent,
                thinkingNodes: thinkingNodes,
              };
              return newMessages;
            });
          }
        } else if (event.status === 'complete') {
          // Stream complete
        }
      }

      if (activeChatId && assistantContent.trim()) {
        appendChatMessage(activeChatId, {
          role: 'assistant',
          content: assistantContent,
        }).catch((error) => {
          console.error('Failed to save assistant message:', error);
        });
      }
    } catch (error) {
      console.error('Error streaming response:', error);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: 'Произошла ошибка при обработке запроса.',
          thinkingNodes: thinkingNodes,
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false); // Streaming complete
      // Auto-scroll to bottom after streaming completes
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      {/* Header */}
      <Card className="flex-none border-b rounded-none border-border">
        <CardHeader className="py-4 px-6">
          <div className="flex items-start gap-4">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="hover:bg-accent"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div className="flex-1">
              {isEditingTitle && !readOnly ? (
                <Input
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      commitTitle();
                    }
                  }}
                  autoFocus
                  className="max-w-md text-lg font-semibold"
                />
              ) : (
                <button
                  type="button"
                  className="text-left"
                  onClick={() => {
                    if (!readOnly && onTitleCommit) {
                      setIsEditingTitle(true);
                    }
                  }}
                >
                  <CardTitle className="text-lg font-semibold">
                    {title || 'Чат с базой знаний'}
                  </CardTitle>
                </button>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">
                  {vaultId.slice(0, 8)}...{vaultId.slice(-8)}
                </span>
                {subtitle && <span>{subtitle}</span>}
                {savingLabel && <span className="text-primary">{savingLabel}</span>}
              </div>
              {(modelDisplayName || modelName) && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                  {modelAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={modelAvatarUrl} alt={modelDisplayName || modelName} className="h-4 w-4 rounded-full" />
                  ) : (
                    <span className="h-4 w-4 rounded-full bg-muted-foreground/30" />
                  )}
                  <span>{modelDisplayName || modelName}</span>
                </div>
              )}
              {readOnly && (
                <p className="text-xs text-muted-foreground mt-1">
                  Режим только для чтения
                </p>
              )}
            </div>
            {!readOnly && shareState && onShareToggle && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Шэринг чата</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div>
                      {shareState.isShared
                        ? 'Чат опубликован (только чтение).'
                        : 'Чат приватный. Публикация откроет доступ по ссылке.'}
                    </div>
                    {shareState.isShared && shareState.shareUrl && (
                      <div className="flex items-center gap-2">
                        <Input value={shareState.shareUrl} readOnly />
                        <Button variant="outline" onClick={onShareCopy}>
                          Копировать
                        </Button>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant={shareState.isShared ? 'destructive' : 'default'}
                      onClick={onShareToggle}
                    >
                      {shareState.isShared ? 'Отключить шэринг' : 'Поделиться'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollContainerRef}>
          <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-16">
                <p className="text-xl font-medium mb-3">Начните диалог</p>
                <p className="text-sm">
                  Задайте вопрос по содержимому вашего хранилища
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={index}>
                {message.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-lg px-5 py-3 bg-primary text-primary-foreground shadow-sm">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-2 w-full">
                    {/* Thinking Block */}
                    {message.thinkingNodes && message.thinkingNodes.length > 0 && (
                      <ThinkingBlock
                        nodes={message.thinkingNodes}
                        isThinking={isLoading && index === messages.length - 1}
                      />
                    )}

                    {/* Assistant Message */}
                    {message.content && (
                      <div className="max-w-[85%] rounded-lg px-5 py-3 bg-card border border-border shadow-sm">
                        <div className="text-sm">
                          <MarkdownContent content={message.content} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      {!readOnly && (
        <Card className="flex-none border-t rounded-none border-border">
          <CardContent className="p-4">
            <div className="max-w-4xl mx-auto space-y-3">
              {(vaultOptions?.length || modelOptions?.length) && (
                <div className="flex flex-wrap gap-3">
                  {vaultOptions && vaultOptions.length > 0 && (
                    <div className="min-w-[200px] flex-1">
                      <label className="text-xs text-muted-foreground">Хранилище</label>
                      <select
                        value={vaultId}
                        onChange={(event) => onVaultChange?.(event.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {vaultOptions.map((vault) => (
                          <option key={vault.vault_id} value={vault.vault_id}>
                            {vault.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {modelOptions && modelOptions.length > 0 && (
                    <div className="min-w-[200px] flex-1">
                      <label className="text-xs text-muted-foreground">Модель</label>
                      <select
                        value={modelName || ''}
                        onChange={(event) => onModelChange?.(event.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {modelOptions.map((model) => (
                          <option key={model.id} value={model.system_name}>
                            {model.display_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Введите ваш вопрос..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  size="lg"
                  className="px-6"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
