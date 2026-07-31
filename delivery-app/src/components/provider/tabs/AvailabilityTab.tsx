import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ServiceProvider } from '@/types';
import { cn } from '@/lib/utils';

interface Props { provider: ServiceProvider; onChange: (p: ServiceProvider) => void; }

const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export function AvailabilityTab({ provider, onChange }: Props) {
  const a = provider.availability;
  const set = (patch: Partial<typeof a>) => onChange({ ...provider, availability: { ...a, ...patch } });
  const toggleDay = (d: number) => {
    const next = a.days.includes(d) ? a.days.filter(x => x !== d) : [...a.days, d].sort();
    set({ days: next });
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="font-medium">Atendimento sob agenda</p>
          <p className="text-sm text-muted-foreground">Cliente solicita e você confirma — sem horários fixos.</p>
        </div>
        <Switch checked={!!a.onDemand} onCheckedChange={v => set({ onDemand: v })} />
      </div>

      {!a.onDemand && (
        <>
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Dias da semana</h3>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d, i) => {
                const on = a.days.includes(i);
                return (
                  <button key={i} type="button" onClick={() => toggleDay(i)}
                    className={cn('rounded-full border px-4 py-2 text-sm transition-colors',
                      on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground hover:text-foreground')}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-card border rounded-xl p-4 grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Das</Label>
              <Input type="time" value={a.from} onChange={e => set({ from: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Até</Label>
              <Input type="time" value={a.to} onChange={e => set({ to: e.target.value })} />
            </div>
          </div>
        </>
      )}

      <div className="bg-card border rounded-xl p-4 space-y-1.5">
        <Label>Observações</Label>
        <Textarea rows={3} value={a.note || ''} onChange={e => set({ note: e.target.value || undefined })} placeholder="Ex: atendimento de urgência 24h" />
      </div>
    </div>
  );
}
