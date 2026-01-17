'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Copy, Eye, EyeOff, KeyRound, RefreshCw } from 'lucide-react';
import type { McpTokenInfo } from '@/lib/api';

interface McpTokenCardProps {
  tokenInfo: McpTokenInfo | null;
  loading: boolean;
  error?: string | null;
  isDemo: boolean;
  onRotate: () => Promise<void>;
}

export function McpTokenCard({ tokenInfo, loading, error, isDemo, onRotate }: McpTokenCardProps) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const createdAt = useMemo(() => {
    if (!tokenInfo?.created_at) return '—';
    return new Date(tokenInfo.created_at).toLocaleString('ru-RU');
  }, [tokenInfo?.created_at]);

  const lastUsedAt = useMemo(() => {
    if (!tokenInfo?.last_used_at) return '—';
    return new Date(tokenInfo.last_used_at).toLocaleString('ru-RU');
  }, [tokenInfo?.last_used_at]);

  const handleCopy = async () => {
    if (!tokenInfo?.token) return;
    await navigator.clipboard.writeText(tokenInfo.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Card className="border-border/60 bg-gradient-to-br from-background via-background to-muted/40">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <KeyRound className="h-3.5 w-3.5" />
            MCP доступ
          </div>
          <CardTitle className="text-xl">Токен подключения</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Используется для доступа к MCP инструментам и вашему набору vault&apos;ов.
          </CardDescription>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>Создан: {createdAt}</div>
          <div>Последнее использование: {lastUsedAt}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isDemo ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
            Войдите через Google, чтобы получить персональный MCP токен.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex-1">
                <Input
                  readOnly
                  value={tokenInfo?.token || ''}
                  type={revealed ? 'text' : 'password'}
                  className="font-mono text-xs md:text-sm"
                  placeholder={loading ? 'Загрузка токена...' : 'Токен ещё не создан'}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRevealed((prev) => !prev)}
                  className="h-9 w-9 p-0"
                  disabled={loading}
                >
                  {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopy}
                  className="h-9 w-9 p-0"
                  disabled={!tokenInfo?.token || loading}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onRotate}
                  className="h-9 gap-2 px-3 text-xs font-semibold"
                  disabled={loading}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Пересоздать
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              MCP HTTP: <span className="font-mono">Authorization: Bearer &lt;token&gt;</span>
              <br />
              MCP stdio: <span className="font-mono">MCP_AUTH_TOKEN=&lt;token&gt;</span>
            </div>
            {copied && (
              <div className="text-xs font-semibold text-emerald-500">Скопировано в буфер обмена</div>
            )}
            {error && (
              <div className="text-xs font-semibold text-red-500">{error}</div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
