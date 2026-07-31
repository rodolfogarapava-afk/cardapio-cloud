import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, RefreshCw, TrendingUp, TrendingDown, Clock, Coins, Search, Sparkles, Gift, CheckCircle2, XCircle, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { OrderStatus, PAYMENT_METHOD_LABELS, PointTransaction } from '@/types';
import { cn } from '@/lib/utils';
import { getRestaurantBySlug, mockMenuProducts } from '@/data/restaurants';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

const mockOrders = [
  { id: 'ORD-123456', restaurantSlug: 'sabor-arte', restaurantName: 'Sabor & Arte', restaurantLogo: '🍔', items: ['Hambúrguer Clássico', 'Batata Frita', 'Coca-Cola'], total: 49.70, status: 'delivered' as OrderStatus, date: '2026-01-28T18:30:00', paymentMethod: 'pix' as const, pointsEarned: 50 },
  { id: 'ORD-123455', restaurantSlug: 'pizza-express', restaurantName: 'Pizza Express', restaurantLogo: '🍕', items: ['Pizza Margherita', 'Refrigerante 2L'], total: 58.90, status: 'in_transit' as OrderStatus, date: '2026-01-29T12:15:00', paymentMethod: 'credit_card' as const, pointsEarned: 0 },
  { id: 'ORD-123454', restaurantSlug: 'acai-tropical', restaurantName: 'Açaí Tropical', restaurantLogo: '🍇', items: ['Açaí 500ml', 'Granola Extra'], total: 28.80, status: 'cancelled' as OrderStatus, date: '2026-01-27T15:00:00', paymentMethod: 'cash' as const, pointsEarned: 0 },
  { id: 'ORD-123453', restaurantSlug: 'sabor-arte', restaurantName: 'Sabor & Arte', restaurantLogo: '🍔', items: ['X-Bacon', 'Milkshake'], total: 59.90, status: 'delivered' as OrderStatus, date: '2026-01-20T19:00:00', paymentMethod: 'pix' as const, pointsEarned: 60 },
  { id: 'ORD-123452', restaurantSlug: 'sushi-zen', restaurantName: 'Sushi Master', restaurantLogo: '🍣', items: ['Combo 30 peças', 'Missoshiru'], total: 139.90, status: 'delivered' as OrderStatus, date: '2026-01-15T20:00:00', paymentMethod: 'credit_card' as const, pointsEarned: 140 },
];

const allPointTransactions: PointTransaction[] = [
  { id: 'pt-1', type: 'earned', amount: 50, description: 'Pedido ORD-123456', orderId: 'ORD-123456', date: '2026-01-28T18:30:00' },
  { id: 'pt-2', type: 'redeemed', amount: 100, description: 'Desconto no pedido ORD-123455', orderId: 'ORD-123455', date: '2026-01-25T14:00:00' },
  { id: 'pt-3', type: 'earned', amount: 60, description: 'Pedido ORD-123453', orderId: 'ORD-123453', date: '2026-01-20T19:00:00' },
  { id: 'pt-4', type: 'earned', amount: 140, description: 'Pedido ORD-123452', orderId: 'ORD-123452', date: '2026-01-15T20:00:00' },
  { id: 'pt-5', type: 'expired', amount: 50, description: 'Pontos expirados', date: '2026-01-10T00:00:00' },
  { id: 'pt-6', type: 'redeemed', amount: 100, description: 'Desconto no pedido ORD-123440', orderId: 'ORD-123440', date: '2026-01-05T12:00:00' },
  { id: 'pt-7', type: 'earned', amount: 200, description: 'Pedido ORD-123440', orderId: 'ORD-123440', date: '2026-01-05T12:00:00' },
  { id: 'pt-8', type: 'earned', amount: 1000, description: 'Bônus de boas-vindas', date: '2025-12-20T10:00:00' },
];

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const formatShortDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const formatMonth = (dateStr: string) => {
  const s = new Date(dateStr).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Status → cor de acento e ícone para a barrinha lateral
const STATUS_META: Record<string, { bar: string; icon: typeof Clock; label: string }> = {
  pending: { bar: 'bg-warning', icon: Clock, label: 'Em andamento' },
  confirmed: { bar: 'bg-warning', icon: Clock, label: 'Em andamento' },
  preparing: { bar: 'bg-warning', icon: Clock, label: 'Em andamento' },
  ready: { bar: 'bg-info', icon: Clock, label: 'Em andamento' },
  in_transit: { bar: 'bg-info', icon: Truck, label: 'Em andamento' },
  delivered: { bar: 'bg-success', icon: CheckCircle2, label: 'Entregue' },
  cancelled: { bar: 'bg-destructive', icon: XCircle, label: 'Cancelado' },
};

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'in_transit'];

type OrderFilter = 'all' | 'active' | 'delivered' | 'cancelled';

function RatingModal({ open, onClose, orderId }: { open: boolean; onClose: () => void; orderId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');

  const submit = () => {
    toast.success(`Avaliação de ${rating} estrelas enviada para ${orderId}!`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Avaliar pedido {orderId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setRating(s)} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star className={cn('h-8 w-8 transition-colors', (hover || rating) >= s ? 'fill-warning text-warning' : 'text-muted-foreground/30')} />
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {rating === 0 && 'Toque para avaliar'}
            {rating === 1 && 'Muito ruim'}
            {rating === 2 && 'Ruim'}
            {rating === 3 && 'Regular'}
            {rating === 4 && 'Bom'}
            {rating === 5 && 'Excelente!'}
          </p>
          <Textarea placeholder="Deixe um comentário (opcional)..." value={comment} onChange={e => setComment(e.target.value)} rows={3} />
          <Button className="w-full" disabled={rating === 0} onClick={submit}>
            Enviar avaliação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Historico() {
  const navigate = useNavigate();
  const { vendorSlug } = useParams<{ vendorSlug?: string }>();
  const restaurant = vendorSlug ? getRestaurantBySlug(vendorSlug) : undefined;

  const [ratingOrderId, setRatingOrderId] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  const [orderSearch, setOrderSearch] = useState('');

  const orders = useMemo(() => {
    if (!vendorSlug) return mockOrders;
    return mockOrders.filter(o => o.restaurantSlug === vendorSlug);
  }, [vendorSlug]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter(o => {
      if (orderFilter === 'active' && !ACTIVE_STATUSES.includes(o.status)) return false;
      if (orderFilter === 'delivered' && o.status !== 'delivered') return false;
      if (orderFilter === 'cancelled' && o.status !== 'cancelled') return false;
      if (!q) return true;
      return (
        o.restaurantName.toLowerCase().includes(q) ||
        o.items.some(i => i.toLowerCase().includes(q))
      );
    });
  }, [orders, orderFilter, orderSearch]);

  const counts = useMemo(() => ({
    all: orders.length,
    active: orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  }), [orders]);

  const orderIds = useMemo(() => new Set(orders.map(o => o.id)), [orders]);
  const pointTransactions = useMemo(() => {
    if (!vendorSlug) return allPointTransactions;
    return allPointTransactions.filter(t => !t.orderId || orderIds.has(t.orderId));
  }, [vendorSlug, orderIds]);

  const groupedTx = useMemo(() => {
    const map = new Map<string, PointTransaction[]>();
    for (const t of pointTransactions) {
      const key = formatMonth(t.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries());
  }, [pointTransactions]);

  const totalEarned = pointTransactions.filter(t => t.type === 'earned').reduce((sum, t) => sum + t.amount, 0);
  const totalUsed = pointTransactions.filter(t => t.type === 'redeemed' || t.type === 'expired').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalEarned - totalUsed;
  const pageTitle = restaurant ? `Pedidos em ${restaurant.name}` : 'Meu Histórico';

  const { addItem, clearCart, cart } = useCart();

  const handleRepeat = (order: typeof mockOrders[0]) => {
    const rest = getRestaurantBySlug(order.restaurantSlug);
    if (!rest) { toast.error('Restaurante indisponível no momento.'); return; }
    const products = mockMenuProducts[order.restaurantSlug] || [];
    const matched = order.items
      .map(name => products.find(p => p.name.toLowerCase() === name.toLowerCase()))
      .filter((p): p is NonNullable<typeof p> => Boolean(p && p.available));

    if (matched.length === 0) {
      toast.info('Itens deste pedido não estão mais disponíveis. Abrindo o cardápio...');
      navigate(`/cardapio/${order.restaurantSlug}`);
      return;
    }

    if (cart && cart.restaurantId !== rest.id) clearCart();
    matched.forEach(p => {
      addItem(rest.id, rest.name, rest.slug, rest.address, p.id, p.name, p.image, p.price, 1, [], undefined);
    });

    const missing = order.items.length - matched.length;
    toast.success(
      missing > 0
        ? `${matched.length} item(ns) adicionados ao carrinho. ${missing} indisponível(is).`
        : `Itens de ${order.restaurantName} adicionados ao carrinho!`
    );
    navigate(`/cardapio/${order.restaurantSlug}`, { state: { openCart: true } });
  };

  const filterChips: { key: OrderFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: counts.all },
    { key: 'active', label: 'Em andamento', count: counts.active },
    { key: 'delivered', label: 'Entregues', count: counts.delivered },
    { key: 'cancelled', label: 'Cancelados', count: counts.cancelled },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container flex items-center gap-3 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(vendorSlug ? `/cardapio/${vendorSlug}` : '/')} className="-ml-2"><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-lg font-semibold truncate">{pageTitle}</h1>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Hero de fidelidade */}
        <Card className="relative overflow-hidden border-0 text-primary-foreground bg-gradient-to-br from-primary via-primary to-primary/70">
          <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-primary-foreground/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-warning/20 blur-3xl" />
          <CardContent className="relative p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/15 backdrop-blur">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider opacity-80">
                    {restaurant ? `Fidelidade · ${restaurant.name}` : 'Programa de Fidelidade'}
                  </p>
                  <p className="text-[11px] opacity-70">Acumule pontos a cada pedido</p>
                </div>
              </div>
              <Sparkles className="h-5 w-5 opacity-70" />
            </div>

            <div className="flex items-baseline gap-2 mb-5">
              <p className="text-4xl sm:text-5xl font-bold tracking-tight leading-none">
                {balance.toLocaleString('pt-BR')}
              </p>
              <span className="text-base sm:text-lg font-medium opacity-80">pts</span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="rounded-xl bg-primary-foreground/10 backdrop-blur px-3 py-2.5 border border-primary-foreground/10">
                <div className="flex items-center gap-1.5 text-[11px] opacity-80 mb-0.5">
                  <TrendingUp className="h-3.5 w-3.5" /> Ganhos
                </div>
                <p className="text-lg font-bold">+{totalEarned.toLocaleString('pt-BR')}</p>
              </div>
              <div className="rounded-xl bg-primary-foreground/10 backdrop-blur px-3 py-2.5 border border-primary-foreground/10">
                <div className="flex items-center gap-1.5 text-[11px] opacity-80 mb-0.5">
                  <TrendingDown className="h-3.5 w-3.5" /> Usados
                </div>
                <p className="text-lg font-bold">-{totalUsed.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="pedidos">
          <TabsList className="w-full">
            <TabsTrigger value="pedidos" className="flex-1">Pedidos</TabsTrigger>
            <TabsTrigger value="extrato" className="flex-1">Extrato de Pontos</TabsTrigger>
          </TabsList>

          <TabsContent value="pedidos" className="space-y-4 mt-4">
            {orders.length === 0 ? (
              <EmptyState icon={Clock} title="Nenhum pedido ainda"
                description={restaurant ? `Você ainda não fez pedidos em ${restaurant.name}` : 'Quando você fizer um pedido, ele aparecerá aqui'}
                action={<Button onClick={() => navigate(vendorSlug ? `/cardapio/${vendorSlug}` : '/')}>{restaurant ? 'Ver cardápio' : 'Explorar restaurantes'}</Button>}
              />
            ) : (
              <>
                {/* Filtros */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={orderSearch}
                      onChange={e => setOrderSearch(e.target.value)}
                      placeholder="Buscar por loja ou item..."
                      className="pl-9 h-10"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
                    {filterChips.map(c => {
                      const active = orderFilter === c.key;
                      return (
                        <button
                          key={c.key}
                          onClick={() => setOrderFilter(c.key)}
                          className={cn(
                            'shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 h-9 text-xs font-medium transition-colors',
                            active
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-background text-foreground border-border hover:bg-muted'
                          )}
                        >
                          {c.label}
                          <span className={cn(
                            'inline-flex items-center justify-center rounded-full text-[10px] font-semibold px-1.5 min-w-[18px]',
                            active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                          )}>{c.count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <EmptyState icon={Search} title="Nada por aqui"
                    description="Ajuste os filtros ou tente outra busca."
                  />
                ) : (
                  <div className="space-y-3">
                    {filteredOrders.map(order => {
                      const meta = STATUS_META[order.status] ?? STATUS_META.delivered;
                      const StatusIcon = meta.icon;
                      const isActive = ACTIVE_STATUSES.includes(order.status);
                      return (
                        <div
                          key={order.id}
                          className="group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/30"
                        >
                          {/* barra lateral de status */}
                          <span className={cn('absolute left-0 top-0 bottom-0 w-1', meta.bar)} />

                          <div className="p-4 pl-5 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                {!vendorSlug && (
                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl overflow-hidden">
                                    {order.restaurantLogo.startsWith('http')
                                      ? <img src={order.restaurantLogo} alt="" className="h-full w-full object-cover" />
                                      : <span>{order.restaurantLogo}</span>}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  {!vendorSlug && (
                                    <h3 className="font-semibold text-foreground truncate">{order.restaurantName}</h3>
                                  )}
                                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                    <StatusIcon className="h-3 w-3" />
                                    {formatDate(order.date)}
                                  </p>
                                </div>
                              </div>
                              <StatusBadge status={order.status} />
                            </div>

                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {order.items.join(' • ')}
                            </p>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                    {PAYMENT_METHOD_LABELS[order.paymentMethod]}
                                  </p>
                                  <p className="font-bold text-foreground">
                                    R$ {order.total.toFixed(2).replace('.', ',')}
                                  </p>
                                </div>
                                {order.pointsEarned > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 border border-success/20 px-2 py-0.5 text-xs font-semibold text-success">
                                    <Coins className="h-3 w-3" /> +{order.pointsEarned} pts
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-2 ml-auto">
                                {isActive && (
                                  <Button size="sm" className="gap-1 text-xs px-2.5" onClick={() => navigate(`/pedido/${order.id}`)}>
                                    <Clock className="h-3.5 w-3.5" /> Acompanhar
                                  </Button>
                                )}
                                {order.status === 'delivered' && (
                                  <Button variant="outline" size="sm" className="gap-1 text-xs px-2.5 hover:bg-warning/10 hover:text-warning hover:border-warning/40" onClick={() => setRatingOrderId(order.id)}>
                                    <Star className="h-3.5 w-3.5" /> Avaliar
                                  </Button>
                                )}
                                <Button variant="outline" size="sm" className="gap-1 text-xs px-2.5 hover:bg-primary/10 hover:text-primary hover:border-primary/40" onClick={() => handleRepeat(order)}>
                                  <RefreshCw className="h-3.5 w-3.5" /> Repetir
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="extrato" className="mt-4">
            {pointTransactions.length === 0 ? (
              <EmptyState icon={Coins} title="Sem movimentações" description="Nenhuma movimentação de pontos encontrada" />
            ) : (
              <div className="space-y-5">
                {groupedTx.map(([month, txs]) => (
                  <div key={month} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{month}</p>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                    <div className="space-y-2">
                      {txs.map(tx => {
                        const isEarned = tx.type === 'earned';
                        const isRedeemed = tx.type === 'redeemed';
                        const isExpired = tx.type === 'expired';
                        const Icon = isEarned ? TrendingUp : isRedeemed ? Gift : Clock;
                        return (
                          <div key={tx.id} className="flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/20">
                            <div className={cn(
                              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                              isEarned && 'bg-success/10 text-success ring-2 ring-success/10',
                              isRedeemed && 'bg-info/10 text-info ring-2 ring-info/10',
                              isExpired && 'bg-muted text-muted-foreground ring-2 ring-border'
                            )}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{tx.description}</p>
                              <p className="text-xs text-muted-foreground">{formatShortDate(tx.date)}</p>
                            </div>
                            <span className={cn(
                              'text-sm font-bold whitespace-nowrap tabular-nums',
                              isEarned && 'text-success',
                              isRedeemed && 'text-info',
                              isExpired && 'text-muted-foreground line-through'
                            )}>
                              {isEarned ? '+' : '-'}{tx.amount} pts
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {ratingOrderId && (
        <RatingModal open={!!ratingOrderId} onClose={() => setRatingOrderId(null)} orderId={ratingOrderId} />
      )}
    </div>
  );
}
