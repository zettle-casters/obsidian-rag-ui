'use client';

import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';
import type { UploadProgress as UploadProgressType } from '@/lib/api';

interface UploadProgressProps {
  progress: UploadProgressType;
}

const stageNames: Record<string, string> = {
  extracting: 'Распаковка архива',
  parsing: 'Парсинг файлов',
  initializing: 'Инициализация',
  processing: 'Обработка заметок',
  storing: 'Сохранение в БД',
  linking: 'Построение связей',
  complete: 'Завершено',
  error: 'Ошибка',
};

export function UploadProgress({ progress }: UploadProgressProps) {
  const isComplete = progress.stage === 'complete';
  const isError = progress.stage === 'error';

  return (
    <Card className={isError ? 'border-destructive' : ''}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="w-5 h-5 text-primary" />
          ) : isError ? (
            <span className="text-destructive">✕</span>
          ) : (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          )}
          <CardTitle className="text-base">
            {stageNames[progress.stage] || progress.stage}
          </CardTitle>
        </div>
        <CardDescription className="text-sm">
          {progress.message}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(progress.progress)}%</span>
            {progress.elapsed && (
              <span>
                {progress.elapsed}
                {progress.eta && ` / осталось ~${progress.eta}`}
              </span>
            )}
          </div>
          <Progress value={progress.progress} />
        </div>

        {isComplete && progress.vault_id && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">Vault ID:</p>
            <code className="text-xs bg-muted p-1 rounded block mt-1 break-all">
              {progress.vault_id}
            </code>
            {progress.notes_count && (
              <p className="text-xs text-muted-foreground mt-2">
                Обработано заметок: {progress.notes_count}
              </p>
            )}
          </div>
        )}

        {isError && progress.error && (
          <div className="pt-2 border-t border-destructive">
            <p className="text-xs text-destructive">{progress.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
