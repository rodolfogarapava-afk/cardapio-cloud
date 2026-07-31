import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2, Truck, Store, MapPin, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Product, CartItem, DeliveryMode, DeliveryAddress } from '@/types';
import { DeliveryAddressForm } from '@/components/client/DeliveryAddressForm';

interface CartDrawerProps {
  className?: string;
  onEditItem?: (productId: string, cartItem: CartItem) => void;
  onAddSuggestion?: (product: Product) => void;
  allProducts?: Product[];
  externalOpen?: boolean;
  onExternalClose?: () => void;
}

export function CartDrawer({ className, onEditItem, onAddSuggestion, allProducts = [], externalOpen, onExternalClose }: CartDrawerProps) {
  const { cart, itemCount, updateItemQuantity, removeItem, clearCart, deliveryMode, setDeliveryMode, deliveryAddress, setDeliveryAddress } = useCart();
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (externalOpen !== undefined) {
      if (!v && onExternalClose) onExternalClose();
    } else {
      setInternalOpen(v);
    }
  };
  const [showPickupConfirm, setShowPickupConfirm] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const handleCheckout = () => {
    if (!cart) return;
    if (deliveryMode === 'pickup') {
      setShowPickupConfirm(true);
    } else {
      setOpen(false);
      navigate(`/checkout/${cart.restaurantSlug}`);
    }
  };

  const confirmPickupCheckout = () => {
    if (cart) {
      setShowPickupConfirm(false);
      setOpen(false);
      navigate(`/checkout/${cart.restaurantSlug}`);
    }
  };

  // Sugestões: produtos que NÃO estão no carrinho
  const suggestions = useMemo(() => {
    if (!cart || allProducts.length === 0) return [];
    const cartProductIds = new Set(cart.items.map(i => i.productId));
    return allProducts
      .filter(p => !cartProductIds.has(p.id) && p.available)
      .slice(0, 8);
  }, [cart, allProducts]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {externalOpen === undefined && (
        <SheetTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className={cn('relative', className)}
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-medium text-destructive-foreground">
                {itemCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
      )}

      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md gap-0 [&>button.absolute]:top-3.5 [&>button.absolute]:right-4">
        {/* Header */}
        <div className="border-b border-border px-5 py-3.5 pr-12">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Resumo do pedido</h2>
            {cart && (
              <button
                className="text-[11px] font-medium text-muted-foreground hover:text-destructive transition-colors"
                onClick={clearCart}
              >
                Limpar tudo
              </button>
            )}
          </div>
          {cart && (
            <p className="mt-0.5 text-xs text-muted-foreground">{cart.restaurantName}</p>
          )}
        </div>

        {!cart || cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ShoppingCart className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-medium text-foreground">Nenhum item ainda</p>
              <p className="text-sm text-muted-foreground mt-0.5">Adicione itens do cardápio</p>
            </div>
          </div>
        ) : (
          <>
            {/* Delivery mode selector */}
            <div className="border-b border-border px-5 py-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2.5">Como você quer receber?</p>
              <div className="flex gap-2.5">
                {([
                  { mode: 'delivery' as DeliveryMode, icon: Truck, label: 'Entrega', desc: 'A gente leva até você' },
                  { mode: 'pickup' as DeliveryMode, icon: Store, label: 'Retirada', desc: cart.restaurantAddress ? `Você retira em: ${cart.restaurantAddress}` : 'Você retira no local' },
                ]).map(opt => (
                  <button
                    key={opt.mode}
                    onClick={() => {
                      setDeliveryMode(opt.mode);
                      if (opt.mode === 'delivery' && !deliveryAddress) {
                        setShowAddressForm(true);
                      }
                    }}
                    className={cn(
                      'flex-1 flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all',
                      deliveryMode === opt.mode
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    )}
                  >
                    <opt.icon className={cn(
                      'h-4.5 w-4.5 shrink-0',
                      deliveryMode === opt.mode ? 'text-primary' : 'text-muted-foreground'
                    )} />
                     <div className="min-w-0">
                      <p className={cn(
                        'text-sm font-semibold leading-tight',
                        deliveryMode === opt.mode ? 'text-primary' : 'text-foreground'
                      )}>{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 break-words">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery address section */}
            {deliveryMode === 'delivery' && (
              <>
                {deliveryAddress && !showAddressForm ? (
                  <div className="border-b border-border px-5 py-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">Entregar em:</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                          {deliveryAddress.street}, {deliveryAddress.number}
                          {deliveryAddress.complement ? ` - ${deliveryAddress.complement}` : ''}
                          {deliveryAddress.aptBloco ? ` (${deliveryAddress.aptBloco})` : ''}
                          <br />
                          {deliveryAddress.neighborhood} - {deliveryAddress.city}/{deliveryAddress.state}
                        </p>
                      </div>
                      <button
                        className="text-[11px] font-medium text-primary hover:underline shrink-0"
                        onClick={() => setShowAddressForm(true)}
                      >
                        Alterar
                      </button>
                    </div>
                  </div>
                ) : showAddressForm ? (
                  <DeliveryAddressForm
                    address={deliveryAddress}
                    onSave={(addr) => {
                      setDeliveryAddress(addr);
                      setShowAddressForm(false);
                    }}
                  />
                ) : (
                  <div className="border-b border-border px-5 py-3">
                    <button
                      className="flex items-center gap-2 text-xs font-medium text-primary hover:underline"
                      onClick={() => setShowAddressForm(true)}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Adicionar endereço de entrega
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Items list */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="divide-y divide-border">
                {(() => {
                  // Merge identical items (same product, complements, observation)
                  const merged: (CartItem & { mergedIds: string[] })[] = [];
                  cart.items.forEach(item => {
                    const compKey = item.complements
                      .map(c => `${c.complementName}:${c.price}`)
                      .sort()
                      .join('|');
                    const removedKey = [...(item.removedIngredients || [])].sort().join('|');
                    const key = `${item.productId}::${compKey}::${removedKey}::${item.observation || ''}::${item.unitPrice}`;
                    const existing = merged.find(m => {
                      const mCompKey = m.complements
                        .map(c => `${c.complementName}:${c.price}`)
                        .sort()
                        .join('|');
                      const mRemovedKey = [...(m.removedIngredients || [])].sort().join('|');
                      return `${m.productId}::${mCompKey}::${mRemovedKey}::${m.observation || ''}::${m.unitPrice}` === key;
                    });
                    if (existing) {
                      existing.quantity += item.quantity;
                      existing.totalPrice += item.totalPrice;
                      existing.mergedIds.push(item.id);
                    } else {
                      merged.push({ ...item, mergedIds: [item.id] });
                    }
                  });
                  return merged;
                })().map(item => (
                  <div key={item.mergedIds.join('-')} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      {/* Image thumbnail */}
                      <div className="h-16 w-16 shrink-0 rounded-lg bg-muted overflow-hidden">
                        {item.productImage && item.productImage.startsWith('http') ? (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xl">
                            {item.productImage || '🍽️'}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-snug">
                            <span className="text-muted-foreground font-normal">{item.quantity}x</span>{' '}
                            {item.productName}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-sm font-bold tabular-nums">
                              R$ {item.totalPrice.toFixed(2).replace('.', ',')}
                            </span>
                            <button
                              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              onClick={() => removeItem(item.id)}
                              aria-label="Remover item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Complements grouped by category */}
                        {item.complements.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {(() => {
                              // Group by groupName preserving order
                              const groups: { name: string; items: { complementName: string; count: number }[] }[] = [];
                              const groupMap = new Map<string, Map<string, number>>();
                              const groupOrder: string[] = [];

                              item.complements.forEach(c => {
                                if (!groupMap.has(c.groupName)) {
                                  groupMap.set(c.groupName, new Map());
                                  groupOrder.push(c.groupName);
                                }
                                const counts = groupMap.get(c.groupName)!;
                                counts.set(c.complementName, (counts.get(c.complementName) || 0) + 1);
                              });

                              groupOrder.forEach(gName => {
                                const counts = groupMap.get(gName)!;
                                groups.push({
                                  name: gName,
                                  items: Array.from(counts.entries()).map(([n, q]) => ({ complementName: n, count: q })),
                                });
                              });

                              const allItems = groups.flatMap(g => g.items);
                              return (
                                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 break-words">
                                  {allItems
                                    .map(i => i.count > 1 ? `${i.count}x ${i.complementName}` : i.complementName)
                                    .join(', ')}
                                </p>
                              );
                            })()}
                          </div>
                        )}

                        {/* Removed ingredients */}
                        {item.removedIngredients && item.removedIngredients.length > 0 && (
                          <p className="mt-1 text-[11px] text-destructive leading-relaxed">
                            <span className="font-semibold">Remover:</span> {item.removedIngredients.join(', ')}
                          </p>
                        )}

                        {/* Observation */}
                        {item.observation && (
                          <p className="mt-1 text-[11px] text-muted-foreground italic leading-relaxed">
                            <span className="font-semibold not-italic">Obs:</span> {item.observation}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="mt-2.5 flex items-center gap-1">
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
                            onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            aria-label="Diminuir"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                            aria-label="Aumentar"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="ml-1 px-2.5 h-7 text-[11px] font-semibold rounded-md border border-border text-foreground hover:bg-muted transition-colors"
                            onClick={() => {
                              setOpen(false);
                              setTimeout(() => onEditItem?.(item.productId, item), 300);
                            }}
                          >
                            Editar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}


                {/* "Peça também" - after items, inside same scroll container */}
                {suggestions.length > 0 && (
                  <SuggestionsCarousel
                    suggestions={suggestions}
                    onAdd={(product) => {
                      setOpen(false);
                      setTimeout(() => onAddSuggestion?.(product), 300);
                    }}
                  />
                )}
              </div>

            </div>

            {/* Footer summary */}
            <div className="border-t-2 border-foreground/10 px-5 pt-4 pb-5 space-y-1.5 bg-muted/30">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">R$ {cart.subtotal.toFixed(2).replace('.', ',')}</span>
              </div>

              {deliveryMode === 'delivery' && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de entrega</span>
                  <span className="tabular-nums">
                    {cart.deliveryFee > 0
                      ? `R$ ${cart.deliveryFee.toFixed(2).replace('.', ',')}`
                      : 'A definir'}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
                <span>Total</span>
                <span className="tabular-nums">
                  R$ {(deliveryMode === 'pickup' ? cart.subtotal : cart.total).toFixed(2).replace('.', ',')}
                </span>
              </div>

              <Button
                className="w-full mt-3 h-12 text-base font-bold"
                size="lg"
                onClick={handleCheckout}
              >
                Continuar pedido
              </Button>
            </div>

            {/* Pickup confirmation dialog */}
            <AlertDialog open={showPickupConfirm} onOpenChange={setShowPickupConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar retirada no local</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <span className="block">Você escolheu <strong>retirar o pedido</strong> no estabelecimento.</span>
                    {cart.restaurantAddress && (
                      <span className="flex items-start gap-1.5 text-foreground font-medium">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                        {cart.restaurantAddress}
                      </span>
                    )}
                    <span className="block">Deseja continuar?</span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmPickupCheckout}>
                    Sim, retirar no local
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SuggestionsCarousel({ suggestions, onAdd }: { suggestions: Product[]; onAdd: (p: Product) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPaused = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>();
  const directionRef = useRef<1 | -1>(1);

  const scroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isPaused.current) return;
    
    const maxScroll = el.scrollWidth - el.clientWidth;
    
    // Reverse direction at edges
    if (el.scrollLeft >= maxScroll - 1) {
      directionRef.current = -1;
    } else if (el.scrollLeft <= 0) {
      directionRef.current = 1;
    }
    
    el.scrollLeft += directionRef.current * 0.5;
  }, []);

  useEffect(() => {
    const interval = setInterval(scroll, 40);
    return () => clearInterval(interval);
  }, [scroll]);

  const handleInteractionStart = useCallback(() => {
    isPaused.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  const handleInteractionEnd = useCallback(() => {
    resumeTimer.current = setTimeout(() => {
      isPaused.current = false;
    }, 3000);
  }, []);

  return (
    <div className="border-t border-border px-5 py-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
        Peça também
      </h3>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}
        onMouseDown={handleInteractionStart}
        onMouseUp={handleInteractionEnd}
        onMouseLeave={handleInteractionEnd}
        onTouchStart={handleInteractionStart}
        onTouchEnd={handleInteractionEnd}
        onWheel={handleInteractionStart}
        onScrollCapture={() => {
          // If user is scrolling manually, pause
          if (!isPaused.current) return;
          if (resumeTimer.current) clearTimeout(resumeTimer.current);
          resumeTimer.current = setTimeout(() => { isPaused.current = false; }, 3000);
        }}
      >
        {suggestions.map(product => (
          <button
            key={product.id}
            className="flex flex-col items-center shrink-0 w-[90px] group"
            onClick={() => onAdd(product)}
          >
            <div className="relative h-[72px] w-[72px] rounded-xl bg-muted overflow-hidden mb-1.5 ring-1 ring-border group-hover:ring-primary transition-all">
              {product.image && product.image.startsWith('http') ? (
                <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl bg-muted">🍔</div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 group-hover:bg-foreground/20 transition-colors">
                <Plus className="h-5 w-5 text-background opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
            </div>
            <span className="text-[11px] font-medium text-foreground text-center leading-tight line-clamp-2">
              {product.name}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
