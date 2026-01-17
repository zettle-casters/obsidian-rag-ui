'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const chatId = params?.id as string;
  const returnTo = searchParams?.get('returnTo') || '/chats';

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

  const selectedModel = useMemo(() => {
    return models.find((model) => model.system_name === modelName);
  }, [models, modelName]);

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

  const handleTitleCommit = async (nextTitle: string) => {
    if (!detail) return;
    setTitle(nextTitle);
    setSaving(true);
    try {
      const updated = await updateChat(detail.chat.id, { title: nextTitle });
      setDetail({ ...detail, chat: updated });
    } finally {
      setSaving(false);
    }
  };

  const handleVaultChange = async (nextVaultId: string) => {
    if (!detail) return;
    setVaultId(nextVaultId);
    setSaving(true);
    try {
      const updated = await updateChat(detail.chat.id, { vault_id: nextVaultId });
      setDetail({ ...detail, chat: updated });
    } finally {
      setSaving(false);
    }
  };

  const handleModelChange = async (nextModel: string) => {
    if (!detail) return;
    setModelName(nextModel);
    setSaving(true);
    try {
      const updated = await updateChat(detail.chat.id, { model_name: nextModel });
      setDetail({ ...detail, chat: updated });
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
      <ChatInterface
        vaultId={detail.chat.vault_id}
        chatId={detail.chat.id}
        threadId={detail.chat.thread_id}
        title={detail.chat.title}
        subtitle={`Последнее обновление: ${formatDate(detail.chat.updated_at)}`}
        modelName={detail.chat.model_name || modelName}
        modelDisplayName={selectedModel?.display_name}
        modelAvatarUrl={selectedModel?.avatar_url || undefined}
        vaultOptions={vaults}
        modelOptions={models}
        initialMessages={initialMessages}
        shareState={{
          isShared: detail.chat.is_shared,
          shareUrl: detail.chat.share_url,
        }}
        savingLabel={saving ? 'Сохранение...' : null}
        onTitleCommit={handleTitleCommit}
        onVaultChange={handleVaultChange}
        onModelChange={handleModelChange}
        onShareToggle={handleToggleShare}
        onShareCopy={copyShareLink}
        onBack={() => {
          const target = returnTo.startsWith('/') ? returnTo : '/chats';
          router.push(target);
        }}
      />
    </div>
  );
}
