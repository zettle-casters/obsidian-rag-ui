'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileArchive, FlaskConical } from 'lucide-react';
import { VaultsList } from '@/components/VaultsList';
import { UploadDialog } from '@/components/UploadDialog';
import { ChatInterface } from '@/components/ChatInterface';
import TestInterface from '@/components/TestInterface';
import { AuthBar } from '@/components/AuthBar';
import { McpTokenCard } from '@/components/McpTokenCard';
import {
  fetchMe,
  fetchVaults,
  fetchChats,
  fetchModels,
  uploadVault,
  fetchMcpToken,
  rotateMcpToken,
  type AuthUser,
  type ChatSummary,
  type LlmModel,
  type McpTokenInfo,
  type Vault,
  type UploadProgress as UploadProgressType,
} from '@/lib/api';

type View = 'vaults' | 'chat' | 'tests';

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<View>('vaults');
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedVault, setSelectedVault] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mcpToken, setMcpToken] = useState<McpTokenInfo | null>(null);
  const [mcpTokenLoading, setMcpTokenLoading] = useState(false);
  const [mcpTokenError, setMcpTokenError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressType | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [chatSearch, setChatSearch] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [models, setModels] = useState<LlmModel[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (!user || user.is_demo) {
      setMcpToken(null);
      setMcpTokenError(null);
      return;
    }
    loadMcpToken();
  }, [user]);

  const setMcpTokenState = async (
    action: () => Promise<McpTokenInfo | null>,
    logLabel: string,
    errorMessage: string
  ) => {
    setMcpTokenLoading(true);
    setMcpTokenError(null);
    try {
      const tokenInfo = await action();
      setMcpToken(tokenInfo);
    } catch (error) {
      console.error(logLabel, error);
      setMcpTokenError(errorMessage);
    } finally {
      setMcpTokenLoading(false);
    }
  };

  const loadUser = async () => {
    setAuthLoading(true);
    try {
      const currentUser = await fetchMe();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
    } finally {
      setAuthLoading(false);
      await loadVaults();
    }
  };

  useEffect(() => {
    let active = true;
    const loadModels = async () => {
      try {
        const list = await fetchModels();
        if (!active) return;
        setModels(list);
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    };
    loadModels();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setChatLoading(true);
      try {
        const list = await fetchChats(chatSearch.trim() || undefined);
        if (!active) return;
        setChats(list);
      } catch (error) {
        console.error('Failed to fetch chats:', error);
      } finally {
        if (active) setChatLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [chatSearch, user]);

  const loadMcpToken = async () => {
    await setMcpTokenState(fetchMcpToken, 'Failed to fetch MCP token:', 'Не удалось получить MCP токен');
  };

  const handleRotateToken = async () => {
    if (!user || user.is_demo) return;
    const confirmRotate = window.confirm('Пересоздать MCP токен? Старый токен перестанет работать.');
    if (!confirmRotate) return;
    await setMcpTokenState(rotateMcpToken, 'Failed to rotate MCP token:', 'Не удалось пересоздать MCP токен');
  };

  const loadVaults = async () => {
    try {
      const vaultsList = await fetchVaults();
      setVaults(Array.isArray(vaultsList) ? vaultsList : []);
    } catch (error) {
      console.error('Failed to fetch vaults:', error);
      setVaults([]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.zip')) {
      alert('Пожалуйста, загрузите .zip файл');
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadConfirm = async (file: File, vaultName: string) => {
    setIsUploading(true);
    setUploadProgress(null);

    try {
      const vaultId = await uploadVault(file, vaultName, (progress) => {
        setUploadProgress(progress);
      });

      if (vaultId) {
        await loadVaults();
        setTimeout(() => {
          resetUploadState();
        }, 2000);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
      setUploadProgress({
        stage: 'error',
        progress: 0,
        message: 'Ошибка загрузки',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const resetUploadState = () => {
    setSelectedFile(null);
    setIsUploading(false);
    setUploadProgress(null);
  };

  const handleCancelUpload = () => {
    resetUploadState();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSelectVault = (vaultId: string) => {
    setSelectedVault(vaultId);
    setView('chat');
  };

  const handleBackToVaults = () => {
    setView('vaults');
    setSelectedVault(null);
  };

  if (view === 'chat' && selectedVault) {
    return <ChatInterface vaultId={selectedVault} onBack={handleBackToVaults} />;
  }

  if (view === 'tests') {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border">
          <div className="max-w-6xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Тесты LLM</h1>
                <p className="text-muted-foreground mt-2 text-base">
                  Проверка корректности работы функций check_relevance и should_extend_context
                </p>
              </div>
              <Button onClick={() => setView('vaults')} variant="outline">
                Назад к хранилищам
              </Button>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto">
          <TestInterface />
        </div>
      </div>
    );
  }

  return (
    <>
      {selectedFile && (
        <UploadDialog
          file={selectedFile}
          onCancel={handleCancelUpload}
          onUpload={handleUploadConfirm}
          uploadProgress={uploadProgress}
          isUploading={isUploading}
        />
      )}
      <div
        className={`min-h-screen p-8 transition-colors ${
          isDragging ? 'bg-primary/10' : 'bg-background'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Obsidian RAG</h1>
              <p className="text-muted-foreground mt-2 text-base">
                RAG система для работы с Obsidian хранилищами знаний
              </p>
            </div>

            <div className="flex flex-col items-end gap-3">
              <AuthBar user={user} loading={authLoading} onLoggedOut={loadUser} />
              <div className="flex gap-3">
                <Button
                  onClick={() => router.push('/chats')}
                  variant="outline"
                  className="gap-2 font-medium"
                  size="lg"
                >
                  Чаты
                </Button>
                {user?.is_admin && (
                  <Button
                    onClick={() => router.push('/admin/models')}
                    variant="outline"
                    className="gap-2 font-medium"
                    size="lg"
                  >
                    Админка
                  </Button>
                )}
                <Button
                  onClick={() => setView('tests')}
                  variant="outline"
                  className="gap-2 font-medium"
                  size="lg"
                >
                  <FlaskConical className="w-4 h-4" />
                  Тесты
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-2 font-medium"
                  size="lg"
                >
                  <Upload className="w-4 h-4" />
                  Загрузить Vault
                </Button>
              </div>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
            <aside className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Чаты</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/chats')}>
                      Все
                    </Button>
                  </div>
                  <Input
                    value={chatSearch}
                    onChange={(event) => setChatSearch(event.target.value)}
                    placeholder="Поиск по чатам"
                  />
                </CardHeader>
                <CardContent className="pt-0">
                  <ScrollArea className="h-[420px] pr-3">
                    <div className="space-y-3">
                      {chatLoading && (
                        <div className="text-sm text-muted-foreground">Загрузка...</div>
                      )}
                      {!chatLoading && chats.length === 0 && (
                        <div className="text-sm text-muted-foreground">
                          Чатов пока нет.
                        </div>
                      )}
                      {chats.map((chat) => {
                        const model = models.find((item) => item.system_name === chat.model_name);
                        return (
                          <button
                            key={chat.id}
                            onClick={() => router.push(`/chats/${chat.id}?returnTo=/`)}
                            className="w-full rounded-lg border border-border/60 bg-card px-3 py-3 text-left transition hover:border-primary/60"
                          >
                            <div className="flex items-center gap-3">
                              {model?.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={model.avatar_url}
                                  alt={model.display_name}
                                  className="h-10 w-10 rounded-full border"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-muted" />
                              )}
                              <div>
                                <div className="text-sm font-semibold">
                                  {chat.title || 'Новый чат'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {model?.display_name || chat.model_name || 'Модель не выбрана'}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </aside>

            <main className="space-y-8">
              {!selectedFile && (
                <McpTokenCard
                  tokenInfo={mcpToken}
                  loading={mcpTokenLoading}
                  error={mcpTokenError}
                  isDemo={user?.is_demo ?? true}
                  onRotate={handleRotateToken}
                />
              )}
              {/* Drag overlay */}
              {isDragging && (
                <Card className="border-dashed border-2 border-primary bg-card/50 backdrop-blur">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <FileArchive className="w-20 h-20 text-primary mb-4" />
                    <p className="text-xl font-semibold">Отпустите файл для загрузки</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Принимаются только .zip файлы
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Vaults list */}
              {!selectedFile && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      Загруженные хранилища
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Выберите хранилище для начала работы
                    </p>
                  </div>
                  <VaultsList vaults={vaults} onSelectVault={handleSelectVault} />
                </div>
              )}

              {/* Empty state */}
              {!isDragging && !selectedFile && vaults.length === 0 && (
                <Card className="border-dashed border-2">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Начните работу</CardTitle>
                    <CardDescription className="text-base mt-2">
                      Перетащите .zip файл с Obsidian vault на эту страницу или нажмите кнопку
                      &quot;Загрузить Vault&quot;
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center py-12">
                    <FileArchive className="w-32 h-32 text-muted-foreground/50" />
                  </CardContent>
                </Card>
              )}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
