import { useState, useMemo } from 'react';
import {
  TrendingUp, Clock, CheckCircle2, XCircle, Package, Truck, Phone, MapPin, Navigation,
  Eye, X, ChefHat, Undo2, Repeat, MapPinOff, AlertTriangle, ChevronDown,
} from 'lucide-react';
import { BrandIcon } from '@/components/common/BrandIcon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { mockOrders, mockStats, mockDrivers, Order, type OrderItemSummary } from '@/data/mockData';
import { OrderItemBlock } from '@/components/vendor/OrderItemBlock';
import { toast } from 'sonner';

// =====================================================================
// SUB-STATUS — refinamentos visuais sobre o status original do pedido
// =====================================================================
type EffectiveStatus =
  | 'pending'
  | 'preparing' | 'late' | 'ready'
  | 'on_route' | 'returning' | 'exchange' | 'not_found' | 'incident'
  | 'delivered' | 'returned' | 'exchanged' | 'cancelled';

const subStatusMeta: Record<EffectiveStatus, { label: string; badge: string; icon: any }> = {
  pending:    { label: 'Novo',                badge: 'bg-info/10 text-info',                 icon: Package },
  preparing:  { label: 'Preparando',          badge: 'bg-warning/10 text-warning',           icon: ChefHat },
  late:       { label: 'Em atraso',           badge: 'bg-destructive/10 text-destructive',   icon: AlertTriangle },
  ready:      { label: 'Pronto',              badge: 'bg-success/10 text-success',           icon: CheckCircle2 },
  on_route:   { label: 'Em rota',             badge: 'bg-chart-4/10 text-chart-4',           icon: Truck },
  returning:  { label: 'Devolução',           badge: 'bg-warning/10 text-warning',           icon: Undo2 },
  exchange:   { label: 'Troca',               badge: 'bg-info/10 text-info',                 icon: Repeat },
  not_found:  { label: 'Não localizado',      badge: 'bg-destructive/10 text-destructive',   icon: MapPinOff },
  incident:   { label: 'Incidente',           badge: 'bg-destructive/10 text-destructive',   icon: AlertTriangle },
  delivered:  { label: 'Entregue',            badge: 'bg-success/10 text-success',           icon: CheckCircle2 },
  returned:   { label: 'Devolução efetuada',  badge: 'bg-warning/10 text-warning',           icon: Undo2 },
  exchanged:  { label: 'Troca efetuada',      badge: 'bg-info/10 text-info',                 icon: Repeat },
  cancelled:  { label: 'Cancelado',           badge: 'bg-destructive/10 text-destructive',   icon: XCircle },
};

function openWhatsApp(phone: string, name: string, orderId: string) {
  const cleaned = phone.replace(/\D/g, '');
  const msg = encodeURIComponent(`Olá ${name}! Estamos entrando em contato sobre o seu pedido ${orderId}.`);
  window.open(`https://wa.me/55${cleaned}?text=${msg}`, '_blank', 'noopener,noreferrer');
}

function elapsedMinutes(date: string) {
  return Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
}

// =====================================================================
// Componentes auxiliares
// =====================================================================
function OrderDetailDialog({ order, open, onClose, effectiveStatus }: {
  order: Order | null; open: boolean; onClose: () => void; effectiveStatus?: EffectiveStatus;
}) {
  if (!order) return null;
  const meta = subStatusMeta[effectiveStatus ?? (order.status as EffectiveStatus)] ?? subStatusMeta.pending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {order.id}
            <Badge className={`${meta.badge} text-xs`}>{meta.label}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider">Itens do Pedido</p>
              <span className="text-xs text-muted-foreground">
                {(order.itemsSummary || order.items).length} {(order.itemsSummary || order.items).length === 1 ? 'item' : 'itens'}
              </span>
            </div>
            <div className="space-y-2">
              {order.itemsSummary ? order.itemsSummary.map((item, i) => (
                <OrderItemBlock key={i} item={item} showPrice={false} />
              )) : order.items.map((name, i) => (
                <OrderItemBlock key={i} item={{ qty: 1, name }} showPrice={false} />
              ))}
            </div>
            <div className="flex items-center justify-between pt-1 px-1">
              <span className="text-sm text-muted-foreground">{order.paymentMethod}</span>
              <span className="text-xl font-bold text-primary">R$ {order.total.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entrega</p>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
              <p className="text-sm flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-info shrink-0" />
                {order.address}
              </p>
              {order.neighborhood && (
                <p className="text-xs text-muted-foreground ml-5">{order.neighborhood}</p>
              )}
              {order.reference && (
                <p className="text-xs text-muted-foreground ml-5 italic">Ref: {order.reference}</p>
              )}
              <div className="flex gap-4 ml-5 mt-1">
                {order.distanceKm && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Navigation className="h-3 w-3" /> {order.distanceKm} km
                  </span>
                )}
                {order.deliveryFee !== undefined && (
                  <span className="text-xs font-medium text-info">
                    Frete: R$ {order.deliveryFee.toFixed(2).replace('.', ',')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</p>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-sm font-medium">{order.customer}</p>
              {order.customerPhone && (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> {order.customerPhone}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-[hsl(var(--whatsapp))]/40 text-[hsl(var(--whatsapp))] hover:bg-[hsl(var(--whatsapp))]/10 hover:text-[hsl(var(--whatsapp))]"
                    onClick={() => openWhatsApp(order.customerPhone!, order.customer, order.id)}
                  >
                    <BrandIcon name="whatsapp" size={14} className="mr-1" /> WhatsApp
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WhatsAppButton({ order }: { order: Order }) {
  if (!order.customerPhone) return null;
  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-8 w-8 hover:bg-[hsl(var(--whatsapp))]/10"
      onClick={(e) => { e.stopPropagation(); openWhatsApp(order.customerPhone!, order.customer, order.id); }}
      title="Conversar no WhatsApp"
    >
      <BrandIcon name="whatsapp" size={16} />
    </Button>
  );
}

function StageBackButton({ onClick, title = 'Voltar ao estágio anterior' }: { onClick: () => void; title?: string }) {
  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
    >
      <Undo2 className="h-4 w-4" />
    </Button>
  );
}

// Pílula de sub-aba reutilizável (visual sutil — não compete com Tabs principal)
function SubTabPill({ active, onClick, children, count }: {
  active: boolean; onClick: () => void; children: React.ReactNode; count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors',
        active
          ? 'bg-secondary text-secondary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cn(
          'inline-flex items-center justify-center min-w-[18px] h-[16px] rounded-full text-[10px] px-1',
          active ? 'bg-background/80 text-foreground' : 'bg-muted text-muted-foreground'
        )}>{count}</span>
      )}
    </button>
  );
}

// =====================================================================
// Linhas (Recent / Preparing / Transit / Finished) — todas unificadas no estilo
// =====================================================================
function OrderRowBase({ order, status, onView, leftIcon, rightActions, selectable, selected, onSelectChange, meta }: {
  order: Order;
  status: EffectiveStatus;
  onView: () => void;
  leftIcon?: React.ReactNode;
  rightActions: React.ReactNode;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (v: boolean) => void;
  meta?: React.ReactNode;
}) {
  const m = subStatusMeta[status];
  const items: OrderItemSummary[] = order.itemsSummary || order.items.map(name => ({ qty: 1, name }));

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      {selectable ? (
        <div className="pt-1 shrink-0">
          <Checkbox checked={selected} onCheckedChange={(v) => onSelectChange?.(!!v)} />
        </div>
      ) : leftIcon}

      <div className="flex-1 min-w-0 cursor-pointer" onClick={onView}>
        <p className="text-base font-semibold text-foreground truncate mb-0.5">{order.customer}</p>
        <p className="text-xs text-muted-foreground truncate mb-1">
          {items.slice(0, 3).map((it, i) => {
            const extras = (it.modifiers?.filter(m => m.type === 'addon').length ?? 0)
              + (it.note ? 1 : 0);
            return (
              <span key={i}>
                <span className="font-medium text-foreground/80">{it.qty}x</span> {it.name}
                {extras > 0 && <span className="text-foreground/50"> +{extras}</span>}
                {i < Math.min(items.length, 3) - 1 ? ' • ' : ''}
              </span>
            );
          })}
          {items.length > 3 && <span> • +{items.length - 3}</span>}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
          <span className="font-medium text-foreground/60">{order.id}</span>
          <Badge className={`${m.badge} text-[10px] py-0 px-1.5`}>{m.label}</Badge>
          {meta}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="font-bold text-base">R$ {order.total.toFixed(2).replace('.', ',')}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(order.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <div className="flex gap-1 shrink-0 pt-0.5 items-center">
        {rightActions}
      </div>
    </div>
  );
}

type ConfirmAction = { type: 'accept' | 'reject'; orders: Order[] } | null;

// =====================================================================
// Componente principal
// =====================================================================
export function DashboardTab() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmAction>(null);
  const [reviewedConfirm, setReviewedConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Sobrepõe o status original (mock) sem mutar mockData
  const [subStatus, setSubStatus] = useState<Map<string, EffectiveStatus>>(new Map());

  // Sub-aba ativa em cada estágio principal
  const [prepSub, setPrepSub] = useState<'preparing' | 'late' | 'ready'>('preparing');
  const [transitSub, setTransitSub] = useState<'on_route' | 'returning' | 'exchange' | 'not_found' | 'incident'>('on_route');
  const [finishedSub, setFinishedSub] = useState<'delivered' | 'returned' | 'exchanged' | 'cancelled'>('delivered');

  const setSub = (orderId: string, value: EffectiveStatus) => {
    setSubStatus(prev => {
      const n = new Map(prev);
      n.set(orderId, value);
      return n;
    });
  };

  // Resolve status efetivo: override > status original (com auto-detecção de atraso em preparo)
  const effective = (o: Order): EffectiveStatus => {
    const override = subStatus.get(o.id);
    if (override) {
      // Auto-promove "preparing" para "late" se já estiver atrasado e não foi marcado como pronto
      if (override === 'preparing' && elapsedMinutes(o.date) > 25) return 'late';
      return override;
    }
    if (o.status === 'preparing' && elapsedMinutes(o.date) > 25) return 'late';
    return o.status as EffectiveStatus;
  };

  const ordersWithEff = useMemo(
    () => mockOrders.map(o => ({ order: o, eff: effective(o) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subStatus]
  );

  const recentOrders     = ordersWithEff.filter(x => x.eff === 'pending').map(x => x.order);
  const preparingAll     = ordersWithEff.filter(x => ['preparing', 'late', 'ready'].includes(x.eff));
  const transitAll       = ordersWithEff.filter(x => ['on_route', 'returning', 'exchange', 'not_found', 'incident'].includes(x.eff));
  const finishedAll      = ordersWithEff.filter(x => ['delivered', 'returned', 'exchanged', 'cancelled'].includes(x.eff));

  const prepCounts = {
    preparing: preparingAll.filter(x => x.eff === 'preparing').length,
    late:      preparingAll.filter(x => x.eff === 'late').length,
    ready:     preparingAll.filter(x => x.eff === 'ready').length,
  };
  const transitCounts = {
    on_route:  transitAll.filter(x => x.eff === 'on_route').length,
    returning: transitAll.filter(x => x.eff === 'returning').length,
    exchange:  transitAll.filter(x => x.eff === 'exchange').length,
    not_found: transitAll.filter(x => x.eff === 'not_found').length,
    incident:  transitAll.filter(x => x.eff === 'incident').length,
  };
  const finishedCounts = {
    delivered: finishedAll.filter(x => x.eff === 'delivered').length,
    returned:  finishedAll.filter(x => x.eff === 'returned').length,
    exchanged: finishedAll.filter(x => x.eff === 'exchanged').length,
    cancelled: finishedAll.filter(x => x.eff === 'cancelled').length,
  };

  const pendingOrders = recentOrders;
  const selectedOrders = useMemo(
    () => pendingOrders.filter(o => selectedIds.has(o.id)),
    [pendingOrders, selectedIds]
  );

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const selectAll = () => setSelectedIds(new Set(pendingOrders.map(o => o.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const requestConfirm = (type: 'accept' | 'reject', orders: Order[]) => {
    setReviewedConfirm(false);
    setRejectReason('');
    setPendingConfirm({ type, orders });
  };

  const executeConfirm = () => {
    if (!pendingConfirm) return;
    const { type, orders } = pendingConfirm;
    if (type === 'accept') {
      orders.forEach(o => setSub(o.id, 'preparing'));
    } else {
      orders.forEach(o => setSub(o.id, 'cancelled'));
    }
    const verb = type === 'accept' ? 'aceito(s)' : 'rejeitado(s)';
    toast.success(`${orders.length} pedido(s) ${verb} com sucesso!`, {
      description: orders.map(o => o.id).join(', '),
    });
    clearSelection();
    setPendingConfirm(null);
    setReviewedConfirm(false);
  };

  const viewOrder = (order: Order) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  // ----- Avançar de estágio -----
  const markReady = (o: Order) => { setSub(o.id, 'ready'); toast.success(`Pedido ${o.id} pronto!`); };
  const dispatchToTransit = (o: Order, sub: EffectiveStatus = 'on_route') => {
    setSub(o.id, sub);
    toast.success(`Pedido ${o.id} despachado (${subStatusMeta[sub].label})`);
    setTransitSub(sub as any);
  };
  const changeTransitSub = (o: Order, sub: EffectiveStatus) => {
    setSub(o.id, sub);
    toast.info(`Situação atualizada: ${subStatusMeta[sub].label}`);
    setTransitSub(sub as any);
  };
  const finalizeTransit = (o: Order, sub: EffectiveStatus) => {
    setSub(o.id, sub);
    toast.success(`Pedido ${o.id} finalizado: ${subStatusMeta[sub].label}`);
    setFinishedSub(sub as any);
  };

  // ----- Voltar ao estágio anterior (universal) -----
  const stageBack = (o: Order, from: 'preparing' | 'transit' | 'finished') => {
    const cur = effective(o);
    if (from === 'preparing') {
      if (cur === 'ready') { setSub(o.id, 'preparing'); toast.info(`Pedido ${o.id} voltou para preparo`); setPrepSub('preparing'); }
      else { setSub(o.id, 'pending'); toast.info(`Pedido ${o.id} voltou para Recentes`); }
    } else if (from === 'transit') {
      setSub(o.id, 'ready');
      toast.info(`Pedido ${o.id} voltou para "Pronto"`);
      setPrepSub('ready');
    } else if (from === 'finished') {
      setSub(o.id, 'on_route');
      toast.info(`Pedido ${o.id} reaberto em "Em rota"`);
      setTransitSub('on_route');
    }
  };

  const allPendingSelected = pendingOrders.length > 0 && selectedIds.size === pendingOrders.length;

  // Filtros das sub-abas
  const prepVisible     = preparingAll.filter(x => x.eff === prepSub).map(x => x.order);
  const transitVisible  = transitAll.filter(x => x.eff === transitSub).map(x => x.order);
  const finishedVisible = finishedAll.filter(x => x.eff === finishedSub).map(x => x.order);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Faturamento</p>
          <p className="text-xl font-bold">R$ {mockStats.todayRevenue.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-success flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> +12%
          </p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Pedidos</p>
          <p className="text-xl font-bold">{mockStats.todayOrders}</p>
          <p className="text-xs text-muted-foreground mt-1">hoje</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Pendentes</p>
          <p className="text-xl font-bold">{mockStats.pendingOrders}</p>
          <p className="text-xs text-warning mt-1">aguardando</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Tempo médio</p>
          <p className="text-xl font-bold">{mockStats.averageDeliveryTime}</p>
          <p className="text-xs text-muted-foreground mt-1">entrega</p>
        </div>
      </div>

      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span className="text-muted-foreground">Concluídos:</span>
          <span className="font-medium">{mockStats.completedToday}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-destructive" />
          <span className="text-muted-foreground">Cancelados:</span>
          <span className="font-medium">{mockStats.cancelledToday}</span>
        </div>
      </div>

      {/* Abas principais */}
      <Tabs defaultValue="recentes">
        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 h-auto gap-1">
          <TabsTrigger value="recentes" className="gap-1.5 py-2 text-xs sm:text-sm">
            <Package className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Recentes</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{recentOrders.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="preparando" className="gap-1.5 py-2 text-xs sm:text-sm">
            <ChefHat className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Preparando</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{preparingAll.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="transito" className="gap-1.5 py-2 text-xs sm:text-sm">
            <Truck className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Trânsito</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{transitAll.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="finalizado" className="gap-1.5 py-2 text-xs sm:text-sm">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Finalizado</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{finishedAll.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ============== RECENTES ============== */}
        <TabsContent value="recentes">
          {pendingOrders.length > 0 && (() => {
            const hasSel = selectedIds.size > 0;
            const targets = hasSel ? selectedOrders : pendingOrders;
            const totalTargets = targets.reduce((s, o) => s + o.total, 0);
            return (
              <div className="sticky top-0 z-20 mb-2 bg-card border rounded-lg shadow-sm p-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allPendingSelected}
                    onCheckedChange={(v) => v ? selectAll() : clearSelection()}
                  />
                  <div className="text-sm">
                    <p className="font-semibold leading-tight">
                      {hasSel
                        ? `${selectedIds.size} de ${pendingOrders.length} selecionado${selectedIds.size > 1 ? 's' : ''}`
                        : `${pendingOrders.length} pedido${pendingOrders.length > 1 ? 's' : ''} pendente${pendingOrders.length > 1 ? 's' : ''}`}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Total: R$ {totalTargets.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
                <div className="flex-1" />
                {hasSel && (
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={clearSelection}>
                    <X className="h-3.5 w-3.5 mr-1" /> Limpar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => requestConfirm('reject', targets)}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  {hasSel ? `Rejeitar (${selectedIds.size})` : 'Rejeitar todos'}
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-success text-success-foreground hover:bg-success/90"
                  onClick={() => requestConfirm('accept', targets)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  {hasSel ? `Aceitar (${selectedIds.size})` : 'Aceitar todos'}
                </Button>
              </div>
            );
          })()}

          <div className="bg-card rounded-xl border p-4">
            {recentOrders.length > 0 ? (
              recentOrders.map(order => (
                <OrderRowBase
                  key={order.id}
                  order={order}
                  status="pending"
                  onView={() => viewOrder(order)}
                  selectable
                  selected={selectedIds.has(order.id)}
                  onSelectChange={(v) => toggleSelect(order.id, v)}
                  meta={
                    <>
                      {order.distanceKm && (<><span>·</span><span>{order.distanceKm} km</span></>)}
                      <span>·</span>
                      <span>{order.paymentMethod}</span>
                    </>
                  }
                  rightActions={
                    <>
                      <WhatsAppButton order={order} />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => viewOrder(order)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </>
                  }
                />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum pedido pendente</p>
            )}
          </div>
        </TabsContent>

        {/* ============== EM PREPARAÇÃO ============== */}
        <TabsContent value="preparando">
          <div className="flex flex-wrap gap-1 mb-3 px-1">
            <SubTabPill active={prepSub === 'preparing'} onClick={() => setPrepSub('preparing')} count={prepCounts.preparing}>
              <ChefHat className="h-3 w-3" /> Em preparo
            </SubTabPill>
            <SubTabPill active={prepSub === 'late'} onClick={() => setPrepSub('late')} count={prepCounts.late}>
              <AlertTriangle className="h-3 w-3" /> Em atraso
            </SubTabPill>
            <SubTabPill active={prepSub === 'ready'} onClick={() => setPrepSub('ready')} count={prepCounts.ready}>
              <CheckCircle2 className="h-3 w-3" /> Pronto
            </SubTabPill>
          </div>

          <div className="bg-card rounded-xl border p-4">
            {prepVisible.length > 0 ? (
              prepVisible.map(order => {
                const eff = effective(order);
                const elapsed = elapsedMinutes(order.date);
                return (
                  <OrderRowBase
                    key={order.id}
                    order={order}
                    status={eff}
                    onView={() => viewOrder(order)}
                    leftIcon={
                      <div className="shrink-0 mt-0.5">
                        <div className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center',
                          eff === 'ready' ? 'bg-success/10' : eff === 'late' ? 'bg-destructive/10' : 'bg-warning/10'
                        )}>
                          {eff === 'ready'
                            ? <CheckCircle2 className="h-4 w-4 text-success" />
                            : eff === 'late'
                              ? <AlertTriangle className="h-4 w-4 text-destructive" />
                              : <ChefHat className="h-4 w-4 text-warning" />}
                        </div>
                      </div>
                    }
                    meta={
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{elapsed} min</span>
                      </>
                    }
                    rightActions={
                      <>
                        <StageBackButton onClick={() => stageBack(order, 'preparing')} />
                        <WhatsAppButton order={order} />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => viewOrder(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {eff === 'ready' ? (
                          <Button size="sm" className="h-8 text-xs px-2" onClick={() => dispatchToTransit(order)}>
                            <Truck className="h-3.5 w-3.5 mr-1" /> Despachar
                          </Button>
                        ) : (
                          <Button size="sm" className="h-8 text-xs px-2 bg-success text-success-foreground hover:bg-success/90" onClick={() => markReady(order)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Pronto
                          </Button>
                        )}
                      </>
                    }
                  />
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum pedido nesta categoria</p>
            )}
          </div>
        </TabsContent>

        {/* ============== EM TRÂNSITO ============== */}
        <TabsContent value="transito">
          <div className="flex flex-wrap gap-1 mb-3 px-1">
            <SubTabPill active={transitSub === 'on_route'} onClick={() => setTransitSub('on_route')} count={transitCounts.on_route}>
              <Truck className="h-3 w-3" /> Em rota
            </SubTabPill>
            <SubTabPill active={transitSub === 'returning'} onClick={() => setTransitSub('returning')} count={transitCounts.returning}>
              <Undo2 className="h-3 w-3" /> Devolução
            </SubTabPill>
            <SubTabPill active={transitSub === 'exchange'} onClick={() => setTransitSub('exchange')} count={transitCounts.exchange}>
              <Repeat className="h-3 w-3" /> Troca
            </SubTabPill>
            <SubTabPill active={transitSub === 'not_found'} onClick={() => setTransitSub('not_found')} count={transitCounts.not_found}>
              <MapPinOff className="h-3 w-3" /> Não localizado
            </SubTabPill>
            <SubTabPill active={transitSub === 'incident'} onClick={() => setTransitSub('incident')} count={transitCounts.incident}>
              <AlertTriangle className="h-3 w-3" /> Incidente
            </SubTabPill>
          </div>

          <div className="bg-card rounded-xl border p-4">
            {transitVisible.length > 0 ? (
              transitVisible.map(order => {
                const eff = effective(order);
                const m = subStatusMeta[eff];
                const Icon = m.icon;
                const assignedDriver = mockDrivers.find(d => d.status === 'busy') || mockDrivers[0];
                return (
                  <OrderRowBase
                    key={order.id}
                    order={order}
                    status={eff}
                    onView={() => viewOrder(order)}
                    leftIcon={
                      <div className="shrink-0 mt-0.5">
                        <div className={cn('h-8 w-8 rounded-full flex items-center justify-center', m.badge)}>
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>
                    }
                    meta={
                      <>
                        <span>·</span>
                        <span>{assignedDriver.name}</span>
                        {order.distanceKm && (<><span>·</span><span>~{Math.ceil(order.distanceKm * 5)} min</span></>)}
                      </>
                    }
                    rightActions={
                      <>
                        <StageBackButton onClick={() => stageBack(order, 'transit')} title="Voltar para Pronto" />
                        <WhatsAppButton order={order} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 text-xs px-2">
                              Situação <ChevronDown className="h-3 w-3 ml-0.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-xs">Mudar situação</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => changeTransitSub(order, 'on_route')}><Truck className="h-3.5 w-3.5 mr-2" /> Em rota</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => changeTransitSub(order, 'returning')}><Undo2 className="h-3.5 w-3.5 mr-2" /> Devolução</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => changeTransitSub(order, 'exchange')}><Repeat className="h-3.5 w-3.5 mr-2" /> Troca</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => changeTransitSub(order, 'not_found')}><MapPinOff className="h-3.5 w-3.5 mr-2" /> Não localizado</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => changeTransitSub(order, 'incident')}><AlertTriangle className="h-3.5 w-3.5 mr-2" /> Incidente</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs">Finalizar como</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => finalizeTransit(order, 'delivered')}><CheckCircle2 className="h-3.5 w-3.5 mr-2 text-success" /> Entregue</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => finalizeTransit(order, 'returned')}><Undo2 className="h-3.5 w-3.5 mr-2 text-warning" /> Devolução efetuada</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => finalizeTransit(order, 'exchanged')}><Repeat className="h-3.5 w-3.5 mr-2 text-info" /> Troca efetuada</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    }
                  />
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum pedido nesta categoria</p>
            )}
          </div>
        </TabsContent>

        {/* ============== FINALIZADO ============== */}
        <TabsContent value="finalizado">
          <div className="flex flex-wrap gap-1 mb-3 px-1">
            <SubTabPill active={finishedSub === 'delivered'} onClick={() => setFinishedSub('delivered')} count={finishedCounts.delivered}>
              <CheckCircle2 className="h-3 w-3" /> Entregue
            </SubTabPill>
            <SubTabPill active={finishedSub === 'returned'} onClick={() => setFinishedSub('returned')} count={finishedCounts.returned}>
              <Undo2 className="h-3 w-3" /> Devolução efetuada
            </SubTabPill>
            <SubTabPill active={finishedSub === 'exchanged'} onClick={() => setFinishedSub('exchanged')} count={finishedCounts.exchanged}>
              <Repeat className="h-3 w-3" /> Troca efetuada
            </SubTabPill>
            <SubTabPill active={finishedSub === 'cancelled'} onClick={() => setFinishedSub('cancelled')} count={finishedCounts.cancelled}>
              <XCircle className="h-3 w-3" /> Cancelado
            </SubTabPill>
          </div>

          <div className="bg-card rounded-xl border p-4">
            {finishedVisible.length > 0 ? (
              finishedVisible.map(order => {
                const eff = effective(order);
                const m = subStatusMeta[eff];
                const Icon = m.icon;
                return (
                  <OrderRowBase
                    key={order.id}
                    order={order}
                    status={eff}
                    onView={() => viewOrder(order)}
                    leftIcon={
                      <div className="shrink-0 mt-0.5">
                        <div className={cn('h-8 w-8 rounded-full flex items-center justify-center', m.badge)}>
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>
                    }
                    meta={<><span>·</span><span>{order.paymentMethod}</span></>}
                    rightActions={
                      <>
                        {eff !== 'cancelled' && (
                          <StageBackButton onClick={() => stageBack(order, 'finished')} title="Reabrir em Em Trânsito" />
                        )}
                        <WhatsAppButton order={order} />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => viewOrder(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </>
                    }
                  />
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum pedido nesta categoria</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Detalhes */}
      <OrderDetailDialog
        order={selectedOrder}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        effectiveStatus={selectedOrder ? effective(selectedOrder) : undefined}
      />

      {/* Confirmação dupla — aceitar / rejeitar */}
      <AlertDialog open={!!pendingConfirm} onOpenChange={(o) => !o && setPendingConfirm(null)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {pendingConfirm?.type === 'accept' ? (
                <><CheckCircle2 className="h-5 w-5 text-success" /> Confirmar aceitação de {pendingConfirm?.orders.length} pedido(s)</>
              ) : (
                <><XCircle className="h-5 w-5 text-destructive" /> Confirmar rejeição de {pendingConfirm?.orders.length} pedido(s)</>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingConfirm?.type === 'accept'
                ? 'Os pedidos abaixo serão aceitos e movidos para preparo. Verifique antes de confirmar.'
                : 'Os pedidos abaixo serão rejeitados e o cliente será notificado. Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ScrollArea className="max-h-[280px] rounded-lg border bg-muted/30 p-3">
            <div className="space-y-2">
              {pendingConfirm?.orders.map(o => (
                <div key={o.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{o.id}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="truncate">{o.customer}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{o.items.join(', ')}</p>
                  </div>
                  <span className="font-bold text-sm shrink-0 ml-2">R$ {o.total.toFixed(2).replace('.', ',')}</span>
                </div>
              ))}
            </div>
          </ScrollArea>

          {pendingConfirm && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-sm font-medium">Total {pendingConfirm.type === 'accept' ? 'a aceitar' : 'a rejeitar'}:</span>
              <span className="font-bold text-lg text-primary">
                R$ {pendingConfirm.orders.reduce((s, o) => s + o.total, 0).toFixed(2).replace('.', ',')}
              </span>
            </div>
          )}

          {pendingConfirm?.type === 'reject' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Motivo da rejeição (opcional)</label>
              <Textarea
                placeholder="Ex.: produto fora de estoque, fora da área de entrega..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
          )}

          {!reviewedConfirm ? (
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <Button onClick={() => setReviewedConfirm(true)}>Revisar</Button>
            </AlertDialogFooter>
          ) : (
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => setReviewedConfirm(false)}>Voltar</Button>
              <AlertDialogAction
                onClick={executeConfirm}
                className={pendingConfirm?.type === 'accept' ? '' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
              >
                {pendingConfirm?.type === 'accept' ? 'Confirmar definitivamente' : 'Rejeitar definitivamente'}
              </AlertDialogAction>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
