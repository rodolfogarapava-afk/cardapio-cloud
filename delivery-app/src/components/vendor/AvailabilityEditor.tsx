import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AvailabilitySchedule } from '@/types';
import { DAY_LABELS, DEFAULT_SCHEDULE } from '@/lib/availability';

interface Props {
  value?: AvailabilitySchedule;
  onChange: (v: AvailabilitySchedule) => void;
  /** Descrição curta a mostrar acima; ex.: "Quando esta promo vale". */
  hint?: string;
}

export function AvailabilityEditor({ value, onChange, hint }: Props) {
  const v = value ?? DEFAULT_SCHEDULE;

  const patch = (p: Partial<AvailabilitySchedule>) =>
    onChange({ ...v, ...p });

  const toggleDay = (d: number) => {
    const set = new Set(v.days);
    if (set.has(d)) set.delete(d);
    else set.add(d);
    patch({ days: Array.from(set).sort((a, b) => a - b) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Label className="text-sm font-medium">
            Disponível sempre que a loja estiver aberta
          </Label>
          {hint && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
          )}
        </div>
        <Switch
          checked={v.alwaysWhenOpen}
          onCheckedChange={(x) => patch({ alwaysWhenOpen: x })}
        />
      </div>

      {!v.alwaysWhenOpen && (
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Dias da semana
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, d) => {
                const active = v.days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={cn(
                      'h-8 min-w-[44px] px-2.5 rounded-full text-xs font-medium border transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Início
              </Label>
              <Input
                type="time"
                value={v.startTime}
                onChange={(e) => patch({ startTime: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Fim
              </Label>
              <Input
                type="time"
                value={v.endTime}
                onChange={(e) => patch({ endTime: e.target.value })}
                className="h-9"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
