import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Clock3, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type SavedOrder = {
  orderNumber: string;
  orderId?: number;
  tenantId?: string;
  customerPhone?: string;
  restaurantName: string;
  total: number;
  createdAt?: number;
  items?: Array<{ productName: string; quantity: number }>;
};

const statusText = {
  new: 'Pedido confirmado',
  preparing: 'Em preparo',
  ready: 'Pedido pronto',
  completed: 'Pedido concluído',
  cancelled: 'Pedido cancelado',
} as const;

export default function MeusPedidos() {
  const navigate = useNavigate();
  const { vendorSlug = 'proveu-espeto' } = useParams<{ vendorSlug: string }>();
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [statuses, setStatuses] = useState<Record<string, keyof typeof statusText>>({});

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const access = JSON.parse(localStorage.getItem('cardapio_delivery_access') || 'null') as {phone?:string}|null;
        if (!access?.phone) return;
        const {data:menu}=await (supabase as any).rpc('get_public_menu',{p_slug:vendorSlug});
        if(!menu?.tenantId)return;
        const {data}=await (supabase as any).rpc('get_public_customer_orders',{
          p_tenant_id:menu.tenantId,p_phone:access.phone,
        });
        if(!active||!Array.isArray(data))return;
        const loaded:SavedOrder[]=data.map((row:any)=>{
          const payload=row.payload||{};
          return {
            orderNumber:`ORD-${String(row.id).slice(-6)}`,
            orderId:Number(row.id),tenantId:menu.tenantId,customerPhone:access.phone,
            restaurantName:menu.tenantName||'Loja',total:Number(payload.total||0),
            createdAt:new Date(row.createdAt).getTime(),
            items:(payload.items||[]).map((item:any)=>({productName:item.name,quantity:Number(item.qty||0)})),
          };
        });
        setOrders(loaded);
        setStatuses(Object.fromEntries(data.map((row:any)=>[
          `ORD-${String(row.id).slice(-6)}`,
          statusText[row.status as keyof typeof statusText]?row.status:'new',
        ])));
      } catch {
        // Mantém a tela estável enquanto a conexão é restabelecida.
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
          <Button variant="ghost" size="icon" onClick={() => navigate(`/cardapio/${vendorSlug}`)} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold leading-tight">Meus pedidos</h1>
            <p className="text-xs text-muted-foreground">Acompanhe seus pedidos nesta loja</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-3 px-4 py-5">
        {!orders.length ? (
          <section className="flex min-h-[55vh] flex-col items-center justify-center text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShoppingBag className="h-8 w-8" />
            </span>
            <h2 className="text-lg font-bold">Nenhum pedido encontrado</h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">Os pedidos realizados com seu telefone aparecerão aqui.</p>
            <Button className="mt-5" onClick={() => navigate(`/cardapio/${vendorSlug}`)}>Ver cardápio</Button>
          </section>
        ) : orders.map(order => {
          const status = statuses[order.orderNumber] || 'new';
          return (
            <button
              key={order.orderNumber}
              type="button"
              onClick={() => navigate(`/pedido/${order.orderNumber}`)}
              className="w-full rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/60"
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
          );
        })}
      </main>
    </div>
  );
}
