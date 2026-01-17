'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChatInterface } from '@/components/ChatInterface';
import {
  fetchChat,
  fetchModels,
  fetchVaults,
  shareChat,
  unshareChat,
  updateChat,
  type ChatDetail,
  type LlmModel,
  type Vault,
} from '@/lib/api';

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
};

export default function ChatDetailPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params?.id as string;

  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [models, setModels] = useState<LlmModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [vaultId, setVaultId] = useState('');
  const [modelName, setModelName] = useState('');
  const [saving, setSaving] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

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
        const [chatDetail, vaultList, modelList] = await Promise.all([
          fetchChat(chatId),
          fetchVaults(),
          fetchModels(),
        ]);
        if (!active) return;
        setDetail(chatDetail);
        setVaults(vaultList);
        setModels(modelList);
        setTitle(chatDetail.chat.title || '');
        setVaultId(chatDetail.chat.vault_id);
        setModelName(chatDetail.chat.model_name || modelList[0]?.system_name || '');
      } catch (error) {
        console.error('Failed to load chat:', error);
      } finally {
        if (active) setLoading(false);
      }
    };
    if (chatId) load();
    return () => {
      active = false;
    };
  }, [chatId]);

  const handleSave = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const updated = await updateChat(detail.chat.id, {
        title,
        vault_id: vaultId,
        model_name: modelName || undefined,
      });
      setDetail({ ...detail, chat: updated });
    } catch (error) {
      console.error('Failed to update chat:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleShare = async () => {
    if (!detail) return;
    setShareLoading(true);
    setShareError(null);
    try {
      const updated = detail.chat.is_shared
        ? await unshareChat(detail.chat.id)
        : await shareChat(detail.chat.id);
      setDetail({ ...detail, chat: updated });
    } catch (error) {
      console.error('Failed to toggle share:', error);
      setShareError('Не удалось обновить шэринг.');
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareLink = async () => {
    if (!detail?.chat.share_url) return;
    try {
      await navigator.clipboard.writeText(detail.chat.share_url);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

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
        Чат не найден.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-8 py-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{detail.chat.title}</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Последнее обновление: {formatDate(detail.chat.updated_at)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => router.push('/chats')}>
                Назад к чатам
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
          <Card>
            <CardContent className="grid gap-4 py-6 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Название</label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Хранилище</label>
                <select
                  value={vaultId}
                  onChange={(event) => setVaultId(event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {vaults.map((vault) => (
                    <option key={vault.vault_id} value={vault.vault_id}>
                      {vault.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Модель</label>
                <select
                  value={modelName}
                  onChange={(event) => setModelName(event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.system_name}>
                      {model.display_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3 flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/40 px-4 py-3">
                <div className="flex-1 text-sm">
                  {detail.chat.is_shared ? 'Чат опубликован (только чтение).' : 'Чат приватный.'}
                </div>
                {detail.chat.is_shared && detail.chat.share_url && (
                  <Button variant="outline" size="sm" onClick={copyShareLink}>
                    Скопировать ссылку
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={detail.chat.is_shared ? 'destructive' : 'default'}
                  onClick={handleToggleShare}
                  disabled={shareLoading}
                >
                  {detail.chat.is_shared ? 'Отключить шэринг' : 'Поделиться'}
                </Button>
                {shareError && <span className="text-xs text-destructive">{shareError}</span>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ChatInterface
        vaultId={detail.chat.vault_id}
        chatId={detail.chat.id}
        threadId={detail.chat.thread_id}
        title={detail.chat.title}
        modelName={detail.chat.model_name || modelName}
        initialMessages={initialMessages}
        onBack={() => router.push('/chats')}
      />
    </div>
  );
}
