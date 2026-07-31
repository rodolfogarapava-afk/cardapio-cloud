import { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Link2, Unlink, Plus, Check, X, Settings2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Google "G" inline icon (cores oficiais)
const GoogleG = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.2 5.2C41.4 35 44 30 44 24c0-1.3-.1-2.3-.4-3.5z"/>
  </svg>
);

import { ServiceProvider } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  addDays,
  ymd,
  generateSlots,
  getGoogleBusy,
  useBookings,
  setBookingStatus,
} from '@/data/bookings';

interface Props {
  provider: ServiceProvider;
  onChange: (p: ServiceProvider) => void;
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function AgendaTab({ provider, onChange }: Props) {
  const a = provider.availability;
  const set = (patch: Partial<typeof a>) => onChange({ ...provider, availability: { ...a, ...patch } });
  const toggleDay = (d: number) => {
    const next = a.days.includes(d) ? a.days.filter(x => x !== d) : [...a.days, d].sort();
    set({ days: next });
  };
  const slotDur = a.slotDurationMin || 30;

  const [weekStart, setWeekStart] = useState(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  });
  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart]);

  const allBookings = useBookings();
  const bookings = useMemo(() => allBookings.filter(b => b.providerId === provider.id), [allBookings, provider.id]);
  const busy = useMemo(() => getGoogleBusy(provider, 30), [provider]);
  const slots = useMemo(() => generateSlots(a), [a]);

  const bookedMap = new Map<string, typeof bookings[number]>();
  bookings.filter(b => b.status !== 'cancelled').forEach(b => bookedMap.set(`${b.date}|${b.slot}`, b));
  const busySet = new Set(busy.map(b => `${b.date}|${b.slot}`));

  const toggleGoogle = () => {
    const next = !provider.externalCalendar?.connected;
    onChange({
      ...provider,
      externalCalendar: { provider: 'google', connected: next, calendarId: next ? 'primary' : undefined },
    });
    toast.success(next ? 'Google Agenda conectada (mock)' : 'Google Agenda desconectada');
  };

  const upcoming = useMemo(
    () =>
      bookings
        .filter(b => b.status === 'pending' || b.status === 'confirmed')
        .sort((x, y) => (x.date + x.slot).localeCompare(y.date + y.slot))
        .slice(0, 5),
    [bookings],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-info/20 bg-info/5 p-3 flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-info/10 text-info flex items-center justify-center shrink-0 ring-1 ring-info/20">
          <Calendar className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">Agenda <span className="text-info">(opcional)</span></p>
          <p className="text-xs text-muted-foreground">Você pode atender sob demanda via WhatsApp ou configurar horários fixos para receber agendamentos.</p>
        </div>
      </div>
      {/* Header de integração + sob agenda */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-card border rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <GoogleG size={18} />
              <p className="font-medium truncate">Google Agenda</p>
              {provider.externalCalendar?.connected && (
                <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-[10px]">Conectada</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {provider.externalCalendar?.connected
                ? 'Eventos do Google aparecem como blocos ocupados.'
                : 'Sincronize para evitar conflitos de horário.'}
            </p>
          </div>
          <Button variant={provider.externalCalendar?.connected ? 'outline' : 'default'} size="sm" onClick={toggleGoogle} className="gap-1.5 shrink-0">
            {provider.externalCalendar?.connected ? <><Unlink className="h-4 w-4" /> Desconectar</> : <><Link2 className="h-4 w-4" /> Conectar</>}
          </Button>
        </div>

        <div className="bg-card border rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">Atendimento sob agenda</p>
            <p className="text-xs text-muted-foreground mt-0.5">Cliente solicita e você confirma — sem horários fixos.</p>
          </div>
          <Switch checked={!!a.onDemand} onCheckedChange={v => set({ onDemand: v })} />
        </div>
      </div>

      {!a.onDemand && (
        <>
          {/* Configurações de horários */}
          <div className="bg-card border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><Settings2 className="h-4 w-4 text-muted-foreground" /> Configurações</h3>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Dias da semana</p>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d, i) => {
                  const on = a.days.includes(i);
                  return (
                    <button key={i} type="button" onClick={() => toggleDay(i)}
                      className={cn('rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground hover:text-foreground')}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Das</Label><Input type="time" value={a.from} onChange={e => set({ from: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Até</Label><Input type="time" value={a.to} onChange={e => set({ to: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duração de cada atendimento</Label>
                <select value={slotDur} onChange={e => set({ slotDurationMin: Number(e.target.value) })}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observações</Label>
              <Textarea rows={2} value={a.note || ''} onChange={e => set({ note: e.target.value || undefined })} placeholder="Ex: atendimento de urgência 24h" />
            </div>
          </div>

          {/* Grade semanal */}
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> Agenda da semana</h3>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => { const t = new Date(); t.setHours(0,0,0,0); setWeekStart(t); }}>Hoje</Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="flex gap-2 text-[10px] text-muted-foreground flex-wrap">
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-background border" /> Livre</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-primary/15 border border-primary/30" /> Agendado</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-warning/20 border border-warning/40" /> Google</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-muted border" /> Fora do expediente</span>
            </div>

            <div className="overflow-x-auto -mx-4 px-4">
              <div className="min-w-[560px] grid" style={{ gridTemplateColumns: '64px repeat(7, minmax(0, 1fr))' }}>
                {/* header */}
                <div />
                {days.map((d, i) => {
                  const isToday = ymd(d) === ymd(new Date());
                  return (
                    <div key={i} className={cn('text-center py-2 text-xs border-b', isToday && 'text-primary font-semibold')}>
                      <div>{DAYS[d.getDay()]}</div>
                      <div className="text-[10px] text-muted-foreground">{String(d.getDate()).padStart(2, '0')}/{String(d.getMonth()+1).padStart(2,'0')}</div>
                    </div>
                  );
                })}

                {/* rows */}
                {slots.length === 0 && (
                  <div className="col-span-8 text-center text-xs text-muted-foreground py-6">
                    Configure horário e duração para gerar os slots.
                  </div>
                )}
                {slots.map(slot => (
                  <div key={slot} className="contents">
                    <div className="text-[10px] text-muted-foreground py-1.5 pr-2 text-right tabular-nums border-r">{slot}</div>
                    {days.map((d, i) => {
                      const date = ymd(d);
                      const dayEnabled = a.days.includes(d.getDay());
                      const key = `${date}|${slot}`;
                      const booked = bookedMap.get(key);
                      const isGoogle = busySet.has(key);
                      return (
                        <div
                          key={i}
                          className={cn(
                            'border-b border-r last:border-r-0 h-7 text-[10px] flex items-center justify-center transition-colors',
                            !dayEnabled && 'bg-muted/60 text-muted-foreground',
                            dayEnabled && !booked && !isGoogle && 'hover:bg-primary/5 cursor-default',
                            booked && 'bg-primary/15 text-primary font-medium',
                            isGoogle && !booked && 'bg-warning/20 text-warning-foreground',
                          )}
                          title={booked ? `${booked.clientName} • ${slot}` : isGoogle ? 'Ocupado (Google)' : undefined}
                        >
                          {booked ? booked.clientName.split(' ')[0] : isGoogle ? 'G' : ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Próximos agendamentos */}
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-muted-foreground" /> Próximos agendamentos</h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum agendamento ainda.</p>
            ) : (
              <ul className="divide-y">
                {upcoming.map(b => (
                  <li key={b.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{b.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.date.split('-').reverse().join('/')} às {b.slot} • <span className={cn('font-medium', b.status === 'confirmed' ? 'text-success' : 'text-warning')}>{b.status === 'confirmed' ? 'Confirmado' : 'Pendente'}</span>
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {b.status === 'pending' && (
                        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => { setBookingStatus(b.id, 'confirmed'); toast.success('Agendamento confirmado'); }}>
                          <Check className="h-3.5 w-3.5" /> Confirmar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-8 gap-1 text-muted-foreground hover:text-destructive" onClick={() => { setBookingStatus(b.id, 'cancelled'); toast('Agendamento cancelado'); }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
