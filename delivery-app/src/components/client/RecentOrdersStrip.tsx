import { useNavigate } from 'react-router-dom';
import { RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { mockRestaurants, mockMenuProducts } from '@/data/restaurants';
import { toast } from 'sonner';

interface RecentOrder {
  id: string;
  restaurantSlug: string;
  items: string[];
  total: number;
  date: string;
}

const RECENT: RecentOrder[] = [
  { id: 'ORD-123456', restaurantSlug: 'sabor-arte', items: ['Hambúrguer Clássico', 'Batata Frita'], total: 49.7, date: '2026-01-28' },
  { id: 'ORD-123453', restaurantSlug: 'sabor-arte', items: ['X-Bacon', 'Milkshake'], total: 59.9, date: '2026-01-20' },
  { id: 'ORD-123452', restaurantSlug: 'sushi-zen', items: ['Combo 30 peças'], total: 139.9, date: '2026-01-15' },
];

const fmt = (s: string) => new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

export function RecentOrdersStrip() {
  const navigate = useNavigate();
  const { addItem } = useCart();

  const reorder = (o: RecentOrder) => {
    const r = mockRestaurants.find(x => x.slug === o.restaurantSlug);
    if (!r) return;
    const product = (mockMenuProducts[o.restaurantSlug] || []).find(p => p.available);
    if (!product) {
      navigate(`/cardapio/${o.restaurantSlug}`);
      return;
    }
    addItem(r.id, r.name, r.slug, r.address, product.id, product.name, product.image, product.price, 1, [], undefined);
    toast.success(`Pedido de ${r.name} adicionado ao carrinho`);
    navigate(`/cardapio/${o.restaurantSlug}`);
  };

  return (
    <section aria-label="Peça de novo" className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <RefreshCw className="h-4 w-4 text-primary" /> Peça de novo
        </h2>
        <button onClick={() => navigate('/historico')} className="text-xs text-primary hover:underline">
          Ver histórico
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 snap-x">
        {RECENT.map(o => {
          const r = mockRestaurants.find(x => x.slug === o.restaurantSlug);
          if (!r) return null;
          return (
            <div
              key={o.id}
              className="snap-start shrink-0 w-[260px] rounded-xl border bg-card p-3 flex flex-col gap-2 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-10 w-10 rounded-full overflow-hidden border bg-muted shrink-0">
                  {r.logo?.startsWith('http') ? (
                    <img src={r.logo} alt={r.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg">🍽️</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {fmt(o.date)} • R$ {o.total.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{o.items.join(' • ')}</p>
              <Button size="sm" className="h-8 w-full gap-1.5" onClick={() => reorder(o)}>
                <RefreshCw className="h-3.5 w-3.5" /> Pedir novamente
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
