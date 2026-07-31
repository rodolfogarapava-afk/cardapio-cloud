import { useMemo, useState } from 'react';
import {
  Search, Plus, Edit2, Trash2, X, ImageIcon, Layers, Pizza, Sparkles,
  ChevronDown, ChevronRight, GripVertical, Info, Utensils, Eye, Copy, ArrowUp, ArrowDown, CheckCircle2,
  Clock, Star, ShieldAlert, Truck, Store, Tag, Percent, DollarSign,
  Circle, CheckSquare, Hash, Sigma, Divide, TrendingUp, TrendingDown, CalendarClock,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { mockProducts, Product as MockProduct } from '@/data/mockData';
import type { ComplementGroup, Complement, ProductIngredient, AvailabilitySchedule } from '@/types';
import { AvailabilityEditor } from '@/components/vendor/AvailabilityEditor';
import { DEFAULT_SCHEDULE, describeSchedule } from '@/lib/availability';
import {
  getSelectionType, getPricingMode,
  PRICING_MODE_LABEL, PRICING_MODE_EXAMPLE,
  SELECTION_TYPE_LABEL, SELECTION_TYPE_HINT,
  type SelectionType, type PricingMode,
} from '@/lib/complementGroup';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============================================================
// Tipos locais — produto do editor no formato usado pelo CARDÁPIO
// ============================================================
interface MenuProduct extends MockProduct {
  description?: string;
  available?: boolean;
  complementGroups?: ComplementGroup[];
  ingredients?: ProductIngredient[];
  costPrice?: number;
  promoPrice?: number;
  promoSchedule?: AvailabilitySchedule;
  featured?: boolean;
  ageRestricted?: boolean;
  fulfillment?: 'pickup' | 'delivery' | 'both';
  availability?: AvailabilitySchedule;
}


const CATEGORIES = ['Pizzas', 'Lanches', 'Acompanhamentos', 'Bebidas', 'Sobremesas', 'Saladas'];

const GROUP_KIND_LABEL: Record<NonNullable<ComplementGroup['kind']>, string> = {
  flavor: 'Sabores',
  meat_point: 'Ponto',
  temperature: 'Temperatura',
  cutlery: 'Talheres',
  extras: 'Extras',
};

// ============================================================
// Combos (mantido — mock local)
// ============================================================
interface Combo {
  id: string;
  name: string;
  productIds: string[];
  price: number;
  active: boolean;
}

// ============================================================
// Helpers
// ============================================================
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

// ============================================================
// SectionCard — cartão de seção com acento colorido + colapso
// ============================================================
type AccentToken = 'primary' | 'success' | 'info' | 'warning' | 'destructive';

const ACCENT_STYLES: Record<AccentToken, { icon: string; ring: string; bar: string }> = {
  primary: {
    icon: 'bg-primary/10 text-primary ring-1 ring-primary/20',
    ring: 'hover:border-primary/30',
    bar: 'bg-primary',
  },
  success: {
    icon: 'bg-success/10 text-success ring-1 ring-success/20',
    ring: 'hover:border-success/30',
    bar: 'bg-success',
  },
  info: {
    icon: 'bg-info/10 text-info ring-1 ring-info/20',
    ring: 'hover:border-info/30',
    bar: 'bg-info',
  },
  warning: {
    icon: 'bg-warning/10 text-warning ring-1 ring-warning/20',
    ring: 'hover:border-warning/30',
    bar: 'bg-warning',
  },
  destructive: {
    icon: 'bg-destructive/10 text-destructive ring-1 ring-destructive/20',
    ring: 'hover:border-destructive/30',
    bar: 'bg-destructive',
  },
};

function SectionCard({
  icon: Icon,
  title,
  accent = 'primary',
  summary,
  headerRight,
  collapsible = true,
  defaultOpen = false,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  accent?: AccentToken;
  summary?: React.ReactNode;
  headerRight?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || !collapsible);
  const styles = ACCENT_STYLES[accent];

  const Header = (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3',
        collapsible && 'cursor-pointer select-none',
        open && collapsible && 'border-b border-border/70',
      )}
      onClick={collapsible ? () => setOpen(v => !v) : undefined}
      role={collapsible ? 'button' : undefined}
      tabIndex={collapsible ? 0 : undefined}
      onKeyDown={collapsible ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v); }
      } : undefined}
    >
      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', styles.icon)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold leading-tight">{title}</h3>
        {summary && !open && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{summary}</p>
        )}
      </div>
      {headerRight && (
        <div className="shrink-0 flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {headerRight}
        </div>
      )}
      {collapsible && (
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      )}
    </div>
  );

  return (
    <section
      className={cn(
        'relative rounded-xl border border-border bg-card shadow-sm transition-colors overflow-hidden',
        styles.ring,
      )}
    >
      <span className={cn('absolute left-0 top-0 bottom-0 w-[3px]', styles.bar, 'opacity-60')} />
      {Header}
      {open && <div className="p-4">{children}</div>}
    </section>
  );
}

// ============================================================
// EDITOR
// ============================================================
function ProductEditor({
  open, onClose, product, onSave,
}: {
  open: boolean;
  onClose: () => void;
  product: MenuProduct | null;
  onSave: (p: MenuProduct) => void;
}) {
  const [form, setForm] = useState<MenuProduct>(() => product ?? {
    id: uid('PRD'),
    name: '',
    category: CATEGORIES[0],
    price: 0,
    stock: 0,
    minStock: 0,
    sku: '',
    image: '',
    description: '',
    available: true,
    complementGroups: [],
    ingredients: [],
    costPrice: undefined,
    promoPrice: undefined,
    promoSchedule: undefined,
    featured: false,
    ageRestricted: false,
    fulfillment: 'both',
    availability: undefined,
  });

  const [imgError, setImgError] = useState(false);

  const patch = (p: Partial<MenuProduct>) => setForm(f => ({ ...f, ...p }));
  const groups = form.complementGroups ?? [];
  const ingredients = form.ingredients ?? [];

  // ---- Grupos ----
  const setGroups = (fn: (g: ComplementGroup[]) => ComplementGroup[]) =>
    patch({ complementGroups: fn(groups) });

  const addGroup = () => setGroups(gs => [
    ...gs,
    { id: uid('grp'), name: '', required: false, min: 0, max: 1, selectionType: 'single', pricingMode: 'sum', complements: [] },
  ]);
  const updateGroup = (id: string, p: Partial<ComplementGroup>) =>
    setGroups(gs => gs.map(g => g.id === id ? { ...g, ...p } : g));
  const removeGroup = (id: string) => setGroups(gs => gs.filter(g => g.id !== id));
  const duplicateGroup = (id: string) => setGroups(gs => {
    const g = gs.find(x => x.id === id);
    if (!g) return gs;
    const clone: ComplementGroup = {
      ...g,
      id: uid('grp'),
      name: g.name ? `${g.name} (cópia)` : '',
      complements: g.complements.map(c => ({ ...c, id: uid('cmp') })),
    };
    const i = gs.findIndex(x => x.id === id);
    return [...gs.slice(0, i + 1), clone, ...gs.slice(i + 1)];
  });
  const moveGroup = (id: string, dir: -1 | 1) => setGroups(gs => {
    const i = gs.findIndex(g => g.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= gs.length) return gs;
    const copy = [...gs];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  });

  // ---- Itens de grupo ----
  const addItem = (gid: string) => updateGroup(gid, {
    complements: [...(groups.find(g => g.id === gid)?.complements ?? []),
    { id: uid('cmp'), name: '', price: 0, available: true }],
  });
  const updateItem = (gid: string, cid: string, p: Partial<Complement>) => {
    const g = groups.find(x => x.id === gid);
    if (!g) return;
    updateGroup(gid, {
      complements: g.complements.map(c => c.id === cid ? { ...c, ...p } : c),
    });
  };
  const removeItem = (gid: string, cid: string) => {
    const g = groups.find(x => x.id === gid);
    if (!g) return;
    updateGroup(gid, { complements: g.complements.filter(c => c.id !== cid) });
  };
  const duplicateItem = (gid: string, cid: string) => {
    const g = groups.find(x => x.id === gid);
    if (!g) return;
    const c = g.complements.find(x => x.id === cid);
    if (!c) return;
    const i = g.complements.findIndex(x => x.id === cid);
    const clone = { ...c, id: uid('cmp'), name: c.name ? `${c.name} (cópia)` : '' };
    updateGroup(gid, {
      complements: [...g.complements.slice(0, i + 1), clone, ...g.complements.slice(i + 1)],
    });
  };

  // ---- Ingredientes ----
  const setIngredients = (fn: (i: ProductIngredient[]) => ProductIngredient[]) =>
    patch({ ingredients: fn(ingredients) });
  const addIngredient = () => setIngredients(is => [...is, { id: uid('ing'), name: '', removable: true }]);
  const updateIngredient = (id: string, p: Partial<ProductIngredient>) =>
    setIngredients(is => is.map(i => i.id === id ? { ...i, ...p } : i));
  const removeIngredient = (id: string) => setIngredients(is => is.filter(i => i.id !== id));

  const canSave = form.name.trim().length > 0 && form.price > 0;
  const hasImg = !!form.image && !imgError && form.image.startsWith('http');

  const basePreview = useMemo(() => {
    // Simula "a partir de": preço + menor item de cada grupo obrigatório
    let extra = 0;
    for (const g of groups) {
      if (g.required && g.complements.length) {
        extra += Math.min(...g.complements.map(c => c.price || 0));
      }
    }
    return form.price + extra;
  }, [form.price, groups]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[calc(100%-1rem)] p-0 gap-0 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b border-border flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <DialogTitle className="text-lg font-semibold truncate">
              {product ? 'Editar produto' : 'Novo produto'}
            </DialogTitle>
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
              <span className={cn('h-1.5 w-1.5 rounded-full',
                form.available ? 'bg-success animate-pulse' : 'bg-muted-foreground')} />
              <span className="text-[11px] font-medium text-muted-foreground">
                {form.available ? 'Disponível' : 'Indisponível'}
              </span>
            </div>
          </div>
          <Switch
            checked={!!form.available}
            onCheckedChange={v => patch({ available: v })}
          />
        </DialogHeader>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="edit" className="w-full">
            <div className="px-5 pt-4 pb-1 sticky top-0 bg-background z-10 border-b border-border/60">
              <TabsList className="h-10 bg-muted">
                <TabsTrigger value="edit" className="gap-1.5 text-sm">
                  <Utensils className="h-3.5 w-3.5" /> Editar
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-1.5 text-sm">
                  <Eye className="h-3.5 w-3.5" /> Prévia
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ============ EDITAR ============ */}
            <TabsContent value="edit" className="mt-0 px-5 py-5 space-y-6">
              {/* -------- Dados -------- */}
              <SectionCard
                icon={Info}
                title="Dados do produto"
                accent="primary"
                collapsible={false}
                defaultOpen
              >
                <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-5">
                  {/* Imagem */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Imagem</Label>
                    <div className="group relative aspect-square w-full max-w-[160px] mx-auto sm:mx-0 rounded-xl border-2 border-dashed border-border bg-muted/30 overflow-hidden">
                      {hasImg ? (
                        <>
                          <img
                            src={form.image}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={() => setImgError(true)}
                          />
                          <button
                            type="button"
                            onClick={() => patch({ image: '' })}
                            className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-background/90 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </>
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground gap-1.5 p-3 text-center">
                          <ImageIcon className="h-7 w-7" />
                          <p className="text-[11px] leading-tight">Cole a URL abaixo</p>
                        </div>
                      )}
                    </div>
                    <Input
                      placeholder="https://..."
                      value={form.image}
                      onChange={e => { setImgError(false); patch({ image: e.target.value }); }}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-4 min-w-0">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Nome <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="Ex: Pizza Margherita"
                        value={form.name}
                        onChange={e => patch({ name: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Descrição</Label>
                      <Textarea
                        placeholder="Molho de tomate, mussarela de búfala, manjericão fresco..."
                        value={form.description ?? ''}
                        onChange={e => patch({ description: e.target.value.slice(0, 280) })}
                        rows={3}
                        className="resize-none"
                      />
                      <p className="text-[11px] text-muted-foreground text-right tabular-nums">
                        {(form.description ?? '').length}/280
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Categoria <span className="text-destructive">*</span>
                      </Label>
                      <Select value={form.category} onValueChange={v => patch({ category: v })}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                          Preço base <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                          <Input
                            type="number" step="0.01" placeholder="0,00"
                            value={form.price || ''}
                            onChange={e => patch({ price: parseFloat(e.target.value) || 0 })}
                            className="h-10 pl-9 tabular-nums"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Custo <span className="text-[10px] font-normal">(opcional)</span>
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                          <Input
                            type="number" step="0.01" placeholder="0,00"
                            value={form.costPrice ?? ''}
                            onChange={e => {
                              const v = e.target.value;
                              patch({ costPrice: v === '' ? undefined : parseFloat(v) || 0 });
                            }}
                            className="h-10 pl-9 tabular-nums"
                          />
                        </div>
                      </div>
                    </div>
                    {typeof form.costPrice === 'number' && form.costPrice > 0 && form.price > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] rounded-md bg-muted/50 border border-border/60 px-2.5 py-1.5">
                        <Percent className="h-3.5 w-3.5 text-primary" />
                        <span className="text-muted-foreground">Margem estimada</span>
                        <span className={cn(
                          'font-bold tabular-nums ml-auto',
                          form.price > form.costPrice ? 'text-success' : 'text-destructive'
                        )}>
                          {(((form.price - form.costPrice) / form.price) * 100).toFixed(1)}%
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          · lucro {brl(form.price - form.costPrice)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* -------- Promoção -------- */}
              <SectionCard
                icon={Tag}
                title="Promoção"
                accent="success"
                summary={
                  typeof form.promoPrice === 'number' && form.promoPrice > 0
                    ? `${brl(form.promoPrice)} · ${describeSchedule(form.promoSchedule)}`
                    : 'Sem promoção ativa'
                }
                headerRight={
                  typeof form.promoPrice === 'number' && form.promoPrice > 0 ? (
                    <Badge className="h-5 text-[10px] bg-success text-success-foreground">
                      {brl(form.promoPrice)}
                    </Badge>
                  ) : null
                }
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Preço promocional</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                        <Input
                          type="number" step="0.01" placeholder="0,00"
                          value={form.promoPrice ?? ''}
                          onChange={e => {
                            const v = e.target.value;
                            patch({ promoPrice: v === '' ? undefined : parseFloat(v) || 0 });
                          }}
                          className="h-10 pl-9 tabular-nums"
                        />
                      </div>
                    </div>
                    {typeof form.promoPrice === 'number' &&
                      form.promoPrice > 0 &&
                      form.price > form.promoPrice && (
                        <div className="text-[11px] rounded-md bg-success/10 border border-success/30 text-success px-2.5 py-1.5 font-medium">
                          −{Math.round(((form.price - form.promoPrice) / form.price) * 100)}% off
                        </div>
                      )}
                  </div>

                  {typeof form.promoPrice === 'number' && form.promoPrice > 0 && (
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <p className="text-xs font-medium">Quando esta promoção vale</p>
                      </div>
                      <AvailabilityEditor
                        value={form.promoSchedule ?? DEFAULT_SCHEDULE}
                        onChange={v => patch({ promoSchedule: v })}
                        hint="Fora da janela, o preço volta ao base."
                      />
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* -------- Regras -------- */}
              <SectionCard
                icon={Sparkles}
                title="Regras"
                accent="info"
                summary={(() => {
                  const parts: string[] = [];
                  if (form.featured) parts.push('Destaque');
                  if (form.ageRestricted) parts.push('+18');
                  const f = form.fulfillment ?? 'both';
                  parts.push(f === 'both' ? 'Retirada + Delivery' : f === 'delivery' ? 'Só delivery' : 'Só retirada');
                  return parts.join(' · ');
                })()}
              >
                <div className="space-y-3">
                  {/* Destaque */}
                  <label className="flex items-center gap-3 rounded-lg border border-border/60 p-3 cursor-pointer hover:bg-muted/40 transition-colors">
                    <div className={cn(
                      'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                      form.featured ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground',
                    )}>
                      <Star className={cn('h-4 w-4', form.featured && 'fill-warning')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Destaque</p>
                      <p className="text-[11px] text-muted-foreground">
                        Aparece numa faixa "Destaques" no topo do cardápio.
                      </p>
                    </div>
                    <Switch
                      checked={!!form.featured}
                      onCheckedChange={v => patch({ featured: v })}
                    />
                  </label>

                  {/* +18 */}
                  <label className="flex items-center gap-3 rounded-lg border border-border/60 p-3 cursor-pointer hover:bg-muted/40 transition-colors">
                    <div className={cn(
                      'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                      form.ageRestricted ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
                    )}>
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">+18 · maiores de idade</p>
                      <p className="text-[11px] text-muted-foreground">
                        Selo discreto no produto e aviso no carrinho.
                      </p>
                    </div>
                    <Switch
                      checked={!!form.ageRestricted}
                      onCheckedChange={v => patch({ ageRestricted: v })}
                    />
                  </label>

                  {/* Fulfillment */}
                  <div className="rounded-lg border border-border/60 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5 text-primary" />
                      <p className="text-sm font-medium">Disponibilidade de entrega</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Escolha onde o produto pode ser vendido.
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        { v: 'both', label: 'Ambos', icon: CheckCircle2 },
                        { v: 'delivery', label: 'Delivery', icon: Truck },
                        { v: 'pickup', label: 'Retirada', icon: Store },
                      ] as const).map(o => {
                        const active = (form.fulfillment ?? 'both') === o.v;
                        const Icon = o.icon;
                        return (
                          <button
                            key={o.v}
                            type="button"
                            onClick={() => patch({ fulfillment: o.v })}
                            className={cn(
                              'h-10 rounded-md border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors',
                              active
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-muted-foreground border-border hover:bg-muted',
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* -------- Disponibilidade -------- */}
              <SectionCard
                icon={Clock}
                title="Disponibilidade"
                accent="warning"
                summary={describeSchedule(form.availability)}
              >
                <AvailabilityEditor
                  value={form.availability ?? DEFAULT_SCHEDULE}
                  onChange={v =>
                    patch({ availability: v.alwaysWhenOpen ? undefined : v })
                  }
                  hint="Fora da janela, o produto some do cardápio."
                />
              </SectionCard>

              {/* -------- Complementos -------- */}
              <SectionCard
                icon={Layers}
                title="Complementos"
                accent="primary"
                summary={
                  groups.length === 0
                    ? 'Nenhum grupo'
                    : `${groups.length} grupo${groups.length > 1 ? 's' : ''} · ${groups.reduce((n, g) => n + g.complements.length, 0)} ${groups.reduce((n, g) => n + g.complements.length, 0) === 1 ? 'item' : 'itens'}`
                }
                headerRight={
                  <Badge variant="secondary" className="h-5 text-[10px]">{groups.length}</Badge>
                }
              >
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={addGroup}>
                      <Plus className="h-3.5 w-3.5" /> Novo grupo
                    </Button>
                  </div>
                  {groups.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-border py-8 flex flex-col items-center gap-2 text-center">
                      <Layers className="h-7 w-7 text-muted-foreground/60" />
                      <p className="text-sm font-medium">Sem grupos ainda</p>
                      <p className="text-xs text-muted-foreground max-w-[300px]">
                        Crie grupos como "Tamanho", "Adicionais" ou "Ponto da carne" para o cliente personalizar.
                      </p>
                    </div>
                  )}

                  {groups.map((g, gi) => (
                    <GroupCard
                      key={g.id}
                      group={g}
                      index={gi}
                      total={groups.length}
                      onChange={p => updateGroup(g.id, p)}
                      onRemove={() => removeGroup(g.id)}
                      onDuplicate={() => duplicateGroup(g.id)}
                      onMove={dir => moveGroup(g.id, dir)}
                      onAddItem={() => addItem(g.id)}
                      onUpdateItem={(cid, p) => updateItem(g.id, cid, p)}
                      onRemoveItem={cid => removeItem(g.id, cid)}
                      onDuplicateItem={cid => duplicateItem(g.id, cid)}
                    />
                  ))}
                </div>
              </SectionCard>

              {/* -------- Ingredientes -------- */}
              <SectionCard
                icon={Utensils}
                title="Ingredientes"
                accent="primary"
                summary={
                  ingredients.length === 0
                    ? 'Nenhum ingrediente'
                    : `${ingredients.length} ingrediente${ingredients.length > 1 ? 's' : ''} · ${ingredients.filter(i => i.removable).length} removível${ingredients.filter(i => i.removable).length === 1 ? '' : 'is'}`
                }
                headerRight={
                  <Badge variant="secondary" className="h-5 text-[10px]">{ingredients.length}</Badge>
                }
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      Marque como <strong>removível</strong> os que o cliente pode retirar (ex.: "sem cebola").
                    </p>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 shrink-0" onClick={addIngredient}>
                      <Plus className="h-3.5 w-3.5" /> Adicionar
                    </Button>
                  </div>
                  {ingredients.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                      Nenhum ingrediente listado.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {ingredients.map(i => (
                        <div key={i.id} className="flex items-center gap-2">
                          <Input
                            placeholder="Ex: Cebola"
                            value={i.name}
                            onChange={e => updateIngredient(i.id, { name: e.target.value })}
                            className="h-9 text-sm flex-1 min-w-0"
                          />
                          <button
                            type="button"
                            onClick={() => updateIngredient(i.id, { removable: !i.removable })}
                            className={cn(
                              'shrink-0 h-9 px-3 rounded-md text-xs font-medium border transition-colors',
                              i.removable
                                ? 'bg-primary/10 border-primary/30 text-primary'
                                : 'bg-muted border-border text-muted-foreground',
                            )}
                          >
                            {i.removable ? 'Removível' : 'Fixo'}
                          </button>
                          <Button
                            size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0"
                            onClick={() => removeIngredient(i.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SectionCard>
            </TabsContent>

            {/* ============ PRÉVIA ============ */}
            <TabsContent value="preview" className="mt-0 px-5 py-5">
              <ProductPreview product={form} basePrice={basePreview} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-background px-5 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">A partir de</p>
            <p className="text-lg font-bold tabular-nums truncate">{brl(basePreview)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" onClick={onClose} className="hidden sm:inline-flex">Cancelar</Button>
            <Button
              disabled={!canSave}
              onClick={() => { onSave(form); onClose(); }}
            >
              {product ? 'Salvar alterações' : 'Criar produto'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Configurações avançadas do grupo
// ============================================================
function AdvancedGroupSettings({
  group,
  onChange,
}: {
  group: ComplementGroup;
  onChange: (p: Partial<ComplementGroup>) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectionType = getSelectionType(group);
  const pricingMode = getPricingMode(group);

  const setSelection = (t: SelectionType) => {
    if (t === 'single') {
      onChange({ selectionType: 'single', min: group.required ? 1 : 0, max: 1 });
    } else if (t === 'multiple') {
      onChange({
        selectionType: 'multiple',
        max: Math.max(2, group.max || 2),
        min: Math.min(group.min, Math.max(2, group.max || 2)),
      });
    } else {
      onChange({
        selectionType: 'repeat',
        max: Math.max(2, group.max || 5),
        min: group.min,
      });
    }
  };

  const selOptions: { t: SelectionType; icon: React.ReactNode }[] = [
    { t: 'single', icon: <Circle className="h-4 w-4" /> },
    { t: 'multiple', icon: <CheckSquare className="h-4 w-4" /> },
    { t: 'repeat', icon: <Hash className="h-4 w-4" /> },
  ];
  const priceOptions: { m: PricingMode; icon: React.ReactNode }[] = [
    { m: 'sum', icon: <Sigma className="h-4 w-4" /> },
    { m: 'avg', icon: <Divide className="h-4 w-4" /> },
    { m: 'max', icon: <TrendingUp className="h-4 w-4" /> },
    { m: 'min', icon: <TrendingDown className="h-4 w-4" /> },
  ];

  return (
    <div className="rounded-lg border border-border/60 bg-background/60">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium hover:bg-muted/40 transition-colors"
      >
        <span className="flex items-center gap-2">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Configurações avançadas
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>{SELECTION_TYPE_LABEL[selectionType]}</span>
          <span>·</span>
          <span>{PRICING_MODE_LABEL[pricingMode]}</span>
          {group.availability && !group.availability.alwaysWhenOpen && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-0.5"><CalendarClock className="h-3 w-3" /> agenda</span>
            </>
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-border/60 p-3 space-y-4">
          {/* 1. Modo de seleção */}
          <section className="space-y-2">
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">1. Modo de seleção</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">{SELECTION_TYPE_HINT[selectionType]}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {selOptions.map(({ t, icon }) => {
                const active = selectionType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelection(t)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 rounded-lg border p-2.5 text-[11px] font-medium transition-all',
                      active
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    {icon}
                    <span>{SELECTION_TYPE_LABEL[t]}</span>
                  </button>
                );
              })}
            </div>

            {/* Steppers min/max, só p/ multiple/repeat */}
            {selectionType !== 'single' && (
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground shrink-0">Mín</Label>
                  <Stepper value={group.min} min={0} max={group.max} onChange={v => onChange({ min: v })} />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground shrink-0">Máx</Label>
                  <Stepper value={group.max} min={Math.max(1, group.min)} onChange={v => onChange({ max: v })} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {group.min === group.max
                    ? `Exatamente ${group.min}`
                    : `De ${group.min} a ${group.max}`}
                </p>
              </div>
            )}
          </section>

          {/* 2. Precificação */}
          <section className="space-y-2 pt-1 border-t border-border/60">
            <div className="pt-3">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">2. Precificação</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">{PRICING_MODE_EXAMPLE[pricingMode]}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {priceOptions.map(({ m, icon }) => {
                const active = pricingMode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onChange({ pricingMode: m })}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 rounded-lg border p-2.5 text-[11px] font-medium transition-all',
                      active
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    {icon}
                    <span>{PRICING_MODE_LABEL[m]}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. Disponibilidade */}
          <section className="space-y-2 pt-1 border-t border-border/60">
            <div className="pt-3">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">3. Disponibilidade do grupo</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {group.availability
                  ? describeSchedule(group.availability)
                  : 'Sempre que a loja estiver aberta'}
              </p>
            </div>
            <AvailabilityEditor
              value={group.availability}
              onChange={v => onChange({ availability: v })}
              hint="Quando este grupo aparece para o cliente"
            />
          </section>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Card de Grupo
// ============================================================
function GroupCard({
  group, index, total, onChange, onRemove, onDuplicate, onMove,
  onAddItem, onUpdateItem, onRemoveItem, onDuplicateItem,
}: {
  group: ComplementGroup;
  index: number;
  total: number;
  onChange: (p: Partial<ComplementGroup>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (dir: -1 | 1) => void;
  onAddItem: () => void;
  onUpdateItem: (cid: string, p: Partial<Complement>) => void;
  onRemoveItem: (cid: string) => void;
  onDuplicateItem: (cid: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-background">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40 border-b border-border">
        <button type="button" onClick={() => setExpanded(v => !v)} className="shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <Input
          placeholder="Nome do grupo (ex: Tamanho, Adicionais)"
          value={group.name}
          onChange={e => onChange({ name: e.target.value })}
          className="h-8 text-sm flex-1 min-w-0 bg-background"
        />
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {group.required && <Badge variant="secondary" className="h-5 text-[10px]">obrig.</Badge>}
          <Badge variant="outline" className="h-5 text-[10px] tabular-nums">
            {group.min}–{group.max}
          </Badge>
          {(getPricingMode(group) !== 'sum') && (
            <Badge variant="outline" className="h-5 text-[10px] gap-1">
              {getPricingMode(group) === 'max' && <TrendingUp className="h-2.5 w-2.5" />}
              {getPricingMode(group) === 'min' && <TrendingDown className="h-2.5 w-2.5" />}
              {getPricingMode(group) === 'avg' && <Divide className="h-2.5 w-2.5" />}
              {PRICING_MODE_LABEL[getPricingMode(group)]}
            </Badge>
          )}
        </div>
        <div className="flex items-center shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={index === total - 1} onClick={() => onMove(1)}>
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDuplicate}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <Tabs defaultValue="items" className="w-full">
          <div className="px-3 pt-3">
            <TabsList className="h-9 bg-muted">
              <TabsTrigger value="items" className="text-xs gap-1.5">
                <Utensils className="h-3 w-3" /> Itens
                <Badge variant="secondary" className="h-4 text-[9px] px-1 ml-0.5">{group.complements.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="config" className="text-xs gap-1.5">
                <Sparkles className="h-3 w-3" /> Configurações
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="items" className="mt-0 p-3 space-y-2">
            <div className="space-y-1.5">
              {group.complements.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
                  Nenhum item. Clique em "Adicionar item".
                </div>
              ) : group.complements.map(item => (
                <div key={item.id} className="flex items-center gap-1.5 group/item">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                  <Input
                    placeholder="Nome do item"
                    value={item.name}
                    onChange={e => onUpdateItem(item.id, { name: e.target.value })}
                    className="h-9 text-sm flex-1 min-w-0"
                  />
                  <div className="relative w-24 shrink-0">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                    <Input
                      type="number" step="0.01" placeholder="0,00"
                      value={item.price || ''}
                      onChange={e => onUpdateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                      className="h-9 text-xs pl-8 tabular-nums"
                    />
                  </div>
                  <Switch
                    checked={item.available !== false}
                    onCheckedChange={v => onUpdateItem(item.id, { available: v })}
                    className="shrink-0"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => onDuplicateItem(item.id)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => onRemoveItem(item.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              size="sm" variant="ghost"
              className="text-xs h-8 w-full justify-start text-primary hover:text-primary hover:bg-primary/10"
              onClick={onAddItem}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar item
            </Button>
          </TabsContent>

          <TabsContent value="config" className="mt-0 p-3 space-y-3">
            {/* Regras básicas */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 rounded-lg bg-muted/30 p-3 border border-border/50">
              <div className="space-y-1.5 min-w-0">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Tipo</Label>
                <Select
                  value={group.kind ?? 'extras'}
                  onValueChange={v => onChange({ kind: v as ComplementGroup['kind'] })}
                >
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(GROUP_KIND_LABEL).map(([k, l]) => (
                      <SelectItem key={k} value={k}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 sm:pt-6">
                <Label className="text-xs shrink-0">Obrigatório</Label>
                <Switch checked={group.required} onCheckedChange={v => onChange({ required: v })} />
              </div>
            </div>

            {/* Configurações avançadas (seleção / precificação / disponibilidade) */}
            <AdvancedGroupSettings group={group} onChange={onChange} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Stepper({ value, min = 0, max, onChange }: {
  value: number; min?: number; max?: number; onChange: (v: number) => void;
}) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(max != null ? Math.min(max, value + 1) : value + 1);
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-background">
      <button type="button" onClick={dec} className="h-8 w-8 flex items-center justify-center hover:bg-muted disabled:opacity-40" disabled={value <= min}>
        <span className="text-sm">−</span>
      </button>
      <span className="w-8 text-center text-sm tabular-nums font-medium">{value}</span>
      <button type="button" onClick={inc} className="h-8 w-8 flex items-center justify-center hover:bg-muted disabled:opacity-40" disabled={max != null && value >= max}>
        <span className="text-sm">+</span>
      </button>
    </div>
  );
}

// ============================================================
// PRÉVIA — reaproveita a linguagem do ComplementsModal
// ============================================================
function ProductPreview({ product, basePrice }: { product: MenuProduct; basePrice: number }) {
  const groups = product.complementGroups ?? [];
  const ingredients = product.ingredients ?? [];
  const removable = ingredients.filter(i => i.removable);
  const fixed = ingredients.filter(i => !i.removable);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden max-w-xl mx-auto">
      {product.image && product.image.startsWith('http') ? (
        <div className="aspect-[16/10] w-full bg-muted overflow-hidden">
          <img src={product.image} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="aspect-[16/10] w-full bg-muted flex items-center justify-center text-muted-foreground">
          <ImageIcon className="h-10 w-10" />
        </div>
      )}
      <div className="p-4 space-y-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {product.category}
          </p>
          <h2 className="text-lg font-bold leading-tight">{product.name || 'Nome do produto'}</h2>
          {product.description && (
            <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
          )}
          <p className="text-sm font-semibold mt-2">
            A partir de <span className="text-primary tabular-nums">{brl(basePrice)}</span>
          </p>
        </div>

        {groups.map(g => (
          <div key={g.id} className="rounded-xl border border-border/60">
            <div className="px-3 py-2 bg-muted/40 border-b border-border/60 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{g.name || 'Grupo sem nome'}</p>
                <p className="text-[11px] text-muted-foreground">
                  {g.required ? 'Obrigatório · ' : 'Opcional · '}
                  Escolha {g.min === g.max ? g.min : `de ${g.min} a ${g.max}`}
                  {g.pricingMode === 'max' && ' · meio a meio'}
                </p>
              </div>
              {g.required && <Badge className="h-5 text-[10px] bg-primary text-primary-foreground">Obrig.</Badge>}
            </div>
            <ul className="divide-y divide-border/60">
              {g.complements.length === 0 ? (
                <li className="px-3 py-3 text-xs text-muted-foreground italic">Sem itens</li>
              ) : g.complements.map(c => (
                <li key={c.id} className="px-3 py-2.5 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm', c.available === false && 'line-through text-muted-foreground')}>
                      {c.name || 'Item sem nome'}
                    </p>
                    {c.available === false && (
                      <p className="text-[10px] text-destructive">Em falta</p>
                    )}
                  </div>
                  <p className="text-sm font-medium tabular-nums shrink-0">
                    {c.price > 0 ? `+ ${brl(c.price)}` : <span className="text-success">Grátis</span>}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {ingredients.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">Ingredientes</p>
            <div className="flex flex-wrap gap-1.5">
              {fixed.map(i => (
                <span key={i.id} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3" /> {i.name || '—'}
                </span>
              ))}
              {removable.map(i => (
                <span key={i.id} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {i.name || '—'} · removível
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CategoryManager (mantido)
// ============================================================
function CategoryManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  interface CatEntry { name: string; availability?: AvailabilitySchedule; }
  const [cats, setCats] = useState<CatEntry[]>(() => CATEGORIES.map(n => ({ name: n })));
  const [newCat, setNewCat] = useState('');
  const [openSched, setOpenSched] = useState<number | null>(null);

  const patchCat = (i: number, p: Partial<CatEntry>) =>
    setCats(prev => prev.map((c, idx) => (idx === i ? { ...c, ...p } : c)));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Gerenciar categorias</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Nova categoria..." value={newCat} onChange={e => setNewCat(e.target.value)} className="h-9 text-sm" />
            <Button size="sm" className="h-9" disabled={!newCat.trim()} onClick={() => {
              setCats(prev => [...prev, { name: newCat.trim() }]);
              setNewCat('');
              toast.success('Categoria adicionada');
            }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-1.5">
            {cats.map((c, i) => {
              const isOpen = openSched === i;
              return (
                <div key={i} className="rounded-lg border border-border/70 overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-2">
                    <span className="text-sm flex-1 truncate">{c.name}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'h-5 text-[10px] gap-1',
                        c.availability ? 'border-warning/50 text-warning' : 'text-muted-foreground',
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      {c.availability ? 'Com horário' : 'Sempre'}
                    </Badge>
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => setOpenSched(isOpen ? null : i)}
                      title="Disponibilidade"
                    >
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => {
                      setCats(prev => prev.filter((_, idx) => idx !== i));
                      if (openSched === i) setOpenSched(null);
                      toast.success('Categoria removida');
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {isOpen && (
                    <div className="px-3 pb-3 pt-1 border-t border-border/60 bg-muted/20">
                      <AvailabilityEditor
                        value={c.availability ?? DEFAULT_SCHEDULE}
                        onChange={v =>
                          patchCat(i, { availability: v.alwaysWhenOpen ? undefined : v })
                        }
                        hint="Ex.: Marmitas só Seg–Sex, 08–13h."
                      />
                      <p className="text-[11px] text-muted-foreground mt-2">
                        {describeSchedule(c.availability)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => { toast.success('Categorias salvas'); onClose(); }}>
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


// ============================================================
// COMBOS (mantido, layout já limpo)
// ============================================================
function ComboFormDialog({ open, onClose, combo, products, onSave }: {
  open: boolean; onClose: () => void; combo: Combo | null;
  products: MenuProduct[]; onSave: (data: Omit<Combo, 'id'>) => void;
}) {
  const [name, setName] = useState(combo?.name ?? '');
  const [price, setPrice] = useState(combo?.price.toString() ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set(combo?.productIds ?? []));
  const [active, setActive] = useState(combo?.active ?? true);

  const sumOriginal = products.filter(p => selected.has(p.id)).reduce((a, p) => a + p.price, 0);
  const discount = sumOriginal > 0 && parseFloat(price) > 0 ? Math.max(0, sumOriginal - parseFloat(price)) : 0;
  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const canSave = name.trim() && selected.size >= 2 && parseFloat(price) > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {combo ? 'Editar combo' : 'Novo combo'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome do combo *</Label>
            <Input placeholder="Ex: Combo Família" value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Produtos (mín. 2) *</Label>
            <div className="rounded-lg border divide-y max-h-56 overflow-y-auto">
              {products.map(p => (
                <label key={p.id} className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/40">
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                  <span className="text-sm flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{brl(p.price)}</span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Soma original: <span className="font-semibold tabular-nums">{brl(sumOriginal)}</span>
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Preço do combo *</Label>
            <Input type="number" step="0.01" placeholder="0,00" value={price} onChange={e => setPrice(e.target.value)} className="h-9 text-sm" />
            {discount > 0 && (
              <p className="text-[11px] text-success">
                Economia: <span className="font-bold tabular-nums">{brl(discount)}</span>
                {' '}({Math.round((discount / sumOriginal) * 100)}%)
              </p>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Combo ativo</p>
              <p className="text-xs text-muted-foreground">Aparece no cardápio</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
          <Button className="w-full" disabled={!canSave} onClick={() => {
            onSave({ name: name.trim(), productIds: Array.from(selected), price: parseFloat(price), active });
            onClose();
          }}>
            {combo ? 'Salvar alterações' : 'Criar combo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// LISTAGEM (raiz)
// ============================================================
export function StockTab() {
  const [products, setProducts] = useState<MenuProduct[]>(() =>
    mockProducts.map(p => ({ ...p, available: true, complementGroups: [], ingredients: [] })),
  );
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');

  const [productModal, setProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<MenuProduct | null>(null);
  const [catModal, setCatModal] = useState(false);

  const [combos, setCombos] = useState<Combo[]>([]);
  const [comboModal, setComboModal] = useState(false);
  const [editCombo, setEditCombo] = useState<Combo | null>(null);

  const filtered = products.filter(p => {
    if (catFilter !== 'all' && p.category !== catFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSave = (p: MenuProduct) => {
    setProducts(prev => {
      const i = prev.findIndex(x => x.id === p.id);
      if (i === -1) return [...prev, p];
      const copy = [...prev];
      copy[i] = p;
      return copy;
    });
    toast.success(editProduct ? 'Produto atualizado' : 'Produto criado');
    setEditProduct(null);
  };

  const handleDelete = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    toast.success('Produto removido');
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="h-10 w-[160px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-10 gap-1.5" onClick={() => setCatModal(true)}>
            Categorias
          </Button>
          <Button className="h-10 gap-2" onClick={() => { setEditProduct(null); setProductModal(true); }}>
            <Plus className="h-4 w-4" /> Novo
          </Button>
        </div>
      </div>

      {/* Grid de produtos */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border py-14 flex flex-col items-center gap-2 text-center">
          <Layers className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">Nenhum produto</p>
          <p className="text-xs text-muted-foreground">Clique em "Novo" para criar o primeiro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => {
            const hasImg = p.image?.startsWith('http');
            const grpCount = p.complementGroups?.length ?? 0;
            const ingCount = p.ingredients?.length ?? 0;
            return (
              <article
                key={p.id}
                className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div className="flex gap-3 p-3">
                  <div className="h-20 w-20 shrink-0 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                    {hasImg ? (
                      <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-3xl">{p.image || '🍽️'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold leading-tight line-clamp-2">{p.name}</h4>
                      {p.available === false && (
                        <Badge variant="secondary" className="h-5 text-[10px] shrink-0">Off</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{p.category}</p>
                    <div className="flex items-center gap-2 mt-auto pt-2">
                      <p className="text-sm font-bold tabular-nums">{brl(p.price)}</p>
                      {grpCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Layers className="h-3 w-3" /> {grpCount}
                        </span>
                      )}
                      {ingCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Utensils className="h-3 w-3" /> {ingCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/60 px-2 py-1.5 flex items-center justify-end gap-1 bg-muted/20">
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => { setEditProduct(p); setProductModal(true); }}>
                    <Edit2 className="h-3 w-3" /> Editar
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Combos */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">Combos</h3>
            <Badge variant="secondary" className="text-[10px]">{combos.length}</Badge>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setEditCombo(null); setComboModal(true); }}>
            <Plus className="h-3.5 w-3.5" /> Combo
          </Button>
        </div>
        {combos.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Nenhum combo criado. Agrupe produtos com preço promocional.
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border divide-y">
            {combos.map(c => {
              const sum = products.filter(p => c.productIds.includes(p.id)).reduce((a, p) => a + p.price, 0);
              const saving = Math.max(0, sum - c.price);
              return (
                <div key={c.id} className="flex items-center gap-3 p-3">
                  <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.productIds.length} produtos
                      {saving > 0 && <> · <span className="text-success">−{brl(saving)}</span></>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">{brl(c.price)}</p>
                    {!c.active && <p className="text-[10px] text-muted-foreground">Inativo</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditCombo(c); setComboModal(true); }}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => {
                      setCombos(prev => prev.filter(x => x.id !== c.id));
                      toast.success('Combo removido');
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {productModal && (
        <ProductEditor
          open={productModal}
          onClose={() => { setProductModal(false); setEditProduct(null); }}
          product={editProduct}
          onSave={handleSave}
        />
      )}
      {comboModal && (
        <ComboFormDialog
          open={comboModal}
          onClose={() => { setComboModal(false); setEditCombo(null); }}
          combo={editCombo}
          products={products}
          onSave={(data) => {
            if (editCombo) {
              setCombos(prev => prev.map(x => x.id === editCombo.id ? { ...editCombo, ...data } : x));
              toast.success('Combo atualizado');
            } else {
              setCombos(prev => [...prev, { id: uid('CMB'), ...data }]);
              toast.success('Combo criado');
            }
            setEditCombo(null);
          }}
        />
      )}
      <CategoryManager open={catModal} onClose={() => setCatModal(false)} />
    </div>
  );
}
