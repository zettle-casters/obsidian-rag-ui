'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileArchive } from 'lucide-react';
import { VaultsList } from '@/components/VaultsList';
import { UploadProgress } from '@/components/UploadProgress';
import { ChatInterface } from '@/components/ChatInterface';
import { fetchVaults, uploadVault, type Vault, type UploadProgress as UploadProgressType } from '@/lib/api';

type View = 'vaults' | 'chat';

export default function Home() {
  const [view, setView] = useState<View>('vaults');
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedVault, setSelectedVault] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressType | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadVaults();
  }, []);

  const loadVaults = async () => {
    try {
      const vaultsList = await fetchVaults();
      setVaults(Array.isArray(vaultsList) ? vaultsList : []);
    } catch (error) {
      console.error('Failed to fetch vaults:', error);
      setVaults([]);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      alert('Пожалуйста, загрузите .zip файл');
      return;
    }

    setIsUploading(true);
    setUploadProgress(null);

    try {
      const vaultId = await uploadVault(file, (progress) => {
        setUploadProgress(progress);
      });

      if (vaultId) {
        await loadVaults();
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(null);
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

  return (
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

          <div>
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

        {/* Upload progress */}
        {isUploading && uploadProgress && (
          <UploadProgress progress={uploadProgress} />
        )}

        {/* Vaults list */}
        {!isUploading && (
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
        {!isDragging && !isUploading && vaults.length === 0 && (
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
      </div>
    </div>
  );
}
