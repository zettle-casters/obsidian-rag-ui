'use client';

import { Button } from '@/components/ui/button';
import { loginWithGoogle, logout, type AuthUser } from '@/lib/api';
import { LogIn, LogOut, UserRound } from 'lucide-react';

interface AuthBarProps {
  user: AuthUser | null;
  loading?: boolean;
  onLoggedOut?: () => void;
}

export function AuthBar({ user, loading = false, onLoggedOut }: AuthBarProps) {
  const isDemo = user?.is_demo ?? true;
  const name = user?.name || user?.email || 'Демо воркспейс';

  const handleLogout = async () => {
    await logout();
    onLoggedOut?.();
  };

  return (
    <div className="flex items-center gap-3 rounded-full border border-border/60 bg-muted/40 px-3 py-2 shadow-sm">
      <div className="relative">
        {user?.avatar_url && !isDemo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar_url}
            alt={name}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-background"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRound className="h-4 w-4" />
          </div>
        )}
        <span
          className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${
            isDemo ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
        />
      </div>

      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">
          {loading ? 'Загрузка...' : name}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {isDemo ? 'Общий демо‑воркспейс' : 'Персональный доступ'}
        </div>
      </div>

      <div className="pl-2">
        {isDemo ? (
          <Button
            onClick={() => loginWithGoogle()}
            className="h-8 gap-2 rounded-full px-3 text-xs font-semibold"
            disabled={loading}
          >
            <LogIn className="h-3.5 w-3.5" />
            Войти с Google
          </Button>
        ) : (
          <Button
            onClick={handleLogout}
            variant="outline"
            className="h-8 gap-2 rounded-full px-3 text-xs font-semibold"
          >
            <LogOut className="h-3.5 w-3.5" />
            Выйти
          </Button>
        )}
      </div>
    </div>
  );
}
