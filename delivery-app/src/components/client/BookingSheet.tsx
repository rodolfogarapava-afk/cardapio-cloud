import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check } from 'lucide-react';
import { ServiceProvider } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { addDays, ymd, generateSlots, getGoogleBusy, useBookings, addBooking, parseHHMM } from '@/data/bookings';

interface Props {
  provider: ServiceProvider;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function BookingSheet({ provider, open, onOpenChange }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState<{ date: string; slot: string } | null>(null);

  const bookings = useBookings();
  const busy = useMemo(() => getGoogleBusy(provider, 14), [provider, open]);
  const slots = useMemo(() => generateSlots(provider.availability), [provider]);

  const days = useMemo(() => {
    const out: { date: string; label: string; sub: string; enabled: boolean }[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = addDays(today, i);
      out.push({
        date: ymd(d),
        label: i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : DAY_NAMES[d.getDay()],
        sub: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        enabled: provider.availability.days.includes(d.getDay()),
      });
    }
    return out;
  }, [provider, open]);

  const takenSet = useMemo(() => {
    const s = new Set(busy.map(b => `${b.date}|${b.slot}`));
    bookings
      .filter(b => b.providerId === provider.id && b.status !== 'cancelled')
      .forEach(b => s.add(`${b.date}|${b.slot}`));
    return s;
  }, [bookings, busy, provider.id]);

  const slotList = useMemo(() => {
    if (!selectedDate) return [];
    const isToday = selectedDate === ymd(new Date());
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    return slots.map(s => ({
      slot: s,
      taken: takenSet.has(`${selectedDate}|${s}`),
      past: isToday && parseHHMM(s) <= nowMin,
    }));
  }, [selectedDate, slots, takenSet]);

  const reset = () => {
    setSelectedDate(null);
    setSelectedSlot(null);
    setName('');
    setNote('');
    setDone(null);
  };

  const confirm = () => {
    if (!selectedDate || !selectedSlot || !name.trim()) {
      toast.error('Preencha seu nome, dia e horário.');
      return;
    }
    addBooking({
      providerId: provider.id,
      clientName: name.trim(),
      date: selectedDate,
      slot: selectedSlot,
      note: note.trim() || undefined,
    });
    setDone({ date: selectedDate, slot: selectedSlot });
    toast.success('Agendamento confirmado!');
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setTimeout(reset, 200); }}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b text-left">
          <SheetTitle className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Agendar com {provider.name}</SheetTitle>
          <SheetDescription className="text-xs">
            Serviço remoto — você receberá a confirmação por WhatsApp.
          </SheetDescription>
        </SheetHeader>

        {done ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-4">
            <div className="h-14 w-14 rounded-full bg-success/15 text-success flex items-center justify-center">
              <Check className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Tudo certo!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Agendado para <span className="font-medium text-foreground">{done.date.split('-').reverse().join('/')}</span> às <span className="font-medium text-foreground">{done.slot}</span>.
              </p>
            </div>
            <Button onClick={() => onOpenChange(false)} className="w-full">Fechar</Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Escolha o dia</p>
                <div className="flex gap-2 overflow-x-auto -mx-4 px-4 scrollbar-hide">
                  {days.map(d => {
                    const active = selectedDate === d.date;
                    return (
                      <button
                        key={d.date}
                        disabled={!d.enabled}
                        onClick={() => { setSelectedDate(d.date); setSelectedSlot(null); }}
                        className={cn(
                          'shrink-0 rounded-xl border px-3 py-2 text-center transition-colors min-w-[68px]',
                          !d.enabled && 'opacity-40 cursor-not-allowed',
                          active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted',
                        )}
                      >
                        <div className="text-[10px] uppercase tracking-wider opacity-80">{d.label}</div>
                        <div className="text-sm font-semibold tabular-nums">{d.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedDate && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Horários livres</p>
                  {slotList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem horários configurados.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slotList.map(s => {
                        const disabled = s.taken || s.past;
                        const active = selectedSlot === s.slot;
                        return (
                          <button
                            key={s.slot}
                            disabled={disabled}
                            onClick={() => setSelectedSlot(s.slot)}
                            className={cn(
                              'rounded-lg border h-10 text-sm font-medium tabular-nums transition-colors',
                              disabled && 'bg-muted text-muted-foreground line-through opacity-60 cursor-not-allowed',
                              !disabled && (active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-primary/5'),
                            )}
                          >
                            {s.slot}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {slotList.some(s => s.taken) && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      <Badge variant="secondary" className="text-[10px] mr-1">Indisponível</Badge>
                      horários já reservados ou bloqueados na agenda.
                    </p>
                  )}
                </div>
              )}

              {selectedSlot && (
                <div className="space-y-3 border-t pt-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Seu nome</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Como devemos te chamar?" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Observação (opcional)</Label>
                    <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Descreva brevemente o que você precisa" />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t p-4 bg-background">
              <Button onClick={confirm} disabled={!selectedSlot || !name.trim()} className="w-full" size="lg">
                Confirmar agendamento
                {selectedSlot && <span className="ml-1 opacity-80">• {selectedDate?.split('-').reverse().join('/')} {selectedSlot}</span>}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
