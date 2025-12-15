'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UploadProgress } from '@/components/UploadProgress';
import { FileArchive, X } from 'lucide-react';
import type { UploadProgress as UploadProgressType } from '@/lib/api';

interface UploadDialogProps {
  file: File;
  onCancel: () => void;
  onUpload: (file: File, vaultName: string) => void;
  uploadProgress: UploadProgressType | null;
  isUploading: boolean;
}

export function UploadDialog({
  file,
  onCancel,
  onUpload,
  uploadProgress,
  isUploading,
}: UploadDialogProps) {
  const [vaultName, setVaultName] = useState('');

  useEffect(() => {
    // Извлекаем имя файла без расширения .zip
    const fileName = file.name.replace(/\.zip$/i, '');
    setVaultName(fileName);
  }, [file]);

  const handleUpload = () => {
    if (vaultName.trim()) {
      onUpload(file, vaultName.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileArchive className="w-6 h-6 text-primary" />
              <div>
                <CardTitle className="text-xl">Загрузка хранилища</CardTitle>
                <CardDescription className="mt-1">
                  Файл: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} МБ)
                </CardDescription>
              </div>
            </div>
            {!isUploading && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isUploading ? (
            <>
              <div className="space-y-2">
                <label htmlFor="vault-name" className="text-sm font-medium">
                  Название хранилища
                </label>
                <Input
                  id="vault-name"
                  value={vaultName}
                  onChange={(e) => setVaultName(e.target.value)}
                  placeholder="Введите название хранилища"
                  className="w-full"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && vaultName.trim()) {
                      handleUpload();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Это имя будет использоваться для идентификации хранилища
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={onCancel}>
                  Отмена
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!vaultName.trim()}
                  className="gap-2"
                >
                  Загрузить
                </Button>
              </div>
            </>
          ) : (
            uploadProgress && <UploadProgress progress={uploadProgress} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
