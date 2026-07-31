import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Search, ChevronDown, ChevronUp, MapPin, CreditCard, Clock, Truck, Package, Users, Download, CalendarIcon, Filter, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { mockSalesData, mockVendorOrders, mockDrivers, type VendorOrderDetail } from '@/data/mockData';
import { OrderItemBlock } from '@/components/vendor/OrderItemBlock';
import { toast } from 'sonner';

const categoryData = [
  { name: 'Pizzas', value: 35, color: 'hsl(221, 83%, 53%)' },
  { name: 'Lanches', value: 28, color: 'hsl(160, 84%, 39%)' },
  { name: 'Bebidas', value: 20, color: 'hsl(32, 95%, 44%)' },
  { name: 'Outros', value: 17, color: 'hsl(270, 70%, 60%)' },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-warning/10 text-warning border-warning/20' },
  preparing: { label: 'Preparando', color: 'bg-accent text-accent-foreground border-accent' },
  ready: { label: 'Pronto', color: 'bg-success/10 text-success border-success/20' },
  in_transit: { label: 'Em Trânsito', color: 'bg-primary/10 text-primary border-primary/20' },
  delivered: { label: 'Entregue', color: 'bg-success/10 text-success border-success/20' },
  cancelled: { label: 'Cancelado', color: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border rounded-lg p-2 shadow-sm">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-info font-semibold">R$ {payload[0].value.toLocaleString('pt-BR')}</p>
      </div>
    );
  }
  return null;
};

function OrderDetailSection() {
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [useTime, setUseTime] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const uniqueDrivers = useMemo(() => {
    const drivers = new Set<string>();
    mockVendorOrders.forEach(o => { if (o.driverName) drivers.add(o.driverName); });
    return Array.from(drivers);
  }, []);

  const uniquePayments = useMemo(() => {
    const payments = new Set<string>();
    mockVendorOrders.forEach(o => payments.add(o.paymentMethod));
    return Array.from(payments);
  }, []);

  const filteredOrders = useMemo(() => {
    return mockVendorOrders.filter(o => {
      // Date filter
      if (dateFrom) {
        const orderDate = new Date(o.createdAt);
        const fromDate = new Date(dateFrom);
        if (useTime && timeFrom) {
          const [h, m] = timeFrom.split(':').map(Number);
          fromDate.setHours(h, m, 0, 0);
        } else {
          fromDate.setHours(0, 0, 0, 0);
        }
        if (orderDate < fromDate) return false;
      }
      if (dateTo) {
        const orderDate = new Date(o.createdAt);
        const toDate = new Date(dateTo);
        if (useTime && timeTo) {
          const [h, m] = timeTo.split(':').map(Number);
          toDate.setHours(h, m, 59, 999);
        } else {
          toDate.setHours(23, 59, 59, 999);
        }
        if (orderDate > toDate) return false;
      }

      if (paymentFilter !== 'all' && o.paymentMethod !== paymentFilter) return false;
      if (driverFilter !== 'all' && o.driverName !== driverFilter) return false;
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchId = o.id.toLowerCase().includes(q);
        const matchCustomer = o.customer.toLowerCase().includes(q);
        const matchAddress = o.address.toLowerCase().includes(q);
        const matchPhone = o.customerPhone.toLowerCase().includes(q);
        const matchValue = o.total.toFixed(2).includes(q);
        const matchProduct = o.items.some(item => item.name.toLowerCase().includes(q));
        if (!matchId && !matchCustomer && !matchAddress && !matchPhone && !matchValue && !matchProduct) return false;
      }

      return true;
    });
  }, [dateFrom, dateTo, timeFrom, timeTo, useTime, paymentFilter, driverFilter, statusFilter, searchQuery]);

  const totals = useMemo(() => ({
    count: filteredOrders.length,
    revenue: filteredOrders.reduce((s, o) => s + o.total, 0),
    deliveryFees: filteredOrders.reduce((s, o) => s + o.deliveryFee, 0),
    avgTicket: filteredOrders.length > 0 ? filteredOrders.reduce((s, o) => s + o.total, 0) / filteredOrders.length : 0,
  }), [filteredOrders]);

  const handleExportCSV = () => {
    const headers = ['Pedido', 'Data/Hora', 'Cliente', 'Telefone', 'Endereço', 'Bairro', 'Distância (km)', 'Itens', 'Subtotal', 'Frete', 'Total', 'Pagamento', 'Entregador', 'Status'];
    const rows = filteredOrders.map(o => [
      o.id,
      new Date(o.createdAt).toLocaleString('pt-BR'),
      o.customer,
      o.customerPhone,
      o.address,
      o.neighborhood,
      o.distanceKm.toString(),
      o.items.map(i => `${i.qty}x ${i.name}`).join('; '),
      o.subtotal.toFixed(2),
      o.deliveryFee.toFixed(2),
      o.total.toFixed(2),
      o.paymentMethod,
      o.driverName || '-',
      statusConfig[o.status]?.label || o.status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pedidos_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
    link.click();
    toast.success('CSV exportado com sucesso!');
  };

  const clearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setTimeFrom('');
    setTimeTo('');
    setUseTime(false);
    setPaymentFilter('all');
    setDriverFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = dateFrom || dateTo || paymentFilter !== 'all' || driverFilter !== 'all' || statusFilter !== 'all' || searchQuery;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Detalhamento de Pedidos</h3>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
              Limpar filtros
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border p-4 space-y-4">
        {/* Date range row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Data início</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Data fim</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time toggle + inputs */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-xs font-medium text-muted-foreground">Horário</label>
              <Switch checked={useTime} onCheckedChange={setUseTime} className="scale-75" />
            </div>
            {useTime ? (
              <div className="flex gap-2">
                <Input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} className="h-9 text-xs" placeholder="De" />
                <Input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} className="h-9 text-xs" placeholder="Até" />
              </div>
            ) : (
              <div className="h-9 flex items-center">
                <span className="text-xs text-muted-foreground">Apenas data</span>
              </div>
            )}
          </div>
        </div>

        {/* Second filter row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Pagamento</label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniquePayments.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Entregador</label>
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniqueDrivers.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar: nome, telefone, endereço, valor, produto..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-1">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{totals.count}</span> pedido{totals.count !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Total: <span className="font-semibold text-foreground">R$ {totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
          <span>Fretes: <span className="font-semibold text-foreground">R$ {totals.deliveryFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
          <span>Ticket médio: <span className="font-semibold text-foreground">R$ {totals.avgTicket.toFixed(2)}</span></span>
        </div>
      </div>

      {/* Orders list */}
      <div className="space-y-2">
        {filteredOrders.map(order => {
          const isExpanded = expandedOrder === order.id;
          const orderTime = new Date(order.createdAt);
          const si = statusConfig[order.status];

          return (
            <div key={order.id} className="bg-card rounded-xl border overflow-hidden">
              <button
                onClick={() => setExpandedOrder(prev => prev === order.id ? null : order.id)}
                className="w-full text-left p-3 sm:p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{order.id}</span>
                      <Badge className={cn('text-[10px] border', si.color)}>{si.label}</Badge>
                      <span className="text-[10px] text-muted-foreground">{order.paymentMethod}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {order.customer} • {order.neighborhood} • {format(orderTime, "dd/MM HH:mm")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-sm hidden sm:block">R$ {order.total.toFixed(2)}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t px-4 py-3 space-y-3 bg-muted/20">
                  {/* Items */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <Package className="h-3 w-3" /> Itens do pedido
                    </p>
                    <div className="space-y-2">
                      {order.items.map((item, i) => (
                        <OrderItemBlock key={i} item={item} />
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="tabular-nums">R$ {order.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entrega ({order.distanceKm} km)</span>
                      <span className="tabular-nums">{order.deliveryFee > 0 ? `R$ ${order.deliveryFee.toFixed(2)}` : 'Grátis'}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="tabular-nums">R$ {order.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t pt-2">
                    <div className="flex items-start gap-2 text-xs">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">{order.address}</span>
                        <span className="text-muted-foreground"> — {order.neighborhood} ({order.distanceKm} km)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{order.paymentMethod}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{order.customer} • {order.customerPhone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{orderTime.toLocaleString('pt-BR')}</span>
                    </div>
                    {order.driverName && (
                      <div className="flex items-center gap-2 text-xs">
                        <Truck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium">{order.driverName}</span>
                      </div>
                    )}
                  </div>

                  {order.observation && (
                    <div className="border-t pt-2">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">Obs:</span> {order.observation}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum pedido encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">Ajuste os filtros acima</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ReportsTab() {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
        <TabsTrigger value="details">Detalhamento de Pedidos</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6 mt-4">
        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Receita', value: 'R$ 17.590', change: '+12,5%', up: true },
            { label: 'Pedidos', value: '395', change: '+8,2%', up: true },
            { label: 'Clientes', value: '48', change: '-3,1%', up: false },
            { label: 'Avaliação', value: '4.7', change: '+0,2', up: true },
          ].map((m, i) => (
            <div key={i} className="bg-card rounded-xl border p-4">
              <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
              <p className="text-xl font-bold">{m.value}</p>
              <p className={`text-xs flex items-center gap-1 mt-1 ${m.up ? 'text-success' : 'text-destructive'}`}>
                {m.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {m.change}
              </p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card rounded-xl border p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium">Vendas</h3>
                <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
              </div>
              <Badge className="bg-info/10 text-info border-0">R$ 17.590</Badge>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockSalesData}>
                  <defs>
                    <linearGradient id="fillVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 90%)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(0, 0%, 45%)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(0, 0%, 45%)' }} tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="vendas" stroke="hsl(221, 83%, 53%)" strokeWidth={2} fill="url(#fillVendas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card rounded-xl border p-4">
            <h3 className="font-medium mb-4">Categorias</h3>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value">
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {categoryData.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-muted-foreground">{c.name}</span>
                  </div>
                  <span className="font-medium">{c.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-card rounded-xl border p-4">
          <h3 className="font-medium mb-4">Top Produtos</h3>
          <div className="space-y-3">
            {[
              { name: 'Pizza Margherita', sales: 156, revenue: 'R$ 7.160' },
              { name: 'Hambúrguer Artesanal', sales: 124, revenue: 'R$ 4.080' },
              { name: 'Açaí 500ml', sales: 98, revenue: 'R$ 2.244' },
              { name: 'Batata Frita', sales: 87, revenue: 'R$ 1.644' },
              { name: 'Coca-Cola 2L', sales: 76, revenue: 'R$ 980' },
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-5 ${i === 0 ? 'text-info' : i === 1 ? 'text-success' : i === 2 ? 'text-warning' : 'text-muted-foreground'}`}>#{i + 1}</span>
                  <span className="text-sm font-medium">{p.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{p.revenue}</p>
                  <p className="text-xs text-muted-foreground">{p.sales} vendas</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment & Order Type Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border p-4">
            <h3 className="font-medium mb-4">Análise de Pagamentos</h3>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm min-w-[320px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-2 font-medium text-muted-foreground whitespace-nowrap">Método</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Faturamento</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Pedidos</th>
                    <th className="text-right py-2 pl-2 font-medium text-muted-foreground whitespace-nowrap">%</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { method: 'PIX', revenue: 'R$ 7.890', orders: 178, percent: 45 },
                    { method: 'Cartão Crédito', revenue: 'R$ 5.240', orders: 118, percent: 30 },
                    { method: 'Cartão Débito', revenue: 'R$ 2.980', orders: 67, percent: 17 },
                    { method: 'Dinheiro', revenue: 'R$ 1.480', orders: 32, percent: 8 },
                  ].map((p, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 pr-2 font-medium whitespace-nowrap">{p.method}</td>
                      <td className="py-3 px-2 text-right tabular-nums whitespace-nowrap">{p.revenue}</td>
                      <td className="py-3 px-2 text-center text-muted-foreground tabular-nums">{p.orders}</td>
                      <td className="py-3 pl-2 text-right">
                        <span className={`font-semibold tabular-nums ${i === 0 ? 'text-info' : ''}`}>{p.percent}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card rounded-xl border p-4">
            <h3 className="font-medium mb-4">Análise por Tipo de Pedido</h3>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm min-w-[320px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-2 font-medium text-muted-foreground whitespace-nowrap">Tipo</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Faturamento</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Pedidos</th>
                    <th className="text-right py-2 pl-2 font-medium text-muted-foreground whitespace-nowrap">%</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { type: 'Delivery', revenue: 'R$ 12.340', orders: 278, percent: 70 },
                    { type: 'Retirada', revenue: 'R$ 3.520', orders: 79, percent: 20 },
                    { type: 'Mesa', revenue: 'R$ 1.730', orders: 38, percent: 10 },
                  ].map((t, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 pr-2 font-medium whitespace-nowrap">{t.type}</td>
                      <td className="py-3 px-2 text-right tabular-nums whitespace-nowrap">{t.revenue}</td>
                      <td className="py-3 px-2 text-center text-muted-foreground tabular-nums">{t.orders}</td>
                      <td className="py-3 pl-2 text-right">
                        <span className={`font-semibold tabular-nums ${i === 0 ? 'text-info' : ''}`}>{t.percent}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="details" className="mt-4">
        <OrderDetailSection />
      </TabsContent>
    </Tabs>
  );
}
