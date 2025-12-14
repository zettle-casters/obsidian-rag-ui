'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, FileText } from 'lucide-react';
import type { Vault } from '@/lib/api';

interface VaultsListProps {
  vaults: Vault[];
  onSelectVault: (vaultId: string) => void;
}

export function VaultsList({ vaults, onSelectVault }: VaultsListProps) {
  if (vaults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground rounded-lg border-2 border-dashed border-border">
        <FolderOpen className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">Нет загруженных хранилищ</p>
        <p className="text-sm mt-1">Загрузите .zip файл с Obsidian vault</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {vaults.map((vault) => (
        <Card
          key={vault.vault_id}
          className="hover:border-primary hover:bg-accent/50 cursor-pointer transition-all duration-200 group"
          onClick={() => onSelectVault(vault.vault_id)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <FolderOpen className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold truncate">{vault.name}</CardTitle>
                <CardDescription className="font-mono text-xs mt-1">
                  {vault.vault_id.slice(0, 8)}...{vault.vault_id.slice(-8)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <FileText className="w-4 h-4" />
              <span>{vault.notes_count} заметок</span>
            </div>
            <Button
              variant="outline"
              className="w-full font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
              size="sm"
            >
              Открыть чат
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
