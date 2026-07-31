import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import {
  Globe, CheckCircle2, Clock, AlertTriangle, Copy, ExternalLink,
  Power, Sparkles, Search, RefreshCw, Link2, CircleSlash,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { StatCard } from '@/components/common/StatCard';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { seedVendors } from '@/data/adminVendors';
import { getVendorMeta } from '@/lib/vendorIcon';
import {
  DOMAIN_SUFFIX,
  seedVendorDomains,
  slugifySubdomain,
  validateSubdomain,
  fullUrl,
} from '@/data/vendorDomains';
import { DomainStatus, VendorDomain, VendorStats } from '@/types';

// ------- badges de status -------
const statusMeta: Record<DomainStatus, { label: string; className: string; Icon: LucideIcon; hint: string }> = {
  active:  { label: 'Ativo',    className: 'bg-success/10 text-success border-success/20',           Icon: CheckCircle2,  hint: 'Publicado' },
  pending: { label: 'Pendente', className: 'bg-warning/10 text-warning border-warning/20',           Icon: Clock,         hint: 'Aguardando validação' },
  error:   { label: 'Erro',     className: 'bg-destructive/10 text-destructive border-destructive/20', Icon: AlertTriangle, hint: 'Requer revisão' },
};

interface Row {
  vendor: VendorStats;
  domain: VendorDomain | null;
  draft: string;
  error: string | null;
}

function VendorIdentity({ vendor }: { vendor: VendorStats }) {
  const meta = getVendorMeta(vendor.category);
  const Icon = meta.icon;

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className={cn('flex h-11 w-11 items-center justify-center rounded-lg shrink-0 ring-1 ring-border/70', meta.toneBg, meta.toneText)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="font-medium truncate">{vendor.name}</p>
        <p className="text-xs text-muted-foreground truncate">{meta.label}</p>
      </div>
    </div>
  );
}

function DomainBadge({ domain }: { domain: VendorDomain | null }) {
  if (!domain) {
    return (
      <Badge variant="secondary" className="gap-1.5 border text-xs font-medium">
        <CircleSlash className="h-3.5 w-3.5" />
        Sem domínio
      </Badge>
    );
  }

  const meta = statusMeta[domain.status];
  const Icon = meta.Icon;
  return (
    <Badge className={cn('gap-1.5 border text-xs font-medium', meta.className)}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </Badge>
  );
}

function IconAction({
  label,
  icon: Icon,
  disabled,
  onClick,
  children,
  variant = 'outline',
}: {
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  onClick?: () => void;
  children?: ReactNode;
  variant?: ComponentProps<typeof Button>['variant'];
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant={variant}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className="h-9 w-9 shrink-0"
        >
          {children ?? <Icon className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function DomainsTab() {
  const [domains, setDomains] = useState<VendorDomain[]>(seedVendorDomains);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    seedVendors.forEach(v => {
      const d = seedVendorDomains.find(x => x.vendorId === v.id);
      initial[v.id] = d?.subdomain ?? '';
    });
    return initial;
  });
  const [query, setQuery] = useState('');

  // subdomain -> vendorId (para checagem de duplicidade)
  const takenBy = useMemo(() => {
    const map: Record<string, string> = {};
    domains.forEach(d => { map[d.subdomain] = d.vendorId; });
    return map;
  }, [domains]);

  const rows: Row[] = useMemo(() => {
    return seedVendors
      .filter(v => v.name.toLowerCase().includes(query.toLowerCase()))
      .map(v => {
        const domain = domains.find(d => d.vendorId === v.id) ?? null;
        const draft = drafts[v.id] ?? '';
        const error =
          draft && draft !== domain?.subdomain
            ? validateSubdomain(draft, takenBy, v.id)
            : null;
        return { vendor: v, domain, draft, error };
      });
  }, [domains, drafts, takenBy, query]);

  const stats = useMemo(() => ({
    total:   domains.length,
    active:  domains.filter(d => d.status === 'active').length,
    pending: domains.filter(d => d.status === 'pending').length,
    error:   domains.filter(d => d.status === 'error').length,
  }), [domains]);

  const setDraft = (vendorId: string, value: string) => {
    // normaliza suavemente enquanto digita (lowercase, sem espaços)
    const cleaned = value.toLowerCase().replace(/\s+/g, '-');
    setDrafts(prev => ({ ...prev, [vendorId]: cleaned }));
  };

  const autoGenerate = (v: VendorStats) => {
    const slug = slugifySubdomain(v.name);
    setDrafts(prev => ({ ...prev, [v.id]: slug }));
  };

  const validate = (v: VendorStats) => {
    const slug = drafts[v.id] ?? '';
    const err = validateSubdomain(slug, takenBy, v.id);
    if (err) {
      toast.error(err);
      return;
    }
    const existing = domains.find(d => d.vendorId === v.id);
    const now = new Date().toISOString();
    if (existing) {
      // slug mudou? volta para pending. Igual? só valida.
      const changed = existing.subdomain !== slug;
      setDomains(prev => prev.map(d =>
        d.vendorId === v.id
          ? { ...d, subdomain: slug, status: changed ? 'pending' : d.status, updatedAt: now }
          : d,
      ));
      toast.success(changed ? 'Subdomínio atualizado (aguardando validação).' : 'Subdomínio revalidado.');
    } else {
      setDomains(prev => [...prev, { vendorId: v.id, subdomain: slug, status: 'pending', updatedAt: now }]);
      toast.success('Subdomínio registrado (aguardando validação).');
    }
  };

  const toggleActive = (v: VendorStats) => {
    const existing = domains.find(d => d.vendorId === v.id);
    if (!existing) {
      toast.error('Cadastre e valide o subdomínio primeiro.');
      return;
    }
    const now = new Date().toISOString();
    setDomains(prev => prev.map(d =>
      d.vendorId === v.id
        ? { ...d, status: d.status === 'active' ? 'pending' : 'active', updatedAt: now }
        : d,
    ));
    toast.success(existing.status === 'active' ? 'Subdomínio desativado.' : 'Subdomínio ativado.');
  };

  const copyLink = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(fullUrl(slug));
      toast.success('Link copiado.');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
    <div className="space-y-5">
      {/* StatCards no topo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total"       value={stats.total.toString()}   icon={Globe}          tone="primary" />
        <StatCard label="Ativos"      value={stats.active.toString()}  icon={CheckCircle2}   tone="success" />
        <StatCard label="Pendentes"   value={stats.pending.toString()} icon={Clock}          tone="warning" />
        <StatCard label="Com erro"    value={stats.error.toString()}   icon={AlertTriangle}  tone="destructive" />
      </div>

      {/* Busca */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar vendor..."
            className="pl-9 bg-background"
          />
        </div>
        <Badge variant="outline" className="w-fit gap-1.5 px-3 py-1.5 font-mono text-xs">
          <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
          &lt;slug&gt;.{DOMAIN_SUFFIX}
        </Badge>
      </div>

      {/* Lista de vendors com editor de subdomínio */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="hidden border-b bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground lg:grid lg:grid-cols-[minmax(220px,1fr)_128px_minmax(360px,1.4fr)_168px] lg:items-center lg:gap-4">
          <span>Parceiro</span>
          <span>Status</span>
          <span>Domínio</span>
          <span className="text-right">Ações</span>
        </div>
        {rows.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhum vendor encontrado.
          </div>
        )}
        {rows.map(({ vendor, domain, draft, error }) => {
          const meta = domain ? statusMeta[domain.status] : null;
          const currentSlug = domain?.subdomain ?? '';
          const dirty = draft !== currentSlug;
          const canOpen = !!domain && domain.status === 'active' && !dirty;
          return (
            <div key={vendor.id} className="border-b p-4 last:border-b-0 lg:grid lg:grid-cols-[minmax(220px,1fr)_128px_minmax(360px,1.4fr)_168px] lg:items-start lg:gap-4">
              {/* Vendor identity */}
              <div className="min-w-0">
                <VendorIdentity vendor={vendor} />
              </div>

              <div className="mt-3 lg:mt-1">
                <DomainBadge domain={domain} />
                {domain && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {statusMeta[domain.status].hint}
                  </p>
                )}
              </div>

              {/* Editor */}
              <div className="mt-3 min-w-0 space-y-1.5 lg:mt-0">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`sub-${vendor.id}`} className="text-xs text-muted-foreground">
                    Subdomínio
                  </Label>
                  <button
                    type="button"
                    onClick={() => autoGenerate(vendor)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    <Sparkles className="h-3 w-3" />
                    Gerar do nome
                  </button>
                </div>
                <div
                  className={cn(
                    'flex min-w-0 items-stretch overflow-hidden rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring',
                    error && 'border-destructive focus-within:ring-destructive/40',
                  )}
                >
                  <Input
                    id={`sub-${vendor.id}`}
                    value={draft}
                    onChange={(e) => setDraft(vendor.id, e.target.value)}
                    placeholder="padaria-da-vila"
                    className="h-10 min-w-0 border-0 font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
                    maxLength={30}
                  />
                  <span className="hidden items-center border-l bg-muted/60 px-3 text-xs text-muted-foreground sm:flex whitespace-nowrap">
                    .{DOMAIN_SUFFIX}
                  </span>
                </div>
                {error ? (
                  <p className="text-xs text-destructive">{error}</p>
                ) : draft ? (
                  <p className="text-xs text-muted-foreground truncate">
                    <span className="font-mono">{fullUrl(draft)}</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">3–30 caracteres, letras, números e hífen.</p>
                )}
              </div>

              {/* Ações */}
              <div className="mt-3 flex items-center justify-end gap-2 lg:mt-0 lg:pt-7">
                <IconAction
                  label={domain ? (dirty ? 'Salvar alteração' : 'Validar domínio') : 'Registrar domínio'}
                  icon={RefreshCw}
                  onClick={() => validate(vendor)}
                  disabled={!!error || !draft}
                  variant={dirty || !domain ? 'default' : 'secondary'}
                />
                <IconAction
                  label="Copiar link"
                  icon={Copy}
                  onClick={() => currentSlug && copyLink(currentSlug)}
                  disabled={!domain || dirty}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      asChild={canOpen}
                      type="button"
                      size="icon"
                      variant="outline"
                      disabled={!canOpen}
                      aria-label="Abrir domínio"
                      className="h-9 w-9 shrink-0"
                    >
                      {canOpen ? (
                        <a href={fullUrl(currentSlug)} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        <span>
                          <ExternalLink className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Abrir domínio</TooltipContent>
                </Tooltip>
                <IconAction
                  label={domain?.status === 'active' ? 'Desativar domínio' : 'Ativar domínio'}
                  icon={Power}
                  onClick={() => toggleActive(vendor)}
                  disabled={!domain}
                  variant={domain?.status === 'active' ? 'outline' : 'secondary'}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </TooltipProvider>
  );
}
