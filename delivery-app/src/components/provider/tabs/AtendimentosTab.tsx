import { useMemo, useState } from 'react';
import { ClipboardList, Clock, CheckCircle2, XCircle, Phone, MessageCircle, MapPin, StickyNote, User, Calendar, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SectionCard } from '@/components/provider/SectionCard';
import { BrandIcon } from '@/components/common/BrandIcon';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useBookings, setBookingStatus, ymd } from '@/data/bookings';
import { ServiceProvider, Booking } from '@/types';

interface Props {
  provider: ServiceProvider;
}

type StatusKey = Booking['status'];

const STATUS_META: Record<StatusKey, { label: string; bar: string; dot: string; icon: typeof Clock }> = {
  pending:   { label: 'Pendente',   bar: 'bg-warning',     dot: 'bg-warning',     icon: Clock },
  confirmed: { label: 'Confirmado', bar: 'bg-info',        dot: 'bg-info',        icon: CheckCircle2 },
  done:      { label: 'Concluído',  bar: 'bg-success',     dot: 'bg-success',     icon: CheckCircle2 },
  cancelled: { label: 'Cancelado',  bar: 'bg-destructive', dot: 'bg-destructive', icon: XCircle },
};

const FILTERS: { key: StatusKey; label: string }[] = [
  { key: 'pending',   label: 'Pendentes' },
  { key: 'confirmed', label: 'Confirmados' },
  { key: 'done',      label: 'Concluídos' },
  { key: 'cancelled', label: 'Cancelados' },
];

const onlyDigits = (s?: string) => (s ? s.replace(/\D+/g, '') : '');
const formatDate = (d: string) => {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
};

export function AtendimentosTab({ provider }: Props) {
  const all = useBookings();
  const mine = useMemo(() => all.filter(b => b.providerId === provider.id), [all, provider.id]);

  const [filter, setFilter] = useState<StatusKey>('pending');
  const [detail, setDetail] = useState<Booking | null>(null);

  const counts = useMemo(() => ({
    pending:   mine.filter(b => b.status === 'pending').length,
    confirmed: mine.filter(b => b.status === 'confirmed').length,
    done:      mine.filter(b => b.status === 'done').length,
    cancelled: mine.filter(b => b.status === 'cancelled').length,
  }), [mine]);

  const today = ymd(new Date());
  const pendingToday = mine.filter(b => b.status === 'pending' && b.date === today).length;
  const confirmedToday = mine.filter(b => b.status === 'confirmed' && b.date === today).length;

  const list = useMemo(() => {
    return [...mine]
      .filter(b => b.status === filter)
      .sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));
  }, [mine, filter]);

  const accept = (b: Booking) => {
    setBookingStatus(b.id, 'confirmed');
    toast.success(`Solicitação de ${b.clientName} confirmada.`);
  };
  const cancel = (b: Booking) => {
    setBookingStatus(b.id, 'cancelled');
    toast.info(`Solicitação de ${b.clientName} cancelada.`);
  };
  const complete = (b: Booking) => {
    setBookingStatus(b.id, 'done');
    toast.success(`Atendimento de ${b.clientName} concluído!`);
  };

  const waLink = (b: Booking) => {
    const digits = onlyDigits(b.clientPhone);
    const msg = encodeURIComponent(
      `Olá, ${b.clientName}! Sou de ${provider.name}. Estou entrando em contato sobre sua solicitação (${b.service ?? 'serviço'}) para ${formatDate(b.date)} às ${b.slot}.`,
    );
    return digits ? `https://wa.me/55${digits}?text=${msg}` : null;
  };
  const telLink = (b: Booking) => {
    const digits = onlyDigits(b.clientPhone);
    return digits ? `tel:+55${digits}` : null;
  };

  return (
    <div className="space-y-4">
      {/* Resumo do dia */}
      <SectionCard
        icon={Sparkles}
        title="Resumo de hoje"
        subtitle={`${pendingToday} pendente${pendingToday === 1 ? '' : 's'} e ${confirmedToday} confirmado${confirmedToday === 1 ? '' : 's'} para atender hoje`}
        accent="primary"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(STATUS_META) as StatusKey[]).map(k => {
            const meta = STATUS_META[k];
            const Icon = meta.icon;
            const isActive = filter === k;
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={cn(
                  'group rounded-xl border p-3 text-left transition-all',
                  isActive
                    ? 'border-primary/40 bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/20 hover:bg-muted/40',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-lg', meta.bar, 'bg-opacity-15')}>
                    <Icon className={cn('h-3.5 w-3.5', k === 'pending' && 'text-warning', k === 'confirmed' && 'text-info', k === 'done' && 'text-success', k === 'cancelled' && 'text-destructive')} />
                  </span>
                  <span className="text-2xl font-bold tabular-nums leading-none">{counts[k]}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{meta.label}</p>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* Lista filtrada */}
      <SectionCard
        icon={ClipboardList}
        title={STATUS_META[filter].label}
        subtitle={`${list.length} solicitaç${list.length === 1 ? 'ão' : 'ões'}`}
        accent={filter === 'pending' ? 'warning' : filter === 'confirmed' ? 'info' : filter === 'done' ? 'success' : 'destructive'}
      >
        {list.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nada por aqui"
            description={
              filter === 'pending'
                ? 'Assim que um cliente solicitar seu serviço, aparecerá aqui.'
                : `Sem atendimentos ${STATUS_META[filter].label.toLowerCase()} no momento.`
            }
          />
        ) : (
          <ul className="space-y-3">
            {list.map(b => {
              const meta = STATUS_META[b.status];
              const wa = waLink(b);
              const tel = telLink(b);
              return (
                <li
                  key={b.id}
                  className="relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/30"
                >
                  <span className={cn('absolute left-0 top-0 bottom-0 w-1', meta.bar)} />
                  <div className="p-4 pl-5 space-y-3">
                    {/* Topo: cliente + data */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{b.clientName}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            {formatDate(b.date)} · {b.slot}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        'shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        b.status === 'pending' && 'border-warning/30 bg-warning/10 text-warning',
                        b.status === 'confirmed' && 'border-info/30 bg-info/10 text-info',
                        b.status === 'done' && 'border-success/30 bg-success/10 text-success',
                        b.status === 'cancelled' && 'border-destructive/30 bg-destructive/10 text-destructive',
                      )}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                        {meta.label}
                      </span>
                    </div>

                    {/* Serviço + observação */}
                    {b.service && (
                      <p className="text-sm text-foreground line-clamp-2">
                        <span className="text-muted-foreground">Serviço: </span>{b.service}
                      </p>
                    )}
                    {b.note && (
                      <p className="text-xs text-muted-foreground flex items-start gap-1.5 line-clamp-2">
                        <StickyNote className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        {b.note}
                      </p>
                    )}

                    {/* Ações */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
                      {/* Contato */}
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex">
                          <Button
                            size="sm"
                            className="gap-1.5 text-xs bg-[hsl(var(--whatsapp))] text-[hsl(var(--whatsapp-foreground))] hover:bg-[hsl(var(--whatsapp))]/90"
                          >
                            <BrandIcon name="whatsapp" variant="mono" size={14} />
                            WhatsApp
                          </Button>
                        </a>
                      )}
                      {tel && (
                        <a href={tel} className="inline-flex">
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                            <Phone className="h-3.5 w-3.5" /> Ligar
                          </Button>
                        </a>
                      )}

                      <div className="ml-auto flex flex-wrap gap-2">
                        {b.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40" onClick={() => cancel(b)}>
                              <XCircle className="h-3.5 w-3.5" /> Recusar
                            </Button>
                            <Button size="sm" className="gap-1.5 text-xs" onClick={() => accept(b)}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Aceitar
                            </Button>
                          </>
                        )}
                        {b.status === 'confirmed' && (
                          <>
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40" onClick={() => cancel(b)}>
                              <XCircle className="h-3.5 w-3.5" /> Cancelar
                            </Button>
                            <Button size="sm" className="gap-1.5 text-xs bg-success text-success-foreground hover:bg-success/90" onClick={() => complete(b)}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => setDetail(b)}>
                          Detalhes <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {/* Modal de detalhes */}
      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="max-w-md">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>Detalhes da solicitação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Cliente */}
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cliente</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"><User className="h-5 w-5 text-muted-foreground" /></div>
                    <div>
                      <p className="font-semibold">{detail.clientName}</p>
                      {detail.clientPhone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {detail.clientPhone}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    {waLink(detail) && (
                      <a href={waLink(detail)!} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button size="sm" className="w-full gap-1.5 text-xs bg-[hsl(var(--whatsapp))] text-[hsl(var(--whatsapp-foreground))] hover:bg-[hsl(var(--whatsapp))]/90">
                          <BrandIcon name="whatsapp" variant="mono" size={14} /> WhatsApp
                        </Button>
                      </a>
                    )}
                    {telLink(detail) && (
                      <a href={telLink(detail)!} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
                          <Phone className="h-3.5 w-3.5" /> Ligar
                        </Button>
                      </a>
                    )}
                  </div>
                </div>

                {/* Serviço */}
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Serviço solicitado</p>
                  <p className="text-sm">{detail.service ?? '—'}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(detail.date)}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{detail.slot}</span>
                  </div>
                  {detail.address && (
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {detail.address}
                    </p>
                  )}
                  {detail.note && (
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <StickyNote className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {detail.note}
                    </p>
                  )}
                </div>

                {/* Histórico */}
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Histórico</p>
                  <ul className="space-y-2 text-xs">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      <span className="text-muted-foreground">Solicitação recebida</span>
                      <span className="ml-auto text-muted-foreground/70">{new Date(detail.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_META[detail.status].dot)} />
                      <span className="font-medium">{STATUS_META[detail.status].label}</span>
                      <span className="ml-auto text-muted-foreground/70">agora</span>
                    </li>
                  </ul>
                </div>

                {/* Ações rápidas no modal */}
                <div className="flex flex-wrap gap-2">
                  {detail.status === 'pending' && (
                    <>
                      <Button variant="outline" className="flex-1 gap-1.5" onClick={() => { cancel(detail); setDetail(null); }}>
                        <XCircle className="h-4 w-4" /> Recusar
                      </Button>
                      <Button className="flex-1 gap-1.5" onClick={() => { accept(detail); setDetail(null); }}>
                        <CheckCircle2 className="h-4 w-4" /> Aceitar
                      </Button>
                    </>
                  )}
                  {detail.status === 'confirmed' && (
                    <>
                      <Button variant="outline" className="flex-1 gap-1.5" onClick={() => { cancel(detail); setDetail(null); }}>
                        <XCircle className="h-4 w-4" /> Cancelar
                      </Button>
                      <Button className="flex-1 gap-1.5 bg-success text-success-foreground hover:bg-success/90" onClick={() => { complete(detail); setDetail(null); }}>
                        <CheckCircle2 className="h-4 w-4" /> Concluir
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
