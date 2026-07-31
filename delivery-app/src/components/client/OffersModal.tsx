import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tag, Sparkles, ArrowRight } from 'lucide-react';
import { Product } from '@/types';
import { cn } from '@/lib/utils';

interface OffersModalProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onPick: (product: Product) => void;
}

const brl = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;

export function OffersModal({ open, onClose, products, onPick }: OffersModalProps) {
  const sorted = [...products].sort((a, b) => {
    const da = a.originalPrice ? (a.originalPrice - a.price) / a.originalPrice : 0;
    const db = b.originalPrice ? (b.originalPrice - b.price) / b.originalPrice : 0;
    return db - da;
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          'p-0 gap-0 overflow-hidden',
          'max-w-md sm:max-w-2xl lg:max-w-3xl',
          'max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:bottom-0 max-sm:top-auto max-sm:translate-y-0 max-sm:max-h-[88vh]',
          'max-sm:data-[state=open]:slide-in-from-bottom max-sm:data-[state=closed]:slide-out-to-bottom',
        )}
      >
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-br from-primary/10 via-card to-card border-b p-4">
          <DialogTitle className="flex items-center gap-3 text-base">
            <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Tag className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold leading-tight">Ofertas em destaque</p>
              <p className="text-[11px] font-normal text-muted-foreground mt-0.5 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Selecionadas pra você — toque para adicionar
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {sorted.length} {sorted.length === 1 ? 'oferta' : 'ofertas'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(88vh-72px)] sm:max-h-[70vh] bg-muted/20">
          {sorted.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center gap-3 text-center">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <Tag className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Nenhuma oferta agora</p>
              <p className="text-xs text-muted-foreground max-w-[240px]">
                Volte mais tarde — os melhores descontos aparecem aqui primeiro.
              </p>
            </div>
          ) : (
            <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sorted.map((p) => {
                const hasOriginal = !!p.originalPrice && p.originalPrice > p.price;
                const saved = hasOriginal ? p.originalPrice! - p.price : 0;
                const discount = hasOriginal ? Math.round((saved / p.originalPrice!) * 100) : 0;
                const isBig = discount >= 25;

                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      onPick(p);
                      onClose();
                    }}
                    className={cn(
                      'group relative flex flex-col text-left rounded-2xl border bg-card overflow-hidden',
                      'shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]',
                      'transition-all duration-200',
                    )}
                  >
                    {/* Media */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                      {p.image?.startsWith('http') ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-5xl bg-gradient-to-br from-muted to-muted/60">
                          <span>{p.image || '🍽️'}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent" />

                      {/* Discount badge */}
                      {discount > 0 && (
                        <div
                          className={cn(
                            'absolute top-2 left-2 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-md flex items-center gap-1 ring-2 ring-background/60',
                            isBig
                              ? 'bg-warning text-warning-foreground'
                              : 'bg-success text-success-foreground',
                          )}
                        >
                          <Tag className="h-3 w-3" />-{discount}%
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-3 flex flex-col gap-1.5 flex-1">
                      <p className="text-sm font-semibold leading-tight line-clamp-1">{p.name}</p>
                      {p.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                          {p.description}
                        </p>
                      )}

                      <div className="mt-auto pt-2 flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-base font-bold text-primary leading-none">
                              {brl(p.price)}
                            </span>
                            {hasOriginal && (
                              <span className="text-[11px] text-muted-foreground line-through leading-none">
                                {brl(p.originalPrice!)}
                              </span>
                            )}
                          </div>
                          {saved > 0 && (
                            <p className="text-[10px] text-success font-semibold mt-1">
                              Economize {brl(saved)}
                            </p>
                          )}
                        </div>
                        <div
                          className={cn(
                            'h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0',
                            'group-hover:bg-primary group-hover:text-primary-foreground transition-colors',
                          )}
                          aria-hidden
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
