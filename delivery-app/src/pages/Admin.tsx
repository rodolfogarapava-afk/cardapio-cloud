import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Users,
  Settings,
  MoreHorizontal,
  Power,
  Eye,
  Wrench,
  BadgeCheck,
  Phone,
  Star,
  DollarSign,
  ClipboardCheck,
  Megaphone,
  ShieldAlert,
  Search,
  Plus,
  ShoppingBag,
  Calendar,
  Ban,
  CheckCircle2,
  Mail,
  MapPin,
  Activity,
  UserCheck,
  ArrowUpRight,
  Globe,
  Sparkles,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { VendorStats, SystemStats, ServiceProvider } from '@/types';
import { mockProviders as seedProviders, serviceCategories } from '@/data/serviceProviders';
import { FinanceTab } from '@/components/admin/FinanceTab';
import { OnboardingTab } from '@/components/admin/OnboardingTab';
import { MarketingTab } from '@/components/admin/MarketingTab';
import { QualityTab } from '@/components/admin/QualityTab';
import { DomainsTab } from '@/components/admin/DomainsTab';
import { useKycApplications } from '@/data/kyc';
import { PanelShell, type PanelTab } from '@/components/common/PanelShell';
import { StatCard, type StatTone } from '@/components/common/StatCard';
import { seedVendors } from '@/data/adminVendors';
import {
  DOMAIN_SUFFIX,
  seedVendorDomains,
  slugifySubdomain,
  validateSubdomain,
} from '@/data/vendorDomains';
import { getVendorMeta, vendorCategoryOptions, type VendorCategory } from '@/lib/vendorIcon';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

// Mock data
const mockSystemStats: SystemStats = {
  totalVendors: 24,
  activeVendors: 18,
  totalOrders: 3456,
  totalRevenue: 289450.0,
  totalClients: 1245,
  ordersToday: 156,
  revenueToday: 12890.0,
};




// Mock clients
interface AdminClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  orders: number;
  totalSpent: number;
  since: string;
  blocked: boolean;
}
const seedClients: AdminClient[] = [
  { id: 'c1', name: 'Marina Santos', email: 'marina@email.com', phone: '(11) 98765-4321', city: 'São Paulo, SP', orders: 34, totalSpent: 2890.5, since: '2025-03-12', blocked: false },
  { id: 'c2', name: 'Rafael Costa', email: 'rafael.costa@email.com', phone: '(21) 99876-1234', city: 'Rio de Janeiro, RJ', orders: 21, totalSpent: 1720.9, since: '2025-05-04', blocked: false },
  { id: 'c3', name: 'Juliana Freitas', email: 'ju.freitas@email.com', phone: '(31) 98123-4567', city: 'Belo Horizonte, MG', orders: 12, totalSpent: 890.4, since: '2025-08-18', blocked: false },
  { id: 'c4', name: 'Pedro Almeida', email: 'pedro.a@email.com', phone: '(41) 99444-7788', city: 'Curitiba, PR', orders: 3, totalSpent: 156.8, since: '2025-11-22', blocked: true },
  { id: 'c5', name: 'Ana Beatriz Lima', email: 'anabia@email.com', phone: '(85) 98555-2211', city: 'Fortaleza, CE', orders: 47, totalSpent: 3980.1, since: '2024-12-01', blocked: false },
  { id: 'c6', name: 'Lucas Martins', email: 'lucasm@email.com', phone: '(51) 98333-1122', city: 'Porto Alegre, RS', orders: 8, totalSpent: 522.3, since: '2025-10-05', blocked: false },
];

const tabs = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'finance', label: 'Financeiro', icon: DollarSign },
  { id: 'onboarding', label: 'Onboarding', icon: ClipboardCheck },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'quality', label: 'Qualidade', icon: ShieldAlert },
  { id: 'vendors', label: 'Vendors', icon: Store },
  { id: 'domains', label: 'Domínios', icon: Globe },
  { id: 'services', label: 'Serviços', icon: Wrench },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

type Tone = StatTone;

const statusBadge = {
  active: 'bg-success/10 text-success border-success/20',
  inactive: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-warning/10 text-warning border-warning/20',
} as const;

const statusLabel = { active: 'Ativo', inactive: 'Inativo', pending: 'Pendente' } as const;

function VendorAvatar({ category, size = 'md' }: { category?: VendorCategory; size?: 'sm' | 'md' | 'lg' }) {
  const meta = getVendorMeta(category);
  const Icon = meta.icon;
  const dims = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-14 w-14 rounded-xl' : 'h-12 w-12';
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-7 w-7' : 'h-6 w-6';
  return (
    <div className={cn('rounded-lg flex items-center justify-center shrink-0', dims, meta.toneBg, meta.toneText)}>
      <Icon className={iconSize} />
    </div>
  );
}


// ---------- OVERVIEW ----------
function OverviewTab({ vendors }: { vendors: VendorStats[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Receita Total"
          value={`R$ ${(mockSystemStats.totalRevenue / 1000).toFixed(0)}k`}
          change="+18,5%"
          up
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          label="Pedidos Total"
          value={mockSystemStats.totalOrders.toLocaleString('pt-BR')}
          change="+12,3%"
          up
          icon={ShoppingBag}
          tone="primary"
        />
        <StatCard
          label="Vendors Ativos"
          value={`${mockSystemStats.activeVendors}/${mockSystemStats.totalVendors}`}
          icon={Store}
          tone="warning"
          hint={`${mockSystemStats.totalVendors - mockSystemStats.activeVendors} inativos`}
        />
        <StatCard
          label="Clientes"
          value={mockSystemStats.totalClients.toLocaleString('pt-BR')}
          change="+8,7%"
          up
          icon={Users}
          tone="info"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 rounded-xl border bg-gradient-to-br from-primary/5 via-card to-card p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-3">
            <Activity className="h-3.5 w-3.5" /> Movimentação de hoje
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Pedidos</p>
              <p className="text-3xl font-bold">{mockSystemStats.ordersToday}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Receita</p>
              <p className="text-3xl font-bold text-success">
                R$ {mockSystemStats.revenueToday.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Top Vendors</h3>
            <Badge variant="secondary" className="text-[10px]">Este mês</Badge>
          </div>
          <div className="space-y-1">
            {vendors.slice(0, 5).map((vendor, i) => (
              <div
                key={vendor.id}
                className="flex items-center justify-between gap-3 py-2.5 border-b last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={cn(
                      'h-6 w-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0',
                      i === 0
                        ? 'bg-warning/15 text-warning'
                        : i === 1
                        ? 'bg-muted text-foreground'
                        : 'bg-muted/60 text-muted-foreground',
                    )}
                  >
                    {i + 1}
                  </span>
                  <VendorAvatar category={vendor.category} size="sm" />
                  <span className="font-medium truncate">{vendor.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">R$ {vendor.totalRevenue.toLocaleString('pt-BR')}</p>
                  <p className="text-[11px] text-muted-foreground">{vendor.totalOrders} pedidos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CrossVerticalBlock />
    </div>
  );
}

function CrossVerticalBlock() {
  const totalProviders = seedProviders.length;
  const activeProviders = seedProviders.filter((p) => p.isActive).length;
  const totalContacts = seedProviders.reduce((s, p) => s + (p.contactClicks || 0), 0);
  const totalPartners = mockSystemStats.totalVendors + totalProviders;
  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Wrench className="h-4 w-4 text-primary" /> Visão cruzada — Produtos + Serviços
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Parceiros totais</p>
          <p className="text-2xl font-bold">{totalPartners}</p>
          <p className="text-[11px] text-muted-foreground">
            {mockSystemStats.totalVendors} lojas + {totalProviders} prestadores
          </p>
        </div>
        <div className="rounded-lg bg-success/5 p-3">
          <p className="text-xs text-muted-foreground">Ativos</p>
          <p className="text-2xl font-bold text-success">
            {mockSystemStats.activeVendors + activeProviders}
          </p>
        </div>
        <div className="rounded-lg bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground">Pedidos + Contatos</p>
          <p className="text-2xl font-bold text-primary">
            {(mockSystemStats.totalOrders + totalContacts).toLocaleString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------- VENDORS ----------
function VendorsTab() {
  const [vendors, setVendors] = useState<VendorStats[]>(seedVendors);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      vendors.filter(
        (v) =>
          (statusFilter === 'all' || v.status === statusFilter) &&
          v.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [vendors, query, statusFilter],
  );

  const detail = vendors.find((v) => v.id === detailId) || null;
  const editing = vendors.find((v) => v.id === editingId) || null;
  const deleting = vendors.find((v) => v.id === deletingId) || null;

  const toggleActive = (id: string) => {
    setVendors((prev) =>
      prev.map((v) =>
        v.id === id
          ? { ...v, status: v.status === 'active' ? 'inactive' : 'active' }
          : v,
      ),
    );
    const v = vendors.find((x) => x.id === id);
    toast.success(`${v?.name} ${v?.status === 'active' ? 'desativado' : 'ativado'}`);
  };

  const upsertVendor = (data: { name: string; category: VendorCategory; status: VendorStats['status'] }) => {
    if (editingId) {
      setVendors((prev) => prev.map((v) => (v.id === editingId ? { ...v, ...data } : v)));
      toast.success(`${data.name} atualizado`);
      setEditingId(null);
    } else {
      const v: VendorStats = {
        id: crypto.randomUUID(),
        name: data.name,
        category: data.category,
        totalOrders: 0,
        totalRevenue: 0,
        rating: 0,
        status: data.status,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setVendors((prev) => [v, ...prev]);
      toast.success(`${v.name} adicionado`);
    }
  };

  const confirmDelete = () => {
    if (!deleting) return;
    setVendors((prev) => prev.filter((v) => v.id !== deleting.id));
    toast.success(`${deleting.name} removido`);
    setDeletingId(null);
  };


  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total" value={vendors.length.toString()} icon={Store} tone="primary" />
        <StatCard
          label="Ativos"
          value={vendors.filter((v) => v.status === 'active').length.toString()}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Pendentes"
          value={vendors.filter((v) => v.status === 'pending').length.toString()}
          icon={ClipboardCheck}
          tone="warning"
        />
        <StatCard
          label="Inativos"
          value={vendors.filter((v) => v.status === 'inactive').length.toString()}
          icon={Ban}
          tone="destructive"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar vendor..."
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="gap-2" onClick={() => { setEditingId(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Adicionar Vendor
        </Button>
      </div>

      <div className="rounded-xl border bg-card divide-y">
        {filtered.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhum vendor encontrado.
          </div>
        )}
        {filtered.map((vendor) => (
          <div key={vendor.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
            <VendorAvatar category={vendor.category} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium truncate">{vendor.name}</h4>
                <Badge className={cn('text-[10px] border', statusBadge[vendor.status])}>
                  {statusLabel[vendor.status]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {vendor.totalOrders} pedidos • R$ {vendor.totalRevenue.toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="text-right hidden sm:block shrink-0">
              {vendor.rating > 0 && (
                <p className="text-sm font-medium flex items-center gap-1 justify-end">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  {vendor.rating.toFixed(1)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Desde {new Date(vendor.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDetailId(vendor.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setEditingId(vendor.id); setFormOpen(true); }}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleActive(vendor.id)}>
                  <Power className="mr-2 h-4 w-4" />
                  {vendor.status === 'active' ? 'Desativar' : 'Ativar'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeletingId(vendor.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      <VendorFormDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditingId(null); }}
        vendor={editing}
        onSubmit={upsertVendor}
      />
      <VendorDetailDialog
        vendor={detail}
        onOpenChange={(o) => !o && setDetailId(null)}
        onToggle={() => detail && toggleActive(detail.id)}
      />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove permanentemente <span className="font-medium">{deleting?.name}</span> da plataforma. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function VendorFormDialog({
  open,
  onOpenChange,
  vendor,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vendor: VendorStats | null;
  onSubmit: (v: { name: string; category: VendorCategory; status: VendorStats['status'] }) => void;
}) {
  const isEdit = !!vendor;
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [category, setCategory] = useState<VendorCategory>('food');
  const [status, setStatus] = useState<VendorStats['status']>('pending');
  const [subdomain, setSubdomain] = useState('');

  // Sync from vendor when opening in edit mode
  useEffect(() => {
    if (open && vendor) {
      setName(vendor.name);
      setCategory((vendor.category ?? 'food') as VendorCategory);
      setStatus(vendor.status);
      setContact('');
      setSubdomain(seedVendorDomains.find(d => d.vendorId === vendor.id)?.subdomain ?? '');
    } else if (open && !vendor) {
      setName(''); setContact(''); setCategory('food'); setStatus('pending'); setSubdomain('');
    }
  }, [open, vendor?.id]);

  const takenBy = useMemo(() => {
    const map: Record<string, string> = {};
    seedVendorDomains.forEach(d => { map[d.subdomain] = d.vendorId; });
    return map;
  }, []);
  const subdomainError = subdomain ? validateSubdomain(subdomain, takenBy, vendor?.id) : null;

  const submit = () => {
    if (!name.trim()) { toast.error('Nome obrigatório'); return; }
    if (subdomain && subdomainError) { toast.error(subdomainError); return; }
    onSubmit({ name: name.trim(), category, status });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Vendor' : 'Adicionar Vendor'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Atualize as informações do parceiro.' : 'Cadastro rápido de um novo parceiro na plataforma.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="flex items-center gap-3">
            <VendorAvatar category={category} />
            <div className="flex-1 min-w-0">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Padaria da Vila" />
            </div>
          </div>
          <div>
            <Label htmlFor="contact">Contato</Label>
            <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="E-mail ou telefone" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as VendorCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {vendorCategoryOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-muted-foreground">Define o ícone exibido nos painéis.</p>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as VendorStats['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="subdomain">Subdomínio <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <button
                type="button"
                onClick={() => setSubdomain(slugifySubdomain(name))}
                disabled={!name.trim()}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                <Sparkles className="h-3 w-3" />
                Gerar do nome
              </button>
            </div>
            <div
              className={cn(
                'mt-1 flex items-stretch rounded-md border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring',
                subdomainError && 'border-destructive focus-within:ring-destructive/40',
              )}
            >
              <Input
                id="subdomain"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="padaria-da-vila"
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-10 min-w-0"
                maxLength={30}
              />
              <span className="flex items-center px-3 text-xs text-muted-foreground bg-muted/60 border-l whitespace-nowrap">
                .{DOMAIN_SUFFIX}
              </span>
            </div>
            {subdomainError ? (
              <p className="mt-1 text-xs text-destructive">{subdomainError}</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">3–30 caracteres, letras, números e hífen.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>{isEdit ? 'Salvar alterações' : 'Criar vendor'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VendorDetailDialog({
  vendor,
  onOpenChange,
  onToggle,
}: {
  vendor: VendorStats | null;
  onOpenChange: (o: boolean) => void;
  onToggle: () => void;
}) {
  const currentDomain = vendor ? seedVendorDomains.find(d => d.vendorId === vendor.id) : null;
  const [subdomain, setSubdomain] = useState(currentDomain?.subdomain ?? '');

  // Reset ao trocar de vendor
  useEffect(() => {
    setSubdomain(currentDomain?.subdomain ?? '');
  }, [vendor?.id, currentDomain?.subdomain]);

  const takenBy = useMemo(() => {
    const map: Record<string, string> = {};
    seedVendorDomains.forEach(d => { map[d.subdomain] = d.vendorId; });
    return map;
  }, []);
  const subdomainError = subdomain
    ? validateSubdomain(subdomain, takenBy, vendor?.id)
    : null;

  return (
    <Dialog open={!!vendor} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {vendor && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <VendorAvatar category={vendor.category} size="lg" />

                <div className="min-w-0">
                  <DialogTitle className="truncate">{vendor.name}</DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={cn('text-[10px] border', statusBadge[vendor.status])}>
                      {statusLabel[vendor.status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Desde {new Date(vendor.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-2 py-2">
              <div className="rounded-lg border p-3">
                <p className="text-[11px] text-muted-foreground">Pedidos</p>
                <p className="text-lg font-bold">{vendor.totalOrders}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-[11px] text-muted-foreground">Receita</p>
                <p className="text-lg font-bold text-success">
                  R$ {(vendor.totalRevenue / 1000).toFixed(1)}k
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-[11px] text-muted-foreground">Nota</p>
                <p className="text-lg font-bold flex items-center gap-1">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  {vendor.rating > 0 ? vendor.rating.toFixed(1) : '—'}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
              <p className="flex items-center gap-2 text-muted-foreground">
                <ShoppingBag className="h-3.5 w-3.5" /> Ticket médio:{' '}
                <span className="text-foreground font-medium">
                  R${' '}
                  {vendor.totalOrders > 0
                    ? (vendor.totalRevenue / vendor.totalOrders).toFixed(2)
                    : '0,00'}
                </span>
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> Última atividade:{' '}
                <span className="text-foreground font-medium">hoje</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="v-subdomain" className="text-xs text-muted-foreground">
                  Subdomínio da storefront
                </Label>
                <button
                  type="button"
                  onClick={() => setSubdomain(slugifySubdomain(vendor.name))}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  <Sparkles className="h-3 w-3" />
                  Gerar do nome
                </button>
              </div>
              <div
                className={cn(
                  'flex items-stretch rounded-md border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring',
                  subdomainError && 'border-destructive focus-within:ring-destructive/40',
                )}
              >
                <Input
                  id="v-subdomain"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="padaria-da-vila"
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-10 min-w-0"
                  maxLength={30}
                />
                <span className="flex items-center px-3 text-xs text-muted-foreground bg-muted/60 border-l whitespace-nowrap">
                  .{DOMAIN_SUFFIX}
                </span>
              </div>
              {subdomainError ? (
                <p className="text-xs text-destructive">{subdomainError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Gerencie o status na aba Domínios.</p>
              )}
            </div>

            <DialogFooter className="flex-row justify-between sm:justify-between">

              <Button
                variant={vendor.status === 'active' ? 'outline' : 'default'}
                onClick={onToggle}
                className="gap-2"
              >
                <Power className="h-4 w-4" />
                {vendor.status === 'active' ? 'Desativar' : 'Ativar'}
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- SERVICES ----------
function ServicesTab() {
  const [providers, setProviders] = useState(seedProviders);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const editing = providers.find((p) => p.id === editingId) || null;
  const deleting = providers.find((p) => p.id === deletingId) || null;

  const upsertProvider = (data: { name: string; logo: string; type: 'company' | 'individual'; categoryIds: string[]; bio: string; verified: boolean; isActive: boolean }) => {
    if (editingId) {
      setProviders((prev) => prev.map((p) => (p.id === editingId ? { ...p, name: data.name, logo: data.logo, type: data.type, categories: data.categoryIds, bio: data.bio, verified: data.verified, isActive: data.isActive } : p)));
      toast.success(`${data.name} atualizado`);
      setEditingId(null);
    } else {
      const p: ServiceProvider = {
        id: crypto.randomUUID(),
        slug: data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: data.name,
        type: data.type,
        logo: data.logo || `https://picsum.photos/seed/${Date.now()}/800/600`,
        categories: data.categoryIds,
        bio: data.bio,
        rating: 0,
        reviewCount: 0,
        priceRange: { min: 0, unit: 'service' },
        availability: { days: [1,2,3,4,5], from: '08:00', to: '18:00' },
        serviceArea: { city: 'São Paulo' },
        phone: '',
        whatsapp: '',
        photos: [],
        verified: data.verified,
        isActive: data.isActive,
        verification: {},
        profileViews: 0,
        contactClicks: 0,
      };
      setProviders((prev) => [p, ...prev]);
      toast.success(`${data.name} adicionado`);
    }
  };
  const confirmDelete = () => {
    if (!deleting) return;
    setProviders((prev) => prev.filter((p) => p.id !== deleting.id));
    toast.success(`${deleting.name} removido`);
    setDeletingId(null);
  };


  const totalProviders = providers.length;
  const activeProviders = providers.filter((p) => p.isActive).length;
  const totalContacts = providers.reduce((s, p) => s + (p.contactClicks || 0), 0);
  const totalViews = providers.reduce((s, p) => s + (p.profileViews || 0), 0);
  const avgRating = (providers.reduce((s, p) => s + p.rating, 0) / totalProviders).toFixed(1);

  const catCount: Record<string, number> = {};
  providers.forEach((p) =>
    p.categories.forEach((c) => {
      catCount[c] = (catCount[c] || 0) + 1;
    }),
  );
  const topCats = Object.entries(catCount)
    .map(([id, count]) => ({ name: serviceCategories.find((c) => c.id === id)?.name || id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const filtered = providers.filter(
    (p) =>
      (statusFilter === 'all' ||
        (statusFilter === 'active' && p.isActive) ||
        (statusFilter === 'inactive' && !p.isActive)) &&
      p.name.toLowerCase().includes(query.toLowerCase()),
  );

  const toggleActive = (id: string) => {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)));
    const p = providers.find((x) => x.id === id);
    toast.success(`${p?.name} ${p?.isActive ? 'desativado' : 'ativado'}`);
  };

  const detail = providers.find((p) => p.id === detailId) || null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Ativos" value={`${activeProviders}/${totalProviders}`} icon={CheckCircle2} tone="success" />
        <StatCard label="Prestadores" value={totalProviders.toString()} icon={Wrench} tone="primary" />
        <StatCard label="Contatos" value={totalContacts.toLocaleString('pt-BR')} change="+9%" up icon={Phone} tone="info" />
        <StatCard label="Visualizações" value={totalViews.toLocaleString('pt-BR')} change="+14%" up icon={Eye} tone="warning" />
        <StatCard label="Nota média" value={avgRating} icon={Star} tone="warning" />
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold mb-4">Top categorias</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topCats}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar prestador..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-2 ml-auto" onClick={() => { setEditingId(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Adicionar Prestador
        </Button>
      </div>

      <div className="rounded-xl border bg-card divide-y">
        {filtered.map((p) => {
          const cats = p.categories
            .map((id) => serviceCategories.find((c) => c.id === id)?.name)
            .filter(Boolean)
            .slice(0, 2)
            .join(' • ');
          return (
            <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
              <img src={p.logo} alt={p.name} className="h-12 w-12 rounded-lg object-cover bg-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium">{p.name}</h4>
                  <Badge className={cn('text-[10px] border', p.isActive ? statusBadge.active : statusBadge.inactive)}>
                    {p.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {p.type === 'company' ? 'Empresa' : 'Autônomo'}
                  </Badge>
                  {p.verified && <BadgeCheck className="h-4 w-4 text-success" />}
                </div>
                <p className="text-sm text-muted-foreground truncate">{cats}</p>
              </div>
              <div className="text-right hidden sm:block text-xs text-muted-foreground space-y-0.5 shrink-0">
                <p className="flex items-center justify-end gap-1">
                  <Star className="h-3 w-3 fill-warning text-warning" />
                  {p.rating.toFixed(1)}
                </p>
                <p className="flex items-center justify-end gap-1">
                  <Phone className="h-3 w-3" />
                  {p.contactClicks || 0}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setDetailId(p.id)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setEditingId(p.id); setFormOpen(true); }}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleActive(p.id)}>
                    <Power className="mr-2 h-4 w-4" />
                    {p.isActive ? 'Desativar' : 'Ativar'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeletingId(p.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <img src={detail.logo} alt={detail.name} className="h-14 w-14 rounded-xl object-cover" />
                  <div className="min-w-0">
                    <DialogTitle className="truncate flex items-center gap-2">
                      {detail.name}
                      {detail.verified && <BadgeCheck className="h-4 w-4 text-success" />}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={cn('text-[10px] border', detail.isActive ? statusBadge.active : statusBadge.inactive)}>
                        {detail.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {detail.type === 'company' ? 'Empresa' : 'Autônomo'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>
              {detail.bio && <p className="text-sm text-muted-foreground">{detail.bio}</p>}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] text-muted-foreground">Nota</p>
                  <p className="text-lg font-bold flex items-center gap-1">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    {detail.rating.toFixed(1)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] text-muted-foreground">Views</p>
                  <p className="text-lg font-bold">{(detail.profileViews || 0).toLocaleString('pt-BR')}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] text-muted-foreground">Contatos</p>
                  <p className="text-lg font-bold">{detail.contactClicks || 0}</p>
                </div>
              </div>
              <DialogFooter className="flex-row justify-between sm:justify-between">
                <Button
                  variant={detail.isActive ? 'outline' : 'default'}
                  onClick={() => toggleActive(detail.id)}
                  className="gap-2"
                >
                  <Power className="h-4 w-4" />
                  {detail.isActive ? 'Desativar' : 'Ativar'}
                </Button>
                <Button variant="ghost" onClick={() => setDetailId(null)}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ProviderFormDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditingId(null); }}
        provider={editing}
        onSubmit={upsertProvider}
      />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir prestador?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove permanentemente <span className="font-medium">{deleting?.name}</span> do catálogo. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProviderFormDialog({
  open,
  onOpenChange,
  provider,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  provider: ServiceProvider | null;
  onSubmit: (v: { name: string; logo: string; type: 'company' | 'individual'; categoryIds: string[]; bio: string; verified: boolean; isActive: boolean }) => void;
}) {
  const isEdit = !!provider;
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [type, setType] = useState<'company' | 'individual'>('company');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [verified, setVerified] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open && provider) {
      setName(provider.name);
      setLogo(provider.logo);
      setType(provider.type);
      setCategoryIds(provider.categories);
      setBio(provider.bio ?? '');
      setVerified(!!provider.verified);
      setIsActive(!!provider.isActive);
    } else if (open) {
      setName(''); setLogo(''); setType('company'); setCategoryIds([]); setBio(''); setVerified(false); setIsActive(true);
    }
  }, [open, provider?.id]);

  const toggleCat = (id: string) => {
    setCategoryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const submit = () => {
    if (!name.trim()) { toast.error('Nome obrigatório'); return; }
    if (categoryIds.length === 0) { toast.error('Selecione ao menos uma categoria'); return; }
    onSubmit({ name: name.trim(), logo: logo.trim(), type, categoryIds, bio: bio.trim(), verified, isActive });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Prestador' : 'Adicionar Prestador'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Atualize as informações do prestador.' : 'Cadastro de um novo prestador de serviço.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-name">Nome</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João Encanador" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'company' | 'individual')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Empresa</SelectItem>
                  <SelectItem value="individual">Autônomo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="p-logo">URL do logo/foto</Label>
            <Input id="p-logo" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." />
            <p className="mt-1 text-[11px] text-muted-foreground">Deixe vazio para gerar um placeholder.</p>
          </div>
          <div>
            <Label>Categorias</Label>
            <div className="flex flex-wrap gap-1.5 mt-1 max-h-32 overflow-auto p-2 border rounded-md">
              {serviceCategories.map(c => {
                const on = categoryIds.includes(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => toggleCat(c.id)}
                    className={cn(
                      'text-[11px] px-2 py-1 rounded-full border transition-colors',
                      on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label htmlFor="p-bio">Bio</Label>
            <Textarea id="p-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={2} placeholder="Breve descrição pública..." />
          </div>
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={isActive} onCheckedChange={setIsActive} /> Ativo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={verified} onCheckedChange={setVerified} /> Verificado
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>{isEdit ? 'Salvar alterações' : 'Criar prestador'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- CLIENTS ----------
function ClientsTab() {
  const [clients, setClients] = useState<AdminClient[]>(seedClients);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = clients.filter(
    (c) =>
      (statusFilter === 'all' ||
        (statusFilter === 'active' && !c.blocked) ||
        (statusFilter === 'blocked' && c.blocked)) &&
      (c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.email.toLowerCase().includes(query.toLowerCase())),
  );

  const toggleBlock = (id: string) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, blocked: !c.blocked } : c)));
    const c = clients.find((x) => x.id === id);
    toast.success(`${c?.name} ${c?.blocked ? 'desbloqueado' : 'bloqueado'}`);
  };

  const detail = clients.find((c) => c.id === detailId) || null;
  const editing = clients.find((c) => c.id === editingId) || null;
  const deleting = clients.find((c) => c.id === deletingId) || null;
  const totalSpent = clients.reduce((s, c) => s + c.totalSpent, 0);
  const totalOrders = clients.reduce((s, c) => s + c.orders, 0);

  const upsertClient = (data: { name: string; email: string; phone: string; city: string }) => {
    if (editingId) {
      setClients((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...data } : c)));
      toast.success(`${data.name} atualizado`);
      setEditingId(null);
    } else {
      const c: AdminClient = {
        id: crypto.randomUUID(),
        ...data,
        orders: 0,
        totalSpent: 0,
        since: new Date().toISOString().slice(0, 10),
        blocked: false,
      };
      setClients((prev) => [c, ...prev]);
      toast.success(`${c.name} adicionado`);
    }
  };
  const confirmDelete = () => {
    if (!deleting) return;
    setClients((prev) => prev.filter((c) => c.id !== deleting.id));
    toast.success(`${deleting.name} removido`);
    setDeletingId(null);
  };


  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total" value={clients.length.toString()} icon={Users} tone="primary" />
        <StatCard
          label="Ativos"
          value={clients.filter((c) => !c.blocked).length.toString()}
          icon={UserCheck}
          tone="success"
        />
        <StatCard
          label="Bloqueados"
          value={clients.filter((c) => c.blocked).length.toString()}
          icon={Ban}
          tone="destructive"
        />
        <StatCard
          label="Gasto Total"
          value={`R$ ${(totalSpent / 1000).toFixed(1)}k`}
          icon={DollarSign}
          tone="info"
          hint={`${totalOrders} pedidos`}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="blocked">Bloqueados</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-2 ml-auto" onClick={() => { setEditingId(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Adicionar Cliente
        </Button>
      </div>

      <div className="rounded-xl border bg-card divide-y">
        {filtered.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhum cliente encontrado.
          </div>
        )}
        {filtered.map((c) => (
          <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/20 to-info/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
              {c.name
                .split(' ')
                .map((s) => s[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium truncate">{c.name}</h4>
                {c.blocked ? (
                  <Badge className={cn('text-[10px] border', statusBadge.inactive)}>Bloqueado</Badge>
                ) : (
                  <Badge className={cn('text-[10px] border', statusBadge.active)}>Ativo</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{c.email}</p>
            </div>
            <div className="text-right hidden sm:block shrink-0">
              <p className="text-sm font-semibold">R$ {c.totalSpent.toLocaleString('pt-BR')}</p>
              <p className="text-[11px] text-muted-foreground">{c.orders} pedidos</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDetailId(c.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setEditingId(c.id); setFormOpen(true); }}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => toggleBlock(c.id)}
                  className={c.blocked ? '' : 'text-destructive focus:text-destructive'}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  {c.blocked ? 'Desbloquear' : 'Bloquear'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeletingId(c.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-info/20 flex items-center justify-center text-base font-bold text-primary">
                    {detail.name
                      .split(' ')
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="truncate">{detail.name}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {detail.blocked ? (
                        <Badge className={cn('text-[10px] border', statusBadge.inactive)}>Bloqueado</Badge>
                      ) : (
                        <Badge className={cn('text-[10px] border', statusBadge.active)}>Ativo</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Desde {new Date(detail.since).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] text-muted-foreground">Pedidos</p>
                  <p className="text-lg font-bold">{detail.orders}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] text-muted-foreground">Gasto total</p>
                  <p className="text-lg font-bold text-success">
                    R$ {detail.totalSpent.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1.5">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" /> <span className="text-foreground">{detail.email}</span>
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> <span className="text-foreground">{detail.phone}</span>
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> <span className="text-foreground">{detail.city}</span>
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <ArrowUpRight className="h-3.5 w-3.5" /> Ticket médio:{' '}
                  <span className="text-foreground font-medium">
                    R$ {detail.orders > 0 ? (detail.totalSpent / detail.orders).toFixed(2) : '0,00'}
                  </span>
                </p>
              </div>
              <DialogFooter className="flex-row justify-between sm:justify-between">
                <Button
                  variant={detail.blocked ? 'default' : 'destructive'}
                  onClick={() => toggleBlock(detail.id)}
                  className="gap-2"
                >
                  <Ban className="h-4 w-4" />
                  {detail.blocked ? 'Desbloquear' : 'Bloquear'}
                </Button>
                <Button variant="ghost" onClick={() => setDetailId(null)}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ClientFormDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditingId(null); }}
        client={editing}
        onSubmit={upsertClient}
      />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove permanentemente <span className="font-medium">{deleting?.name}</span> do painel. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  client: AdminClient | null;
  onSubmit: (v: { name: string; email: string; phone: string; city: string }) => void;
}) {
  const isEdit = !!client;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    if (open && client) {
      setName(client.name); setEmail(client.email); setPhone(client.phone); setCity(client.city);
    } else if (open) {
      setName(''); setEmail(''); setPhone(''); setCity('');
    }
  }, [open, client?.id]);

  const submit = () => {
    if (!name.trim()) { toast.error('Nome obrigatório'); return; }
    if (!email.trim()) { toast.error('E-mail obrigatório'); return; }
    onSubmit({ name: name.trim(), email: email.trim(), phone: phone.trim(), city: city.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Cliente' : 'Adicionar Cliente'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Atualize as informações do cliente.' : 'Cadastro manual de um novo cliente.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label htmlFor="c-name">Nome completo</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Maria Silva" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="c-email">E-mail</Label>
              <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@email.com" />
            </div>
            <div>
              <Label htmlFor="c-phone">Telefone</Label>
              <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-0000" />
            </div>
          </div>
          <div>
            <Label htmlFor="c-city">Cidade</Label>
            <Input id="c-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo, SP" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>{isEdit ? 'Salvar alterações' : 'Criar cliente'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- SETTINGS ----------
function SettingsTab() {
  const [settings, setSettings] = useState({
    autoApproveVendors: false,
    requireKycProviders: true,
    emailNotifications: true,
    pushNotifications: false,
    maintenanceMode: false,
    weeklyReport: true,
  });
  const [platform, setPlatform] = useState({
    name: 'Use Livre',
    supportEmail: 'suporte@uselivre.com',
  });

  const update = <K extends keyof typeof settings>(key: K, val: boolean) => {
    setSettings((s) => ({ ...s, [key]: val }));
    toast.success('Configuração salva');
  };

  const rows: { key: keyof typeof settings; label: string; hint: string }[] = [
    { key: 'autoApproveVendors', label: 'Aprovar vendors automaticamente', hint: 'Novos vendors entram já como Ativos.' },
    { key: 'requireKycProviders', label: 'KYC obrigatório para prestadores', hint: 'Bloqueia perfil público até verificação.' },
    { key: 'emailNotifications', label: 'Notificações por e-mail', hint: 'Alertas de novos cadastros e denúncias.' },
    { key: 'pushNotifications', label: 'Push notifications', hint: 'Alertas em tempo real no navegador.' },
    { key: 'maintenanceMode', label: 'Modo manutenção', hint: 'Exibe página de manutenção para clientes.' },
    { key: 'weeklyReport', label: 'Relatório semanal', hint: 'Resumo enviado todas as segundas.' },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h3 className="font-semibold">Plataforma</h3>
          <p className="text-xs text-muted-foreground">Informações públicas e valores base.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Nome da plataforma</Label>
            <Input value={platform.name} onChange={(e) => setPlatform({ ...platform, name: e.target.value })} />
          </div>
          <div>
            <Label>E-mail de suporte</Label>
            <Input value={platform.supportEmail} onChange={(e) => setPlatform({ ...platform, supportEmail: e.target.value })} />
          </div>
        </div>

        <div>
          <Button size="sm" onClick={() => toast.success('Alterações salvas')}>Salvar alterações</Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card divide-y">
        <div className="p-5">
          <h3 className="font-semibold">Preferências</h3>
          <p className="text-xs text-muted-foreground">Regras operacionais e comunicação.</p>
        </div>
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between p-4 gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">{r.label}</p>
              <p className="text-xs text-muted-foreground">{r.hint}</p>
            </div>
            <Switch checked={settings[r.key]} onCheckedChange={(v) => update(r.key, v)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- ROOT ----------
export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview');
  const { logout } = useAuth();
  const navigate = useNavigate();
  const kycApps = useKycApplications();
  const pendingKyc = kycApps.filter((a) => a.status === 'pending').length;

  const handleLogout = () => { logout(); navigate('/'); };

  const shellTabs: PanelTab[] = tabs.map(t =>
    t.id === 'onboarding' && pendingKyc > 0 ? { ...t, badge: pendingKyc } : t,
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':   return <OverviewTab vendors={seedVendors} />;
      case 'finance':    return <FinanceTab />;
      case 'onboarding': return <OnboardingTab />;
      case 'marketing':  return <MarketingTab />;
      case 'quality':    return <QualityTab />;
      case 'vendors':    return <VendorsTab />;
      case 'domains':    return <DomainsTab />;
      case 'services':   return <ServicesTab />;
      case 'clients':    return <ClientsTab />;
      case 'settings':   return <SettingsTab />;
      default:           return null;
    }
  };

  const headerRight = (
    <Link to="/">
      <Button variant="outline" size="sm" className="gap-2">
        <Store className="h-4 w-4" />
        <span className="hidden sm:inline">Ver Site</span>
      </Button>
    </Link>
  );

  return (
    <PanelShell
      brand={{ icon: ShieldAlert, title: 'Use Livre', subtitle: 'Painel Admin' }}
      tabs={shellTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerRight={headerRight}
      onLogout={handleLogout}
    >
      {renderContent()}
    </PanelShell>
  );
}

