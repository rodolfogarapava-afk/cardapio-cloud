import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, MapPin, ArrowRight, Home, FileText, IdCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { PAYMENT_METHOD_LABELS, PaymentMethod } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface OrderItemSummary {
  productName: string;
  productImage?: string;
  quantity: number;
  totalPrice: number;
  complements: string[];
  removedIngredients: string[];
}

interface LocationState {
  vendorSlug?: string;
  orderNumber: string;
  orderId?: number;
  tenantId?: string;
  customerPhone?: string;
  restaurantName: string;
  total: number;
  estimatedTime: string;
  paymentMethod: PaymentMethod;
  observation?: string;
  cpf?: string;
  items?: OrderItemSummary[];
}

const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export default function PedidoConfirmado() {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderNumber: routeOrderNumber } = useParams<{ orderNumber: string }>();
  const navigationState = location.state as LocationState | null;
  let savedState: LocationState | null = null;
  if (!navigationState && routeOrderNumber) {
    try {
      const access = JSON.parse(localStorage.getItem('cardapio_delivery_access') || 'null') as { phone?: string } | null;
      const order = JSON.parse(localStorage.getItem(`cardapio_tracked_order_${routeOrderNumber}`) || 'null') as LocationState | null;
      if (access?.phone && order?.customerPhone === access.phone) savedState = order;
    } catch {
      savedState = null;
    }
  }
  const state = navigationState || savedState;
  const [kitchenStatus, setKitchenStatus] = useState<'new' | 'preparing' | 'ready' | 'completed' | 'cancelled'>('new');

  useEffect(() => {
    if (!state?.tenantId || !state.orderId || !state.customerPhone) return;
    let active = true;

    const refreshStatus = async () => {
      const { data, error } = await (supabase as any).rpc('get_public_order_status', {
        p_tenant_id: state.tenantId,
        p_order_id: state.orderId,
        p_phone: state.customerPhone,
      });
      if (!active || error || !data) return;
      const next = data.kitchenStatus;
      if (next === 'new' || next === 'preparing' || next === 'ready' || next === 'completed' || next === 'cancelled') setKitchenStatus(next);
    };

    void refreshStatus();
    const interval = window.setInterval(refreshStatus, 1500);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [state?.customerPhone, state?.orderId, state?.tenantId]);

  if (!state) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-lg text-muted-foreground text-center">Nenhum pedido encontrado</p>
        <Button onClick={() => navigate('/cardapio/proveu-espeto')}>Voltar ao cardápio</Button>
      </div>
    );
  }

  const { orderNumber, restaurantName, total, estimatedTime, paymentMethod, observation, cpf, items } = state;

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <main className="flex-1 container py-8 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="mb-6"
        >
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/15 shadow-sm">
            <CheckCircle2 className="h-12 w-12 text-primary" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h1 className="text-2xl font-bold text-foreground mb-2">Pedido Confirmado!</h1>
          <p className="text-muted-foreground">Seu pedido foi recebido pela loja</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-md mt-8"
        >
          <div className="rounded-2xl border bg-card p-6 space-y-4 shadow-sm text-left">
            <div className="text-center pb-4 border-b">
              <p className="text-sm text-muted-foreground">Número do pedido</p>
              <p className="text-2xl font-mono font-bold mt-1">{orderNumber}</p>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Loja</span>
                <span className="font-medium">{restaurantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">{brl(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pagamento</span>
                <span className="font-medium">{PAYMENT_METHOD_LABELS[paymentMethod]}</span>
              </div>
              {cpf && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1.5"><IdCard className="h-3.5 w-3.5" /> CPF na nota</span>
                  <span className="font-mono text-xs">{cpf}</span>
                </div>
              )}
            </div>

            {items && items.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Itens</p>
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-base overflow-hidden">
                        {item.productImage?.startsWith('http')
                          ? <img src={item.productImage} alt={item.productName} className="h-full w-full object-cover" />
                          : (item.productImage || '🍽️')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          <span className="text-muted-foreground mr-1">{item.quantity}×</span>{item.productName}
                        </p>
                        {item.complements.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {item.complements.join(', ')}
                          </p>
                        )}
                        {item.removedIngredients.length > 0 && (
                          <p className="text-xs text-destructive">
                            Sem {item.removedIngredients.join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="font-medium whitespace-nowrap">{brl(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {observation && (
              <>
                <Separator />
                <div className="rounded-lg bg-warning/5 border border-warning/20 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-warning flex items-center gap-1.5 mb-1">
                    <FileText className="h-3.5 w-3.5" /> Observação
                  </p>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{observation}</p>
                </div>
              </>
            )}

            <div className="flex items-center justify-center gap-2 py-3 rounded-lg bg-info/5 border border-info/15">
              <Clock className="h-5 w-5 text-info" />
              <span className="text-sm font-medium">
                Tempo estimado: <span className="text-info font-semibold">{estimatedTime}</span>
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="w-full max-w-md mt-6">
          <div className="flex items-center justify-between text-xs">
            <div className="flex flex-col items-center gap-1">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-muted-foreground">Confirmado</span>
            </div>
            <div className={`flex-1 h-0.5 mx-2 ${kitchenStatus !== 'new' ? 'bg-primary' : 'bg-muted'}`} />
            <div className="flex flex-col items-center gap-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${kitchenStatus !== 'new' ? 'bg-primary' : 'bg-muted'}`}>
                <Clock className={`h-4 w-4 ${kitchenStatus !== 'new' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
              </div>
              <span className={kitchenStatus !== 'new' ? 'font-semibold text-primary' : 'text-muted-foreground'}>Preparando</span>
            </div>
            <div className={`flex-1 h-0.5 mx-2 ${kitchenStatus === 'ready' ? 'bg-primary' : 'bg-muted'}`} />
            <div className="flex flex-col items-center gap-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${kitchenStatus === 'ready' ? 'bg-primary' : 'bg-muted'}`}>
                <MapPin className={`h-4 w-4 ${kitchenStatus === 'ready' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
              </div>
              <span className={kitchenStatus === 'cancelled' ? 'font-semibold text-destructive' : kitchenStatus === 'ready' || kitchenStatus === 'completed' ? 'font-semibold text-primary' : 'text-muted-foreground'}>
                {kitchenStatus === 'cancelled' ? 'Cancelado' : kitchenStatus === 'completed' ? 'Concluído' : 'Pronto'}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-3 mt-8 w-full max-w-md"
        >
          <Button variant="outline" className="flex-1 gap-2" onClick={() => navigate(`/pedido/${orderNumber}`, { state })}>
            Acompanhar Pedido
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button className="flex-1 gap-2" onClick={() => navigate(`/cardapio/${state.vendorSlug || 'proveu-espeto'}`)}>
            <Home className="h-4 w-4" />
            Voltar ao Início
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
