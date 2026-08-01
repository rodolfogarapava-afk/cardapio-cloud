import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ChevronRight, Clock3, Loader2, ShoppingBag, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { navigateDelivery } from '@/lib/deliveryNavigation';
import { readDeliveryAccess } from '@/lib/deliverySession';

type SavedOrder = {
  orderNumber: string;
  orderId?: number;
  tenantId?: string;
  customerPhone?: string;
  restaurantName: string;
  total: number;
  createdAt?: number;
  items?: Array<{ productName: string; quantity: number }>;
  trackingState?: Record<string, unknown>;
};

const statusText = {
  new: 'Pedido confirmado',
  preparing: 'Em preparo',
  ready: 'Pedido pronto',
  completed: 'Pedido concluído',
  cancelled: 'Pedido cancelado',
} as const;

export default function MeusPedidos() {
  const { vendorSlug = 'proveu-espeto' } = useParams<{ vendorSlug: string }>();
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [statuses, setStatuses] = useState<Record<string, keyof typeof statusText>>({});
  const [cancelOrder, setCancelOrder] = useState<SavedOrder | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const confirmCancellation = async () => {
    if (!cancelOrder?.orderId || !cancelOrder.tenantId || !cancelOrder.customerPhone) return;
    setCancelling(true);
    const access = readDeliveryAccess();
    const { data, error } = await (supabase as any).rpc('cancel_public_order', {
      p_tenant_id: cancelOrder.tenantId,
      p_order_id: cancelOrder.orderId,
      p_phone: cancelOrder.customerPhone,
      p_access_token: access?.phone === cancelOrder.customerPhone ? access.token || '' : '',
    });
    setCancelling(false);
    if (error || !data?.cancelled) {
      toast({
        title: 'Não foi possível cancelar',
        description: data?.message || error?.message || 'O pedido pode já estar em preparo.',
        variant: 'destructive',
      });
      return;
    }
    setStatuses(current => ({ ...current, [cancelOrder.orderNumber]: 'cancelled' }));
    setCancelOrder(null);
    toast({ title: 'Pedido cancelado', description: 'A loja foi avisada do cancelamento.' });
  };

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const access = readDeliveryAccess();
        if (!access?.phone || !access.token) {
          if (active) setLoadError('Entre com seu telefone para consultar os pedidos desta loja.');
          return;
        }
        const { data: menu } = await (supabase as any).rpc('get_public_menu', { p_slug: vendorSlug });
        if (!menu?.tenantId) throw new Error('Loja indisponível no momento.');
        const { data, error } = await (supabase as any).rpc('get_public_customer_orders', {
          p_tenant_id: menu.tenantId, p_phone: access.phone, p_access_token: access.token,
        });
        if (error) throw error;
        if (!active || !Array.isArray(data)) return;
        const loaded: SavedOrder[] = data.map((row: any) => {
          const payload = row.payload || {};
          return {
            orderNumber: `ORD-${String(row.id).slice(-6)}`,
            orderId: Number(row.id), tenantId: menu.tenantId, customerPhone: access.phone,
            restaurantName: menu.tenantName || 'Loja', total: Number(payload.total || 0),
            createdAt: new Date(row.createdAt).getTime(),
            items: (payload.items || []).map((item: any) => ({ productName: item.name, quantity: Number(item.qty || 0) })),
            trackingState: {
              vendorSlug,
              orderNumber: `ORD-${String(row.id).slice(-6)}`,
              orderId: Number(row.id), tenantId: menu.tenantId, customerPhone: access.phone,
              restaurantName: menu.tenantName || 'Loja', total: Number(payload.total || 0),
              estimatedTime: '25-40 min',
              paymentMethod: payload.delivery?.payment || 'cash',
              observation: payload.delivery?.notes || undefined,
              items: (payload.items || []).map((item: any) => ({
                productName: item.name, quantity: Number(item.qty || 0),
                totalPrice: Number(item.price || 0) * Number(item.qty || 0),
                complements: item.detail ? [String(item.detail)] : [],
                removedIngredients: [],
              })),
            },
          };
        });
        setOrders(loaded);
        setStatuses(Object.fromEntries(data.map((row: any) => [
          `ORD-${String(row.id).slice(-6)}`,
          statusText[row.status as keyof typeof statusText] ? row.status : 'new',
        ])));
        setLoadError('');
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar seus pedidos.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 3000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [vendorSlug]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-2xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigateDelivery(`/cardapio/${vendorSlug}`)} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold leading-tight">Meus pedidos</h1>
            <p className="text-xs text-muted-foreground">Acompanhe seus pedidos nesta loja</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-3 px-4 py-5">
        {loading ? (
          <section className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando seus pedidos...</p>
          </section>
        ) : loadError ? (
          <section className="flex min-h-[55vh] flex-col items-center justify-center text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-8 w-8" />
            </span>
            <h2 className="text-lg font-bold">Não foi possível abrir seus pedidos</h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">{loadError}</p>
            <Button className="mt-5" onClick={() => navigateDelivery(`/cardapio/${vendorSlug}`)}>Voltar ao cardápio</Button>
          </section>
        ) : !orders.length ? (
          <section className="flex min-h-[55vh] flex-col items-center justify-center text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShoppingBag className="h-8 w-8" />
            </span>
            <h2 className="text-lg font-bold">Nenhum pedido encontrado</h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">Os pedidos realizados com seu telefone aparecerão aqui.</p>
            <Button className="mt-5" onClick={() => navigateDelivery(`/cardapio/${vendorSlug}`)}>Ver cardápio</Button>
          </section>
        ) : orders.map(order => {
          const status = statuses[order.orderNumber] || 'new';
          return (
            <article key={order.orderNumber} className="w-full overflow-hidden rounded-2xl border bg-card shadow-sm">
              <button
                type="button"
                onClick={() => navigateDelivery(`/pedido/${order.orderId}?loja=${encodeURIComponent(vendorSlug)}`, order.trackingState)}
                className="w-full p-4 text-left transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">{statusText[status]}</p>
                    <h2 className="mt-1 text-lg font-bold">{order.orderNumber}</h2>
                    <p className="text-xs text-muted-foreground">{order.restaurantName}</p>
                  </div>
                  <ChevronRight className="mt-2 h-5 w-5 text-muted-foreground" />
                </div>
                <div className="my-3 border-t" />
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-muted-foreground">
                      {(order.items || []).map(item => `${item.quantity}x ${item.productName}`).join(' · ') || 'Pedido realizado'}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" /> Toque para acompanhar
                    </p>
                  </div>
                  <strong className="shrink-0">R$ {order.total.toFixed(2).replace('.', ',')}</strong>
                </div>
              </button>
              {status === 'new' && (
                <div className="border-t px-4 py-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setCancelOrder(order)}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Cancelar pedido
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </main>

      <AlertDialog open={!!cancelOrder} onOpenChange={open => !open && !cancelling && setCancelOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza que deseja cancelar?</AlertDialogTitle>
            <AlertDialogDescription>
              O pedido {cancelOrder?.orderNumber} será removido das comandas da loja. O cancelamento só é permitido antes do início do preparo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelling}
              onClick={event => {
                event.preventDefault();
                void confirmCancellation();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelando...</>
                : 'Sim, cancelar pedido'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
