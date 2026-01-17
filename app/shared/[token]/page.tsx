'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChatInterface } from '@/components/ChatInterface';
import { fetchSharedChat, type ChatDetail } from '@/lib/api';

export default function SharedChatPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;

  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const initialMessages = useMemo(() => {
    if (!detail?.messages) return [];
    return detail.messages.map((message) => {
      const role: 'assistant' | 'user' = message.role === 'assistant' ? 'assistant' : 'user';
      return { role, content: message.content };
    });
  }, [detail]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const chatDetail = await fetchSharedChat(token);
        if (!active) return;
        setDetail(chatDetail);
      } catch (error) {
        console.error('Failed to load shared chat:', error);
        if (active) setDetail(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    if (token) load();
    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-8 py-10 text-muted-foreground">
        Загрузка чата...
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-background px-8 py-10 text-muted-foreground">
        Чат недоступен.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-5xl mx-auto px-8 py-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Публичный чат</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Только чтение. Для продолжения создайте свой чат.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/chats')}>
            Открыть свои чаты
          </Button>
        </div>
      </div>

      <Card className="max-w-5xl mx-auto mt-6">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Чат опубликован владельцем. Вы можете читать историю и создавать собственные диалоги.
        </CardContent>
      </Card>

      <ChatInterface
        vaultId={detail.chat.vault_id}
        chatId={detail.chat.id}
        threadId={detail.chat.thread_id}
        title={detail.chat.title}
        modelName={detail.chat.model_name || undefined}
        initialMessages={initialMessages}
        readOnly
      />
    </div>
  );
}
