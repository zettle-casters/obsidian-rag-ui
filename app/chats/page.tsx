'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  createChat,
  fetchChats,
  fetchModels,
  fetchVaults,
  type ChatSummary,
  type LlmModel,
  type Vault,
} from '@/lib/api';

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
};

export default function ChatsPage() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [models, setModels] = useState<LlmModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newVaultId, setNewVaultId] = useState('');
  const [newModel, setNewModel] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const vaultNameById = useMemo(() => {
    return new Map(vaults.map((vault) => [vault.vault_id, vault.name]));
  }, [vaults]);

  const modelNameBySystem = useMemo(() => {
    return new Map(models.map((model) => [model.system_name, model.display_name]));
  }, [models]);

  const modelBySystem = useMemo(() => {
    return new Map(models.map((model) => [model.system_name, model]));
  }, [models]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [vaultsList, modelsList] = await Promise.all([
          fetchVaults(),
          fetchModels(),
        ]);
        if (!active) return;
        setVaults(vaultsList);
        setModels(modelsList);
        setNewVaultId(vaultsList[0]?.vault_id || '');
        setNewModel(modelsList[0]?.system_name || '');
      } catch (error) {
        console.error('Failed to load chat dependencies:', error);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const chatsList = await fetchChats(search.trim() || undefined);
        if (!active) return;
        setChats(chatsList);
      } catch (error) {
        console.error('Failed to fetch chats:', error);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  const handleCreateChat = async () => {
    setCreateError(null);
    if (!newVaultId) {
      setCreateError('Выберите хранилище.');
      return;
    }
    try {
      const chat = await createChat({
        vault_id: newVaultId,
        title: newTitle.trim() || undefined,
        model_name: newModel || undefined,
      });
      setCreateOpen(false);
      setNewTitle('');
      router.push(`/chats/${chat.id}`);
    } catch (error) {
      console.error('Failed to create chat:', error);
      setCreateError('Не удалось создать чат.');
    }
  };

  return (
    <div className="min-h-screen bg-background px-8 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Чаты</h1>
            <p className="text-muted-foreground mt-2 text-base">
              История диалогов, поиск и управление моделями чатов.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.push('/')}>
              Назад к хранилищам
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>Новый чат</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создать чат</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Название</label>
                    <Input
                      value={newTitle}
                      onChange={(event) => setNewTitle(event.target.value)}
                      placeholder="Например: Рефакторинг базы знаний"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Хранилище</label>
                    <select
                      value={newVaultId}
                      onChange={(event) => setNewVaultId(event.target.value)}
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
                    <div className="flex items-center gap-3">
                      <select
                        value={newModel}
                        onChange={(event) => setNewModel(event.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {models.map((model) => (
                          <option key={model.id} value={model.system_name}>
                            {model.display_name}
                          </option>
                        ))}
                      </select>
                      {modelBySystem.get(newModel)?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={modelBySystem.get(newModel)?.avatar_url || ''}
                          alt={modelBySystem.get(newModel)?.display_name || 'model'}
                          className="h-10 w-10 rounded-full border"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted" />
                      )}
                    </div>
                  </div>
                  {createError && (
                    <p className="text-sm text-destructive">{createError}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Отмена
                  </Button>
                  <Button onClick={handleCreateChat}>Создать</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по чатам и сообщениям"
            className="md:max-w-md"
          />
          <div className="text-sm text-muted-foreground">
            {loading ? 'Загрузка...' : `Всего чатов: ${chats.length}`}
          </div>
        </div>

        <div className="grid gap-4">
          {chats.map((chat) => (
            <Card
              key={chat.id}
              className="cursor-pointer transition hover:border-primary/60"
              onClick={() => router.push(`/chats/${chat.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {modelBySystem.get(chat.model_name || '')?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={modelBySystem.get(chat.model_name || '')?.avatar_url}
                        alt={modelBySystem.get(chat.model_name || '')?.display_name}
                        className="h-10 w-10 rounded-full border"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted" />
                    )}
                    <div>
                      <CardTitle className="text-lg">{chat.title || 'Новый чат'}</CardTitle>
                      <div className="text-xs text-muted-foreground">
                        {modelNameBySystem.get(chat.model_name || '') || chat.model_name || 'Модель не выбрана'}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {chat.is_shared ? 'Публичный' : 'Приватный'}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground/70">Хранилище</div>
                  <div className="text-sm text-foreground">
                    {vaultNameById.get(chat.vault_id) || chat.vault_id.slice(0, 8)}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground/70">Модель</div>
                  <div className="text-sm text-foreground">
                    {modelNameBySystem.get(chat.model_name || '') || chat.model_name || 'Не выбрана'}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground/70">Активность</div>
                  <div className="text-sm text-foreground">
                    {chat.message_count} сообщений
                  </div>
                  <div className="text-xs">{formatDate(chat.last_message_at || chat.updated_at)}</div>
                </div>
              </CardContent>
            </Card>
          ))}
          {!loading && chats.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-muted-foreground">
                Чатов пока нет. Создайте первый диалог.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
