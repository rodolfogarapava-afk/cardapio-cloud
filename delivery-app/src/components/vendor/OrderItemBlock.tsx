import { MessageSquare, Plus, Minus, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderItemSummary, OrderItemModifier } from '@/data/mockData';

interface OrderItemBlockProps {
  item: OrderItemSummary;
  showPrice?: boolean;
  className?: string;
}

/**
 * Card de item de pedido no padrão iFood / Anota AÍ:
 * - Linha principal: qty + nome do produto + preço total
 * - Sub-itens recuados sob guia vertical (border-left)
 *   - Opções/sabores agrupados por groupName
 *   - Adicionais com prefixo "+"
 *   - Remoções e ponto/preparo como chips coloridos
 * - Observação livre destacada com fundo muted
 */
export function OrderItemBlock({ item, showPrice = true, className }: OrderItemBlockProps) {
  const hasUnitPrice = typeof item.unitPrice === 'number';
  const lineTotal = hasUnitPrice
    ? item.qty * (item.unitPrice ?? 0)
      + (item.modifiers?.reduce((s, m) => s + (m.price ?? 0) * (m.qty ?? 1), 0) ?? 0)
    : 0;

  // Agrupar opções por groupName (mantém ordem de aparição)
  const options = (item.modifiers ?? []).filter(m => m.type === 'option');
  const addons = (item.modifiers ?? []).filter(m => m.type === 'addon');
  const removals = (item.modifiers ?? []).filter(m => m.type === 'removal');
  const preparations = (item.modifiers ?? []).filter(m => m.type === 'preparation');

  const optionGroups = new Map<string, OrderItemModifier[]>();
  options.forEach(o => {
    const key = o.groupName ?? '';
    if (!optionGroups.has(key)) optionGroups.set(key, []);
    optionGroups.get(key)!.push(o);
  });

  const hasDetails = options.length + addons.length + removals.length + preparations.length > 0 || !!item.note;

  return (
    <div className={cn('rounded-lg border bg-card px-3 py-2.5', className)}>
      {/* Linha principal */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="shrink-0 inline-flex items-center justify-center min-w-[28px] h-6 rounded-md bg-muted text-foreground text-xs font-semibold tabular-nums px-1.5">
            {item.qty}×
          </span>
          <p className="text-sm font-semibold text-foreground leading-6 min-w-0 break-words">
            {item.name}
          </p>
        </div>
        {showPrice && hasUnitPrice && (
          <span className="text-sm font-semibold tabular-nums shrink-0">
            R$ {lineTotal.toFixed(2)}
          </span>
        )}
      </div>

      {/* Sub-itens */}
      {hasDetails && (
        <div className="mt-2 ml-3 pl-3 border-l-2 border-border/60 space-y-1.5">
          {/* Grupos de opções */}
          {Array.from(optionGroups.entries()).map(([group, mods]) => (
            <div key={group} className="text-xs text-muted-foreground leading-relaxed">
              {group && <span className="font-medium text-foreground/70">{group}: </span>}
              {mods.map(m => m.label).join(' • ')}
            </div>
          ))}

          {/* Adicionais */}
          {addons.map((m, i) => (
            <div key={`addon-${i}`} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-foreground">
                <Plus className="h-3 w-3 text-success shrink-0" />
                <span>
                  {(m.qty ?? 1) > 1 && <span className="tabular-nums font-medium">{m.qty}× </span>}
                  {m.label}
                </span>
              </span>
              {typeof m.price === 'number' && m.price > 0 && (
                <span className="text-muted-foreground tabular-nums shrink-0">
                  + R$ {(m.price * (m.qty ?? 1)).toFixed(2)}
                </span>
              )}
            </div>
          ))}

          {/* Remoções e preparo como chips */}
          {(removals.length > 0 || preparations.length > 0) && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {removals.map((m, i) => (
                <span
                  key={`rm-${i}`}
                  className="inline-flex items-center gap-1 rounded-md bg-destructive/10 text-destructive text-[11px] font-medium px-1.5 py-0.5"
                >
                  <Minus className="h-2.5 w-2.5" />
                  {m.label}
                </span>
              ))}
              {preparations.map((m, i) => (
                <span
                  key={`prep-${i}`}
                  className="inline-flex items-center gap-1 rounded-md bg-warning/10 text-warning text-[11px] font-medium px-1.5 py-0.5"
                >
                  <Flame className="h-2.5 w-2.5" />
                  {m.label}
                </span>
              ))}
            </div>
          )}

          {/* Observação livre */}
          {item.note && (
            <div className="flex items-start gap-1.5 mt-1 rounded-md bg-muted/60 px-2 py-1.5">
              <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs italic text-foreground/80 leading-snug">"{item.note}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
