import { useState } from 'react';
import { User, Tag, DollarSign, Eye, EyeOff, Phone, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ServiceProvider, CustomServiceCategory } from '@/types';
import { serviceCategories } from '@/data/serviceProviders';
import { cn } from '@/lib/utils';
import { BrandIcon } from '@/components/common/BrandIcon';
import { formatPriceUnit } from '@/lib/priceUnit';
import { SectionCard } from '../SectionCard';

interface Props {
  provider: ServiceProvider;
  onChange: (p: ServiceProvider) => void;
}

export function ProfileTab({ provider, onChange }: Props) {
  const set = <K extends keyof ServiceProvider>(key: K, value: ServiceProvider[K]) =>
    onChange({ ...provider, [key]: value });

  const customCategories: CustomServiceCategory[] = provider.customCategories ?? [];
  const allCategories = [
    ...serviceCategories.map(c => ({ id: c.id, name: c.name, custom: false })),
    ...customCategories.map(c => ({ id: c.id, name: c.name, custom: true })),
  ];

  const toggleCategory = (id: string) => {
    const next = provider.categories.includes(id)
      ? provider.categories.filter(c => c !== id)
      : [...provider.categories, id];
    set('categories', next);
  };

  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const addCustomCategory = () => {
    const name = newCatName.trim();
    if (!name || name.length > 40) return;
    const exists = allCategories.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (exists) { setNewCatName(''); setAddingCat(false); return; }
    const id = `cc-${Date.now().toString(36)}`;
    onChange({
      ...provider,
      customCategories: [...customCategories, { id, name }],
      categories: [...provider.categories, id],
    });
    setNewCatName('');
    setAddingCat(false);
  };
  const removeCustomCategory = (id: string) => {
    onChange({
      ...provider,
      customCategories: customCategories.filter(c => c.id !== id),
      categories: provider.categories.filter(c => c !== id),
    });
  };

  const PRICE_UNIT_PRESETS = [
    { value: 'service', label: 'por serviço' },
    { value: 'hour',    label: 'por hora' },
    { value: 'visit',   label: 'por visita' },
    { value: 'day',     label: 'por dia' },
  ] as const;
  const currentUnit = provider.priceRange.unit ?? 'service';
  const isCustomUnit = !PRICE_UNIT_PRESETS.some(p => p.value === currentUnit.toLowerCase());
  const [customUnit, setCustomUnit] = useState(isCustomUnit ? currentUnit : '');
  const [unitMode, setUnitMode] = useState<'preset' | 'custom'>(isCustomUnit ? 'custom' : 'preset');

  const priceUnitLabel = formatPriceUnit(currentUnit);
  const priceSummary = `R$ ${provider.priceRange.min}${provider.priceRange.max ? `–${provider.priceRange.max}` : ''} por ${priceUnitLabel}`;
  const catNames = provider.categories.map(id => allCategories.find(c => c.id === id)?.name).filter(Boolean);
  const catSummary = catNames.length ? `${catNames.length} selecionada${catNames.length > 1 ? 's' : ''} · ${catNames.slice(0, 2).join(', ')}${catNames.length > 2 ? '…' : ''}` : 'Nenhuma categoria';

  return (
    <div className="space-y-5">
      {/* Visibilidade — sempre no topo */}
      <div className={cn(
        'flex items-center justify-between gap-3 rounded-xl border p-4 shadow-sm transition-colors',
        provider.isActive ? 'bg-success/5 border-success/20' : 'bg-muted/40'
      )}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
            provider.isActive ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
          )}>
            {provider.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm">Perfil {provider.isActive ? 'ativo' : 'oculto'}</p>
            <p className="text-xs text-muted-foreground truncate">
              {provider.isActive ? 'Visível para clientes nas buscas.' : 'Não aparece em buscas nem no marketplace.'}
            </p>
          </div>
        </div>
        <Switch checked={provider.isActive} onCheckedChange={v => set('isActive', v)} />
      </div>

      {/* Dados básicos */}
      <SectionCard icon={User} title="Dados básicos" accent="info" subtitle="Nome, tipo, bio e contatos">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nome / Razão social</Label>
            <Input value={provider.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <div className="flex gap-2">
              {(['individual','company'] as const).map(t => (
                <button key={t} type="button" onClick={() => set('type', t)}
                  className={cn('flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                    provider.type === t
                      ? 'bg-info/10 text-info border-info/30 ring-1 ring-info/20'
                      : 'bg-background text-muted-foreground hover:text-foreground')}>
                  {t === 'individual' ? 'Autônomo' : 'Empresa'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Biografia</Label>
          <Textarea rows={4} value={provider.bio} onChange={e => set('bio', e.target.value)} placeholder="Conte um pouco sobre você e seu trabalho..." />
        </div>
        <div className="border-t pt-4 grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-info" /> Telefone</Label>
            <Input value={provider.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><BrandIcon name="whatsapp" size={14} /> WhatsApp (só dígitos)</Label>
            <Input value={provider.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">CNPJ (opcional)</Label>
            <Input value={provider.cnpj || ''} onChange={e => set('cnpj', e.target.value || undefined)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Endereço (opcional)</Label>
            <Input value={provider.address || ''} onChange={e => set('address', e.target.value || undefined)} />
          </div>
        </div>
      </SectionCard>

      {/* Categorias */}
      <SectionCard
        icon={Tag}
        title="Categorias de atuação"
        accent="primary"
        collapsible
        defaultOpen={false}
        summary={catSummary}
        action={<Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mr-2">{catNames.length}</Badge>}
      >
        <p className="text-xs text-muted-foreground">Selecione todas as áreas em que você atua. Clientes filtram por essas categorias.</p>
        <div className="flex flex-wrap gap-2">
          {allCategories.map(c => {
            const on = provider.categories.includes(c.id);
            return (
              <span key={c.id} className="inline-flex items-center">
                <button
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                    on
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30',
                    c.custom && !on && 'border-dashed'
                  )}
                >
                  {c.name}
                  {c.custom && (
                    <span className={cn(
                      'ml-1.5 text-[10px] uppercase tracking-wide',
                      on ? 'opacity-80' : 'text-primary/70'
                    )}>nova</span>
                  )}
                </button>
                {c.custom && (
                  <button
                    type="button"
                    onClick={() => removeCustomCategory(c.id)}
                    aria-label={`Remover categoria ${c.name}`}
                    className="-ml-1 h-6 w-6 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}

          {addingCat ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-2 py-1">
              <Input
                autoFocus
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); addCustomCategory(); }
                  if (e.key === 'Escape') { setNewCatName(''); setAddingCat(false); }
                }}
                maxLength={40}
                placeholder="Nome da categoria"
                className="h-7 w-40 text-sm border-0 bg-transparent focus-visible:ring-0 px-1"
              />
              <button
                type="button"
                onClick={addCustomCategory}
                disabled={!newCatName.trim()}
                className="text-xs font-semibold text-primary disabled:opacity-40 px-1"
              >
                Adicionar
              </button>
              <button
                type="button"
                onClick={() => { setNewCatName(''); setAddingCat(false); }}
                aria-label="Cancelar"
                className="h-6 w-6 rounded-full text-muted-foreground hover:bg-muted flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setAddingCat(true)}
              className="rounded-full border border-dashed border-primary/40 text-primary hover:bg-primary/5 px-3 py-1.5 text-sm font-medium inline-flex items-center gap-1 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova categoria
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Não achou sua área? Toque em <span className="font-medium text-foreground">Nova categoria</span> para cadastrar.
        </p>
      </SectionCard>

      {/* Faixa de preço */}
      <SectionCard
        icon={DollarSign}
        title="Faixa de preço"
        accent="success"
        collapsible
        defaultOpen={false}
        summary={priceSummary}
        action={<span className="text-success font-semibold text-sm mr-2 tabular-nums hidden sm:inline">{priceSummary}</span>}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Min (R$)</Label>
            <Input
              type="number"
              min={0}
              value={provider.priceRange.min}
              onChange={e => set('priceRange', { ...provider.priceRange, min: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max (R$)</Label>
            <Input
              type="number"
              min={0}
              value={provider.priceRange.max ?? ''}
              onChange={e => set('priceRange', { ...provider.priceRange, max: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label>Unidade</Label>
            <div className="flex gap-1 rounded-md border bg-background p-1">
              <button
                type="button"
                onClick={() => {
                  setUnitMode('preset');
                  set('priceRange', { ...provider.priceRange, unit: 'service' });
                }}
                className={cn(
                  'flex-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors',
                  unitMode === 'preset' ? 'bg-success/15 text-success' : 'text-muted-foreground'
                )}
              >
                Padrão
              </button>
              <button
                type="button"
                onClick={() => {
                  setUnitMode('custom');
                  if (customUnit.trim()) set('priceRange', { ...provider.priceRange, unit: customUnit.trim() });
                }}
                className={cn(
                  'flex-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors',
                  unitMode === 'custom' ? 'bg-success/15 text-success' : 'text-muted-foreground'
                )}
              >
                Personalizada
              </button>
            </div>
          </div>
        </div>

        {unitMode === 'preset' ? (
          <div className="flex flex-wrap gap-2">
            {PRICE_UNIT_PRESETS.map(p => {
              const on = currentUnit.toLowerCase() === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set('priceRange', { ...provider.priceRange, unit: p.value })}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                    on
                      ? 'bg-success text-success-foreground border-success shadow-sm'
                      : 'bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30'
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-xs">Unidade personalizada</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">por</span>
              <Input
                value={customUnit}
                maxLength={30}
                placeholder="metro, litro, m², peça, kg..."
                onChange={e => {
                  const v = e.target.value;
                  setCustomUnit(v);
                  const trimmed = v.trim();
                  if (trimmed) set('priceRange', { ...provider.priceRange, unit: trimmed });
                }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ex.: <span className="font-medium text-foreground">metro</span>, <span className="font-medium text-foreground">litro</span>, <span className="font-medium text-foreground">m²</span>, <span className="font-medium text-foreground">peça</span>.
            </p>
          </div>
        )}

        <div className="rounded-lg bg-success/5 border border-success/20 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            Exibido como: <span className="font-semibold text-success">{priceSummary}</span>
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
