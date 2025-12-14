'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { streamAgentResponse } from '@/lib/api';
import { MarkdownContent } from '@/components/MarkdownContent';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  vaultId: string;
  onBack: () => void;
}

export function ChatInterface({ vaultId, onBack }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Scroll to show the user message immediately
    setTimeout(() => {
      scrollToBottom();
    }, 50);

    let assistantContent = '';
    const assistantMessage: Message = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, assistantMessage]);
    setIsStreaming(true); // Start streaming - no auto-scroll during streaming

    try {
      for await (const event of streamAgentResponse(input, vaultId, threadId)) {
        if (event.type === 'token') {
          assistantContent += event.content;
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: assistantContent,
            };
            return newMessages;
          });
        } else if (event.status === 'complete') {
          // Stream complete
        }
      }
    } catch (error) {
      console.error('Error streaming response:', error);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: 'Произошла ошибка при обработке запроса.',
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
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="hover:bg-accent"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold">
                Чат с базой знаний
              </CardTitle>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {vaultId.slice(0, 8)}...{vaultId.slice(-8)}
              </p>
            </div>
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
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-5 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-card border border-border shadow-sm'
                  }`}
                >
                  {message.role === 'user' ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  ) : (
                    <div className="text-sm">
                      <MarkdownContent content={message.content} />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg px-5 py-3 bg-card border border-border shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <Card className="flex-none border-t rounded-none border-border">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="flex gap-3 max-w-4xl mx-auto">
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
        </CardContent>
      </Card>
    </div>
  );
}
