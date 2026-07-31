import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  variant?: 'icon' | 'inline';
}

export function ThemeToggle({ className, variant = 'icon' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? (theme === 'system' ? resolvedTheme : theme) : 'light';
  const isDark = current === 'dark';

  const toggle = () => setTheme(isDark ? 'light' : 'dark');
  const label = isDark ? 'Ativar modo claro' : 'Ativar modo escuro';

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        className={cn(
          'w-full flex items-center gap-3 px-5 py-4 text-sm font-medium hover:bg-muted transition-colors',
          className
        )}
      >
        {isDark ? <Sun className="h-4 w-4 text-primary" /> : <Moon className="h-4 w-4 text-primary" />}
        <span className="flex-1 text-left">{isDark ? 'Modo claro' : 'Modo escuro'}</span>
        <span className="text-xs text-muted-foreground">{isDark ? 'Claro' : 'Escuro'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center h-9 w-9 rounded-full border bg-card text-foreground hover:bg-muted transition-colors',
        className
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
