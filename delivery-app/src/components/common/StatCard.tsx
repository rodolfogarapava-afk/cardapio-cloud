import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatTone = 'primary' | 'success' | 'warning' | 'info' | 'destructive' | 'muted';

const TONE: Record<StatTone, { bg: string; text: string; ring: string }> = {
  primary:     { bg: 'bg-primary/10',     text: 'text-primary',          ring: 'ring-primary/20' },
  success:     { bg: 'bg-success/10',     text: 'text-success',          ring: 'ring-success/20' },
  warning:     { bg: 'bg-warning/10',     text: 'text-warning',          ring: 'ring-warning/20' },
  info:        { bg: 'bg-info/10',        text: 'text-info',             ring: 'ring-info/20' },
  destructive: { bg: 'bg-destructive/10', text: 'text-destructive',      ring: 'ring-destructive/20' },
  muted:       { bg: 'bg-muted',          text: 'text-muted-foreground', ring: 'ring-border' },
};

interface Props {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: StatTone;
  hint?: string;
  change?: string;
  up?: boolean;
  valueClassName?: string;
  className?: string;
}

/**
 * StatCard — molde único para números em destaque (admin, vendor, provider).
 * Peso padronizado: font-bold tabular-nums.
 */
export function StatCard({
  label, value, icon: Icon, tone = 'primary', hint, change, up, valueClassName, className,
}: Props) {
  const t = TONE[tone];
  return (
    <div className={cn(
      'group relative overflow-hidden bg-card rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow',
      className,
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className={cn('text-2xl font-bold tabular-nums tracking-tight mt-1', valueClassName)}>
            {value}
          </p>
          {hint && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ring-1', t.bg, t.ring)}>
            <Icon className={cn('h-4 w-4', t.text)} />
          </div>
        )}
      </div>
      {change && (
        <p className={cn(
          'text-xs font-medium flex items-center gap-1 mt-3',
          up ? 'text-success' : 'text-destructive',
        )}>
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change} <span className="text-muted-foreground font-normal">vs. mês passado</span>
        </p>
      )}
    </div>
  );
}
