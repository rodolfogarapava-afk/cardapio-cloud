import { useState, useRef, useEffect, useMemo } from 'react';
import { Minus, Plus, X, ChevronLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


import { Textarea } from '@/components/ui/textarea';
import { Product, CartItem, CartItemComplement, ComplementGroup } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getSelectionType, getPricingMode, computeGroupPrice } from '@/lib/complementGroup';
import { isWithinSchedule } from '@/lib/availability';

interface ComplementsModalProps {
  product: Product;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  restaurantAddress?: string;
  open: boolean;
  onClose: () => void;
  editingItem?: CartItem;
}

export function ComplementsModal({
  product,
  restaurantId,
  restaurantName,
  restaurantSlug,
  restaurantAddress,
  open,
  onClose,
  editingItem,
}: ComplementsModalProps) {
  const { addItem, updateItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState('');
  const [selectedComplements, setSelectedComplements] = useState<Record<string, string[]>>({});
  const [complementQuantities, setComplementQuantities] = useState<Record<string, number>>({});
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [groupSearch, setGroupSearch] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Filtra grupos fora da janela de disponibilidade
  const complementGroups = (product.complementGroups || []).filter(g => isWithinSchedule(g.availability));
  const ingredients = product.ingredients || [];
  const removableIngredients = ingredients.filter(i => i.removable);

  // Pre-fill state when editing an existing cart item
  useEffect(() => {
    if (editingItem && open) {
      setQuantity(editingItem.quantity);
      setObservation(editingItem.observation || '');

      // Rebuild selectedComplements and complementQuantities from editingItem.complements
      const selComps: Record<string, string[]> = {};
      const compQtys: Record<string, number> = {};

      editingItem.complements.forEach(c => {
        const group = complementGroups.find(g => g.id === c.groupId);
        if (!group) return;
        const selType = getSelectionType(group);
        if (selType === 'repeat') {
          const qtyKey = `${c.groupId}::${c.complementId}`;
          compQtys[qtyKey] = (compQtys[qtyKey] || 0) + 1;
        } else {
          const existing = selComps[c.groupId] || [];
          if (!existing.includes(c.complementId)) {
            selComps[c.groupId] = [...existing, c.complementId];
          }
        }
      });

      setSelectedComplements(selComps);
      setComplementQuantities(compQtys);
      setRemovedIngredients(editingItem.removedIngredients || []);
    } else if (open && !editingItem) {
      setQuantity(1);
      setObservation('');
      setSelectedComplements({});
      setComplementQuantities({});
      setRemovedIngredients([]);
      setGroupSearch({});
    }
  }, [editingItem, open]);
  const isValid = complementGroups.every(group => {
    if (!group.required) return true;
    const selected = selectedComplements[group.id] || [];
    return selected.length >= group.min;
  });

  const complementsPrice = (() => {
    // Grupos por seleção (single/multiple)
    const selPrice = Object.entries(selectedComplements).reduce((total, [groupId, complementIds]) => {
      const group = complementGroups.find(g => g.id === groupId);
      if (!group || complementIds.length === 0) return total;
      const prices = complementIds.map(cId => group.complements.find(c => c.id === cId)?.price || 0);
      return total + computeGroupPrice(prices, getPricingMode(group));
    }, 0);
    // Grupos por repetição (stepper) — agrupa qtys por grupo
    const qtyByGroup: Record<string, number[]> = {};
    Object.entries(complementQuantities).forEach(([key, qty]) => {
      if (qty <= 0) return;
      const [groupId, compId] = key.split('::');
      const group = complementGroups.find(g => g.id === groupId);
      const comp = group?.complements.find(c => c.id === compId);
      if (!group || !comp) return;
      const arr = qtyByGroup[groupId] || (qtyByGroup[groupId] = []);
      for (let i = 0; i < qty; i++) arr.push(comp.price);
    });
    const qtyPrice = Object.entries(qtyByGroup).reduce((total, [groupId, prices]) => {
      const group = complementGroups.find(g => g.id === groupId);
      if (!group) return total;
      return total + computeGroupPrice(prices, getPricingMode(group));
    }, 0);
    return selPrice + qtyPrice;
  })();

  // Se algum grupo substitui o preço base (max/avg/min ou 'flavor'), o produto vira "a partir de"
  const hasReplacementGroup = complementGroups.some(g =>
    g.kind === 'flavor' || (getPricingMode(g) !== 'sum')
  );
  const basePrice = hasReplacementGroup ? 0 : product.price;
  const unitPrice = basePrice + complementsPrice;
  const totalPrice = (unitPrice > 0 ? unitPrice : product.price) * quantity;

  // Hero dinâmico: pega a imagem do primeiro sabor selecionado em um grupo 'flavor'.
  const dynamicHeroImage = useMemo(() => {
    for (const group of complementGroups) {
      if (group.kind !== 'flavor') continue;
      const selected = selectedComplements[group.id] || [];
      for (const cId of selected) {
        const comp = group.complements.find(c => c.id === cId);
        if (comp?.image) return comp.image;
      }
    }
    return null;
  }, [selectedComplements, complementGroups]);
  const heroImage = dynamicHeroImage || product.image;

  const handleComplementToggle = (group: ComplementGroup, complementId: string) => {
    setSelectedComplements(prev => {
      const current = prev[group.id] || [];
      const selType = getSelectionType(group);
      if (selType === 'single') {
        return { ...prev, [group.id]: [complementId] };
      }
      if (current.includes(complementId)) {
        return { ...prev, [group.id]: current.filter(id => id !== complementId) };
      }
      if (current.length >= group.max) return prev;
      return { ...prev, [group.id]: [...current, complementId] };
    });
  };

  /** Distribui um valor total entre N linhas: coloca tudo na primeira, 0 nas demais.
   * Garante que a SOMA dos `price` no carrinho == valor efetivo do grupo. */
  const distributePrice = (total: number, count: number): number[] => {
    if (count <= 0) return [];
    return Array.from({ length: count }, (_, i) => (i === 0 ? total : 0));
  };

  const handleAddToCart = () => {
    const complements: CartItemComplement[] = [];

    // Grupos por seleção (single/multiple)
    Object.entries(selectedComplements).forEach(([groupId, complementIds]) => {
      const group = complementGroups.find(g => g.id === groupId);
      if (!group || complementIds.length === 0) return;
      const mode = getPricingMode(group);
      const prices = complementIds.map(cId => group.complements.find(c => c.id === cId)?.price || 0);
      const effective = computeGroupPrice(prices, mode);

      let distributed: number[];
      if (mode === 'sum') {
        distributed = prices;
      } else if (mode === 'max') {
        // Vencedor: primeiro item de maior preço; os demais zeram (mantém nomes).
        const winnerIdx = prices.indexOf(Math.max(...prices));
        distributed = prices.map((_, i) => (i === winnerIdx ? effective : 0));
      } else if (mode === 'min') {
        const winnerIdx = prices.indexOf(Math.min(...prices));
        distributed = prices.map((_, i) => (i === winnerIdx ? effective : 0));
      } else {
        // avg → tudo na primeira linha para bater no somatório do carrinho
        distributed = distributePrice(effective, prices.length);
      }

      complementIds.forEach((complementId, i) => {
        const comp = group.complements.find(c => c.id === complementId);
        if (!comp) return;
        complements.push({
          groupId: group.id, groupName: group.name,
          complementId: comp.id, complementName: comp.name,
          price: distributed[i] ?? 0,
        });
      });
    });

    // Grupos por repetição (stepper)
    const qtyByGroup: Record<string, { compId: string; price: number; name: string }[]> = {};
    Object.entries(complementQuantities).forEach(([key, qty]) => {
      if (qty <= 0) return;
      const [groupId, compId] = key.split('::');
      const group = complementGroups.find(g => g.id === groupId);
      const comp = group?.complements.find(c => c.id === compId);
      if (!group || !comp) return;
      const arr = qtyByGroup[groupId] || (qtyByGroup[groupId] = []);
      for (let i = 0; i < qty; i++) arr.push({ compId: comp.id, price: comp.price, name: comp.name });
    });
    Object.entries(qtyByGroup).forEach(([groupId, rows]) => {
      const group = complementGroups.find(g => g.id === groupId);
      if (!group) return;
      const mode = getPricingMode(group);
      const prices = rows.map(r => r.price);
      const effective = computeGroupPrice(prices, mode);

      let distributed: number[];
      if (mode === 'sum') {
        distributed = prices;
      } else if (mode === 'max') {
        const winnerIdx = prices.indexOf(Math.max(...prices));
        distributed = prices.map((_, i) => (i === winnerIdx ? effective : 0));
      } else if (mode === 'min') {
        const winnerIdx = prices.indexOf(Math.min(...prices));
        distributed = prices.map((_, i) => (i === winnerIdx ? effective : 0));
      } else {
        distributed = distributePrice(effective, prices.length);
      }

      rows.forEach((r, i) => {
        complements.push({
          groupId: group.id, groupName: group.name,
          complementId: r.compId, complementName: r.name,
          price: distributed[i] ?? 0,
        });
      });
    });

    // Se algum grupo substitui o preço base, não cobra o preço do produto.
    const cartUnitPrice = hasReplacementGroup ? 0 : product.price;

    if (editingItem) {
      updateItem(editingItem.id, cartUnitPrice, quantity, complements, observation || undefined, removedIngredients.length > 0 ? removedIngredients : undefined);
    } else {
      addItem(
        restaurantId, restaurantName, restaurantSlug, restaurantAddress,
        product.id, product.name, heroImage || product.image,
        cartUnitPrice, quantity, complements,
        observation || undefined,
        removedIngredients.length > 0 ? removedIngredients : undefined
      );
    }
    handleClose();
  };

  const handleClose = () => {
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%', opacity: 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 1 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'relative z-10 flex flex-col bg-background overflow-hidden',
              // Mobile: full height with rounded top corners
              'w-full h-[95vh] rounded-t-3xl',
              // Desktop: centered dialog
              'sm:h-auto sm:max-h-[85vh] sm:max-w-md sm:rounded-2xl sm:border sm:shadow-2xl'
            )}
          >
            {/* Mobile top bar - hidden on desktop */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b bg-background sm:hidden">
              <button
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="font-semibold text-sm truncate flex-1">{product.name}</span>
            </div>

            {/* Desktop close button */}
            <button
              onClick={handleClose}
              className="hidden sm:flex absolute right-3 top-3 z-20 h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Scrollable content - hidden scrollbar */}
            <div
              ref={scrollRef}
              className="complements-scroll flex-1 overflow-y-auto overscroll-contain"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <style>{`
                .complements-scroll::-webkit-scrollbar { display: none; }
              `}</style>

              {/* Product image hero (dinâmico) */}
              {heroImage && (
                <div className="relative w-full bg-muted shrink-0 overflow-hidden aspect-[16/10] sm:aspect-[16/9] sm:rounded-t-2xl">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={heroImage}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="absolute inset-0"
                    >
                      {heroImage.startsWith('http') ? (
                        <img src={heroImage} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-6xl bg-muted">{heroImage}</div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
                </div>
              )}

              {/* Product info */}
              <div className="px-4 pt-4 pb-3">
                <h2 className="text-lg sm:text-xl font-bold leading-tight">{product.name}</h2>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-base font-semibold text-primary">
                    {hasReplacementGroup && 'A partir de '}R$ {product.price.toFixed(2).replace('.', ',')}
                  </p>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-xs text-muted-foreground line-through">
                      R$ {product.originalPrice.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                </div>
                {hasReplacementGroup && (
                  <p className="text-xs text-muted-foreground mt-1">
                    O valor final depende das opções escolhidas.
                  </p>
                )}
                {product.description && (
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{product.description}</p>
                )}
              </div>

              {/* Divider */}
              <div className="h-2 bg-muted/50" />

              {/* Complement groups */}
              {complementGroups.map(group => {
                const selected = selectedComplements[group.id] || [];
                const selType = getSelectionType(group);
                const isRadio = selType === 'single';
                const useSelection = selType !== 'repeat';
                const showSearch = group.complements.length > 6;
                const searchTerm = (groupSearch[group.id] || '').toLowerCase().trim();
                const visibleComplements = searchTerm
                  ? group.complements.filter(c =>
                      c.name.toLowerCase().includes(searchTerm) ||
                      (c.description || '').toLowerCase().includes(searchTerm)
                    )
                  : group.complements;

                return (
                  <div
                    key={group.id}
                    ref={el => { groupRefs.current[group.id] = el; }}
                  >
                    {/* Sticky group header */}
                    <div className="sticky top-0 z-10 bg-muted border-b px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm">{group.name}</h4>
                          {group.required && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Escolha {group.min === group.max ? group.min : `${group.min} a ${group.max}`}
                            </p>
                          )}
                        </div>
                        {group.required ? (
                          <span className={cn(
                            'shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide',
                            selected.length >= group.min
                              ? 'bg-success/10 text-success'
                              : 'bg-warning/10 text-warning'
                          )}>
                            {group.max > 1
                              ? `${selected.length}/${group.max}${selected.length >= group.min ? ' ✓' : ''}`
                              : (selected.length >= group.min ? '✓ Pronto' : 'Obrigatório')}
                          </span>
                        ) : group.max > 1 && (
                          <span className="shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide bg-muted-foreground/10 text-muted-foreground">
                            Opcional · {selected.length}/{group.max}
                          </span>
                        )}
                      </div>
                      {showSearch && (
                        <div className="relative mt-2">
                          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={groupSearch[group.id] || ''}
                            onChange={e => setGroupSearch(prev => ({ ...prev, [group.id]: e.target.value }))}
                            placeholder="Buscar sabor..."
                            className="h-8 pl-8 text-xs bg-background"
                          />
                        </div>
                      )}
                    </div>

                    {/* Items */}
                    <div className="px-4">
                      {useSelection ? (
                        <div role={isRadio ? 'radiogroup' : 'group'}>
                          {visibleComplements.map((comp, idx) => {
                            const isSelected = selected.includes(comp.id);
                            const isUnavailable = comp.available === false;
                            const atLimit = !isSelected && selected.length >= group.max;
                            const disabled = isUnavailable || (atLimit && !isRadio);
                            return (
                              <button
                                type="button"
                                key={comp.id}
                                disabled={disabled}
                                onClick={() => !disabled && handleComplementToggle(group, comp.id)}
                                className={cn(
                                  'w-full flex items-start gap-3 py-3.5 text-left transition-opacity',
                                  idx < visibleComplements.length - 1 && 'border-b border-border/40',
                                  disabled && 'opacity-50 cursor-not-allowed',
                                )}
                              >
                                {/* Indicador */}
                                <span className={cn(
                                  'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                                  isRadio ? 'rounded-full' : 'rounded',
                                  isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
                                )}>
                                  {isSelected && (isRadio
                                    ? <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                                    : <span className="text-[10px] font-bold leading-none">✓</span>)}
                                </span>

                                {/* Texto */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium">{comp.name}</span>
                                    {isUnavailable && (
                                      <span className="rounded-md bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-warning">
                                        Em falta
                                      </span>
                                    )}
                                  </div>
                                  {comp.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{comp.description}</p>
                                  )}
                                </div>

                                {/* Preço */}
                                {comp.price > 0 && (
                                  <span className="shrink-0 text-xs text-muted-foreground font-medium whitespace-nowrap">
                                    +R$ {comp.price.toFixed(2).replace('.', ',')}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                          {visibleComplements.length === 0 && (
                            <p className="py-6 text-center text-xs text-muted-foreground">Nenhum sabor encontrado.</p>
                          )}
                        </div>
                      ) : (
                        <div>
                          {visibleComplements.map((comp, idx) => {
                            const qtyKey = `${group.id}::${comp.id}`;
                            const qty = complementQuantities[qtyKey] || 0;
                            const isUnavailable = comp.available === false;
                            return (
                              <div
                                key={comp.id}
                                className={cn(
                                  'flex items-center justify-between py-3.5',
                                  idx < visibleComplements.length - 1 && 'border-b border-border/40',
                                  isUnavailable && 'opacity-50'
                                )}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm">{comp.name}</span>
                                    {isUnavailable && (
                                      <span className="rounded-md bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-warning">
                                        Em falta
                                      </span>
                                    )}
                                  </div>
                                  {comp.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{comp.description}</p>
                                  )}
                                  {comp.price > 0 && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      +R$ {comp.price.toFixed(2).replace('.', ',')}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {qty > 0 && (
                                    <>
                                      <button
                                        className="flex h-7 w-7 items-center justify-center rounded-full border border-primary text-primary transition-colors hover:bg-primary/10"
                                        onClick={() => setComplementQuantities(prev => ({ ...prev, [qtyKey]: qty - 1 }))}
                                      >
                                        <Minus className="h-3 w-3" />
                                      </button>
                                      <span className="w-5 text-center text-sm font-semibold">{qty}</span>
                                    </>
                                  )}
                                  <button
                                    disabled={isUnavailable}
                                    className="flex h-7 w-7 items-center justify-center rounded-full border border-primary text-primary transition-colors hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed"
                                    onClick={() => !isUnavailable && setComplementQuantities(prev => ({ ...prev, [qtyKey]: qty + 1 }))}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {visibleComplements.length === 0 && (
                            <p className="py-6 text-center text-xs text-muted-foreground">Nenhum item encontrado.</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Section divider */}
                    <div className="h-2 bg-muted/50" />
                  </div>
                );
              })}

              {/* Ingredientes (apenas se o produto tem ingredientes removíveis) */}
              {removableIngredients.length > 0 && (
                <>
                  <div className="sticky top-0 z-10 bg-muted border-b border-t px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm">Ingredientes</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Desmarque o que não quiser
                        </p>
                      </div>
                      {removedIngredients.length > 0 && (
                        <span className="shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide bg-destructive/10 text-destructive">
                          {removedIngredients.length} removido{removedIngredients.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {ingredients.map(ing => {
                        const isRemoved = removedIngredients.includes(ing.name);
                        const isFixed = !ing.removable;
                        const isKept = !isRemoved && !isFixed;
                        return (
                          <button
                            type="button"
                            key={ing.id}
                            disabled={isFixed}
                            onClick={() => {
                              if (isFixed) return;
                              setRemovedIngredients(prev =>
                                prev.includes(ing.name)
                                  ? prev.filter(n => n !== ing.name)
                                  : [...prev, ing.name]
                              );
                            }}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                              isKept && 'border-primary/40 bg-primary/5 text-foreground',
                              isRemoved && 'border-destructive/40 bg-destructive/10 text-destructive line-through',
                              isFixed && 'border-border bg-muted text-muted-foreground cursor-not-allowed'
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-3.5 w-3.5 items-center justify-center rounded-sm border text-[10px] font-bold leading-none',
                                isKept && 'border-primary bg-primary text-primary-foreground',
                                isRemoved && 'border-destructive bg-transparent text-destructive',
                                isFixed && 'border-muted-foreground/30 bg-transparent'
                              )}
                            >
                              {isKept ? '✓' : isRemoved ? '×' : ''}
                            </span>
                            {ing.name}
                          </button>
                        );
                      })}
                    </div>
                    {removedIngredients.length > 0 && (
                      <p className="mt-3 text-xs text-destructive">
                        Remover: {removedIngredients.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="h-2 bg-muted/50" />
                </>
              )}

              {/* Observações */}
              <div className="px-4 py-4">
                <h4 className="font-bold text-sm mb-2">Alguma observação?</h4>
                <Textarea
                  placeholder="Ex: Sem cebola, ponto da carne..."
                  value={observation}
                  onChange={e => setObservation(e.target.value)}
                  className="resize-none text-sm border-border/60"
                  rows={2}
                />
              </div>

              {/* Bottom spacer for footer */}
              <div className="h-4" />
            </div>

            {/* Footer - always visible */}
            <div className="shrink-0 border-t bg-background px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-3">
                {/* Quantity selector */}
                <div className="flex items-center gap-1 shrink-0 rounded-lg border bg-muted/30 p-0.5">
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-background transition-colors"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center font-bold text-sm">{quantity}</span>
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-background transition-colors"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Add button */}
                <Button
                  className="flex-1 h-11 text-sm font-bold rounded-lg"
                  disabled={!isValid}
                  onClick={handleAddToCart}
                >
                  {editingItem ? 'Atualizar' : 'Adicionar'} · R$ {totalPrice.toFixed(2).replace('.', ',')}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
