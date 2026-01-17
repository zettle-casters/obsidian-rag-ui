'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  createModel,
  fetchMe,
  fetchModels,
  updateModel,
  type AuthUser,
  type LlmModel,
} from '@/lib/api';

const emptyModel = {
  display_name: '',
  system_name: '',
  description: '',
  avatar_url: '',
  is_enabled: true,
};

export default function AdminModelsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [models, setModels] = useState<LlmModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newModel, setNewModel] = useState({ ...emptyModel });
  const [createError, setCreateError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const currentUser = await fetchMe();
        if (!active) return;
        setUser(currentUser);
        if (!currentUser?.is_admin) return;
        const modelsList = await fetchModels(true);
        if (!active) return;
        setModels(modelsList);
      } catch (error) {
        console.error('Failed to load admin models:', error);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const handleFileChange = (modelId: string, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString();
      if (!result) return;
      setModels((prev) =>
        prev.map((model) =>
          model.id === modelId ? { ...model, avatar_url: result } : model
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const handleCreateAvatar = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString() || '';
      setNewModel((prev) => ({ ...prev, avatar_url: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreateModel = async () => {
    setCreateError(null);
    if (!newModel.display_name.trim() || !newModel.system_name.trim()) {
      setCreateError('Название и системное имя обязательны.');
      return;
    }
    try {
      const created = await createModel({
        display_name: newModel.display_name.trim(),
        system_name: newModel.system_name.trim(),
        description: newModel.description?.trim() || undefined,
        avatar_url: newModel.avatar_url || undefined,
        is_enabled: newModel.is_enabled,
      });
      setModels((prev) => [created, ...prev]);
      setNewModel({ ...emptyModel });
      setCreateOpen(false);
    } catch (error) {
      console.error('Failed to create model:', error);
      setCreateError('Не удалось создать модель.');
    }
  };

  const handleSaveModel = async (model: LlmModel) => {
    setSavingId(model.id);
    try {
      const updated = await updateModel(model.id, {
        display_name: model.display_name,
        system_name: model.system_name,
        description: model.description,
        avatar_url: model.avatar_url,
        is_enabled: model.is_enabled,
      });
      setModels((prev) => prev.map((item) => (item.id === model.id ? updated : item)));
    } catch (error) {
      console.error('Failed to update model:', error);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-8 py-10 text-muted-foreground">
        Загрузка...
      </div>
    );
  }

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-background px-8 py-10 text-muted-foreground">
        Доступ запрещен.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-8 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Админка моделей</h1>
            <p className="text-muted-foreground mt-2 text-base">
              Управление доступными LLM-моделями для чатов.
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>Добавить модель</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новая модель</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Название</label>
                  <Input
                    value={newModel.display_name}
                    onChange={(event) => setNewModel({ ...newModel, display_name: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Системное имя</label>
                  <Input
                    value={newModel.system_name}
                    onChange={(event) => setNewModel({ ...newModel, system_name: event.target.value })}
                    placeholder="openrouter/model"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Описание</label>
                  <textarea
                    value={newModel.description}
                    onChange={(event) => setNewModel({ ...newModel, description: event.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Аватар</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleCreateAvatar(event.target.files?.[0])}
                    className="block text-sm"
                  />
                  {newModel.avatar_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={newModel.avatar_url} alt="avatar" className="h-16 w-16 rounded-full border" />
                  )}
                </div>
                {createError && <p className="text-sm text-destructive">{createError}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleCreateModel}>Создать</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {models.map((model) => (
            <Card key={model.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {model.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={model.avatar_url} alt={model.display_name} className="h-10 w-10 rounded-full border" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted" />
                  )}
                  {model.display_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Название</label>
                    <Input
                      value={model.display_name}
                      onChange={(event) =>
                        setModels((prev) =>
                          prev.map((item) =>
                            item.id === model.id ? { ...item, display_name: event.target.value } : item
                          )
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Системное имя</label>
                    <Input
                      value={model.system_name}
                      onChange={(event) =>
                        setModels((prev) =>
                          prev.map((item) =>
                            item.id === model.id ? { ...item, system_name: event.target.value } : item
                          )
                        )
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Описание</label>
                  <textarea
                    value={model.description || ''}
                    onChange={(event) =>
                      setModels((prev) =>
                        prev.map((item) =>
                          item.id === model.id ? { ...item, description: event.target.value } : item
                        )
                      )
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleFileChange(model.id, event.target.files?.[0])}
                      className="text-sm"
                    />
                    Загрузить аватар
                  </label>
                  <Button
                    variant={model.is_enabled ? 'outline' : 'default'}
                    size="sm"
                    onClick={() =>
                      setModels((prev) =>
                        prev.map((item) =>
                          item.id === model.id ? { ...item, is_enabled: !item.is_enabled } : item
                        )
                      )
                    }
                  >
                    {model.is_enabled ? 'Отключить' : 'Включить'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSaveModel(model)}
                    disabled={savingId === model.id}
                  >
                    {savingId === model.id ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {models.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                Модели пока не настроены.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
