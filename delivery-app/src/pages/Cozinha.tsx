import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChefHat, CheckCircle2, Bell, Truck, Package, Timer, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { mockOrders, type Order, type OrderItemSummary } from '@/data/mockData';
import { toast } from 'sonner';

// SLA por estágio (em minutos) — bate com a detecção de atraso do DashboardTab (25 min).
const SLA_MIN: Record<KdsStatus, number> = {
  new: 3,
  preparing: 25,
  ready: 10,
};

type KdsStatus = 'new' | 'preparing' | 'ready';

const STATUS_META: Record<KdsStatus, { label: string; icon: typeof ChefHat; accent: string; ring: string }> = {
  new:        { label: 'Novos',      icon: Bell,         accent: 'bg-info text-info-foreground',         ring: 'ring-info/40' },
  preparing:  { label: 'Preparando', icon: ChefHat,      accent: 'bg-warning text-warning-foreground',   ring: 'ring-warning/40' },
  ready:      { label: 'Prontos',    icon: CheckCircle2, accent: 'bg-success text-success-foreground',   ring: 'ring-success/40' },
};

// Mapeia o status do mock para coluna do KDS — só pedidos de delivery/retirada (sem mesa).
function mapInitial(status: Order['status']): KdsStatus | null {
  if (status === 'pending') return 'new';
  if (status === 'preparing') return 'preparing';
  if (status === 'ready') return 'ready';
  return null; // ignora in_transit/delivered/cancelled
}

function getMode(order: Order): 'delivery' | 'pickup' {
  // Pedido sem endereço (ou marcado "Retirada") vira pickup.
  if (!order.address || /retirada/i.test(order.address)) return 'pickup';
  return 'delivery';
}

interface KdsCard {
  order: Order;
  status: KdsStatus;
  enteredAt: number; // ms — momento que entrou na coluna atual
}

function elapsedSec(from: number, now: number) {
  return Math.max(0, Math.floor((now - from) / 1000));
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function OrderTimer({ enteredAt, slaMin, now }: { enteredAt: number; slaMin: number; now: number }) {
  const sec = elapsedSec(enteredAt, now);
  const overdue = sec > slaMin * 60;
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-bold tabular-nums',
      overdue
        ? 'bg-destructive text-destructive-foreground animate-pulse'
        : sec > slaMin * 60 * 0.7
          ? 'bg-warning/15 text-warning'
          : 'bg-muted text-muted-foreground'
    )}>
      <Timer className="h-3.5 w-3.5" />
      {formatTime(sec)}
      {overdue && <span className="hidden sm:inline text-[10px] uppercase">atraso</span>}
    </div>
  );
}

function KdsOrderCard({ card, now, onAdvance, onUndo, nextLabel }: {
  card: KdsCard;
  now: number;
  onAdvance: () => void;
  onUndo?: () => void;
  nextLabel: string;
}) {
  const { order, status, enteredAt } = card;
  const items: OrderItemSummary[] = order.itemsSummary || order.items.map(name => ({ qty: 1, name }));
  const mode = getMode(order);
  const slaMin = SLA_MIN[status];
  const overdue = elapsedSec(enteredAt, now) > slaMin * 60;

  return (
    <div className={cn(
      'rounded-xl border-2 bg-card shadow-sm transition-all',
      overdue ? 'border-destructive ring-2 ring-destructive/30' : 'border-border',
    )}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base font-bold tabular-nums whitespace-nowrap">{order.id}</span>
          <Badge variant="secondary" className={cn(
            'text-[10px] px-1.5 py-0 gap-1 whitespace-nowrap',
            mode === 'pickup' ? 'bg-chart-4/15 text-chart-4' : 'bg-info/15 text-info'
          )}>
            {mode === 'pickup' ? <><Package className="h-3 w-3" />Retirada</> : <><Truck className="h-3 w-3" />Delivery</>}
          </Badge>
        </div>
        <OrderTimer enteredAt={enteredAt} slaMin={slaMin} now={now} />
      </div>

      {/* Cliente */}
      <div className="px-3 pt-2">
        <p className="text-sm font-semibold truncate">{order.customer}</p>
      </div>

      {/* Itens — grandes para visualização em telão */}
      <ul className="px-3 py-2 space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-base leading-tight">
            <span className="font-bold text-primary tabular-nums shrink-0 min-w-[24px]">{it.qty}×</span>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{it.name}</p>
              {it.modifiers && it.modifiers.length > 0 && (
                <p className="text-xs text-muted-foreground leading-snug">
                  {it.modifiers.map(m => m.label).join(' • ')}
                </p>
              )}
              {it.note && (
                <p className="text-xs italic text-warning mt-0.5">★ {it.note}</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Ações */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-1">
        {onUndo && (
          <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={onUndo}>
            ← Voltar
          </Button>
        )}
        <Button
          size="sm"
          className={cn('h-9 flex-1 font-bold gap-1.5', STATUS_META[status === 'new' ? 'preparing' : status === 'preparing' ? 'ready' : 'ready'].accent)}
          onClick={onAdvance}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}

function Column({ status, cards, now, onAdvance, onUndo }: {
  status: KdsStatus;
  cards: KdsCard[];
  now: number;
  onAdvance: (id: string) => void;
  onUndo?: (id: string) => void;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const overdueCount = cards.filter(c => elapsedSec(c.enteredAt, now) > SLA_MIN[status] * 60).length;
  const nextLabel = status === 'new' ? 'Iniciar preparo' : status === 'preparing' ? 'Marcar pronto' : 'Despachar';

  return (
    <div className="flex flex-col min-w-0 h-full">
      <div className={cn('flex items-center justify-between gap-2 px-3 py-2.5 rounded-t-xl', meta.accent)}>
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-5 w-5 shrink-0" />
          <h2 className="font-bold uppercase tracking-wide text-sm truncate">{meta.label}</h2>
          <span className="rounded-full bg-background/25 text-current text-xs font-bold px-2 py-0.5 tabular-nums">{cards.length}</span>
        </div>
        {overdueCount > 0 && (
          <Badge className="bg-destructive text-destructive-foreground animate-pulse text-[10px] gap-1">
            <Clock className="h-3 w-3" /> {overdueCount} atrasado{overdueCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <div className={cn(
        'flex-1 overflow-y-auto p-2 space-y-2 bg-muted/30 rounded-b-xl ring-1 ring-inset',
        meta.ring,
        cards.length === 0 && 'flex items-center justify-center'
      )}>
        {cards.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Sem pedidos nesta etapa.</p>
        ) : cards.map(card => (
          <KdsOrderCard
            key={card.order.id}
            card={card}
            now={now}
            nextLabel={nextLabel}
            onAdvance={() => onAdvance(card.order.id)}
            onUndo={onUndo ? () => onUndo(card.order.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export default function Cozinha() {
  const navigate = useNavigate();

  // Estado inicial — só pedidos elegíveis (delivery/retirada que ainda estão na cozinha).
  const [cards, setCards] = useState<KdsCard[]>(() => {
    const now = Date.now();
    return mockOrders
      .map(o => {
        const s = mapInitial(o.status);
        if (!s) return null;
        const enteredAt = new Date(o.date).getTime() || now;
        return { order: o, status: s, enteredAt } as KdsCard;
      })
      .filter((c): c is KdsCard => !!c);
  });

  // Tick global pros cronômetros.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Demo: simula chegada de novos pedidos a cada ~25s, clonando um existente.
  useEffect(() => {
    const id = setInterval(() => {
      const seed = mockOrders[Math.floor(Math.random() * mockOrders.length)];
      if (!seed) return;
      const fake: Order = { ...seed, id: `KDS-${Math.floor(Math.random() * 9000 + 1000)}`, status: 'pending', date: new Date().toISOString() };
      setCards(prev => [{ order: fake, status: 'new', enteredAt: Date.now() }, ...prev]);
      toast.success(`Novo pedido ${fake.id}`, { description: `${fake.customer} • R$ ${fake.total.toFixed(2).replace('.', ',')}` });
    }, 25000);
    return () => clearInterval(id);
  }, []);

  const advance = (id: string) => {
    setCards(prev => prev.flatMap(c => {
      if (c.order.id !== id) return [c];
      if (c.status === 'new') return [{ ...c, status: 'preparing', enteredAt: Date.now() }];
      if (c.status === 'preparing') return [{ ...c, status: 'ready', enteredAt: Date.now() }];
      // ready → despachado / retirado: sai da fila
      toast.success(`Pedido ${c.order.id} despachado`);
      return [];
    }));
  };

  const undo = (id: string) => {
    setCards(prev => prev.map(c => {
      if (c.order.id !== id) return c;
      if (c.status === 'preparing') return { ...c, status: 'new', enteredAt: Date.now() };
      if (c.status === 'ready') return { ...c, status: 'preparing', enteredAt: Date.now() };
      return c;
    }));
  };

  const grouped = useMemo(() => ({
    new:        cards.filter(c => c.status === 'new'),
    preparing:  cards.filter(c => c.status === 'preparing'),
    ready:      cards.filter(c => c.status === 'ready'),
  }), [cards]);

  // Aba ativa em mobile/tablet (< lg). Em lg+ mostramos tudo.
  const [mobileTab, setMobileTab] = useState<KdsStatus>('new');
  const tabOrder: KdsStatus[] = ['new', 'preparing', 'ready'];

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header foco — compacto */}
      <header className="border-b bg-card shrink-0">
        <div className="container py-2.5 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/vendor')} title="Sair do modo cozinha">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <ChefHat className="h-5 w-5 text-primary shrink-0" />
            <h1 className="font-bold text-base sm:text-lg truncate">KDS — Cozinha</h1>
            <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">Foco</Badge>
          </div>
          <div className="text-xs text-muted-foreground tabular-nums hidden sm:block">
            {new Date(now).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>

        {/* Seletor de aba — só < lg (compacto) */}
        <div className="lg:hidden border-t px-2 py-1.5 flex gap-1">
          {tabOrder.map(s => {
            const meta = STATUS_META[s];
            const Icon = meta.icon;
            const count = grouped[s].length;
            const overdue = grouped[s].filter(c => elapsedSec(c.enteredAt, now) > SLA_MIN[s] * 60).length;
            const active = mobileTab === s;
            return (
              <button
                key={s}
                onClick={() => setMobileTab(s)}
                aria-label={`${meta.label} (${count})`}
                className={cn(
                  'relative flex-1 min-w-0 flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-xs font-semibold transition-colors',
                  active ? meta.accent : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{meta.label}</span>
                <span className={cn(
                  'rounded-full text-[10px] font-bold px-1 tabular-nums shrink-0 leading-4',
                  active ? 'bg-background/25' : 'bg-background'
                )}>{count}</span>
                {overdue > 0 && (
                  <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Grade — 1 coluna (aba selecionada) até md; 3 colunas em lg+ */}
      <main className="flex-1 min-h-0 container py-3">
        <div className="hidden lg:grid grid-cols-3 gap-3 h-full min-h-0">
          <Column status="new"        cards={grouped.new}        now={now} onAdvance={advance} />
          <Column status="preparing"  cards={grouped.preparing}  now={now} onAdvance={advance} onUndo={undo} />
          <Column status="ready"      cards={grouped.ready}      now={now} onAdvance={advance} onUndo={undo} />
        </div>
        <div className="lg:hidden h-full min-h-0">
          <Column
            status={mobileTab}
            cards={grouped[mobileTab]}
            now={now}
            onAdvance={advance}
            onUndo={mobileTab === 'new' ? undefined : undo}
          />
        </div>
      </main>
    </div>
  );
}
