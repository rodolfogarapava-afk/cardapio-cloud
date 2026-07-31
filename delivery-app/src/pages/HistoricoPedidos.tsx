import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, RefreshCw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { OrderStatus, PAYMENT_METHOD_LABELS } from '@/types';

// Mock de pedidos do usuário
const mockUserOrders = [
  {
    id: 'ORD-123456',
    restaurantName: 'Sabor & Arte',
    restaurantLogo: '🍔',
    items: ['Hambúrguer Clássico', 'Batata Frita', 'Coca-Cola'],
    total: 49.70,
    status: 'delivered' as OrderStatus,
    date: '2026-01-28T18:30:00',
    paymentMethod: 'pix' as const,
  },
  {
    id: 'ORD-123455',
    restaurantName: 'Pizza Express',
    restaurantLogo: '🍕',
    items: ['Pizza Margherita', 'Refrigerante 2L'],
    total: 58.90,
    status: 'in_transit' as OrderStatus,
    date: '2026-01-29T12:15:00',
    paymentMethod: 'credit_card' as const,
  },
  {
    id: 'ORD-123454',
    restaurantName: 'Açaí Tropical',
    restaurantLogo: '🍇',
    items: ['Açaí 500ml', 'Granola Extra'],
    total: 28.80,
    status: 'cancelled' as OrderStatus,
    date: '2026-01-27T15:00:00',
    paymentMethod: 'cash' as const,
  },
];

export default function HistoricoPedidos() {
  const navigate = useNavigate();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="container flex items-center gap-3 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Meus Pedidos</h1>
        </div>
      </header>

      {/* Main */}
      <main className="container py-6">
        {mockUserOrders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhum pedido ainda"
            description="Quando você fizer um pedido, ele aparecerá aqui"
            action={
              <Button onClick={() => navigate('/')}>
                Explorar restaurantes
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {mockUserOrders.map(order => (
              <div
                key={order.id}
                className="rounded-lg border bg-card p-4"
              >
                {/* Header do pedido */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-2xl">
                      {order.restaurantLogo}
                    </div>
                    <div>
                      <h3 className="font-medium">{order.restaurantName}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(order.date)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                {/* Itens */}
                <p className="text-sm text-muted-foreground mb-3">
                  {order.items.join(' • ')}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[order.paymentMethod]}
                    </p>
                    <p className="font-semibold">
                      R$ {order.total.toFixed(2).replace('.', ',')}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {order.status === 'delivered' && (
                      <Button variant="outline" size="sm" className="gap-1">
                        <Star className="h-4 w-4" />
                        Avaliar
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="gap-1">
                      <RefreshCw className="h-4 w-4" />
                      Repetir
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
