import { useState, useMemo } from 'react';
import { Phone, Star, Plus, Download, FileText, Package, CheckCircle, XCircle, DollarSign, Filter, X, MapPin, Navigation, User, Trophy, TrendingUp, Medal } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { mockDrivers, mockDeliveries, mockOrders } from '@/data/mockData';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';

const driverStatusConfig = {
  available: { label: 'Disponível', color: 'bg-success/10 text-success', dot: 'bg-success' },
  busy: { label: 'Em entrega', color: 'bg-info/10 text-info', dot: 'bg-info' },
  offline: { label: 'Offline', color: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
};

function AssignDeliveryDialog({ driverName, driverId }: { driverName: string; driverId: string }) {
  const [open, setOpen] = useState(false);
  const readyOrders = mockOrders.filter(o => o.status === 'ready');

  const handleAssign = (orderId: string) => {
    toast.success(`Pedido ${orderId} atribuído para ${driverName}!`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Atribuir</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Atribuir entrega para {driverName}</DialogTitle>
        </DialogHeader>
        {readyOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Package className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm font-medium">Nenhum pedido pronto para entrega</p>
            <p className="text-xs mt-1">Novos pedidos aparecerão aqui quando estiverem prontos.</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-3 pb-2">
              {readyOrders.map(order => (
                <Card key={order.id} className="border-l-4 border-l-success">
                  <CardContent className="p-4 space-y-3">
                    {/* Header: order number + time */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm">{order.id}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(order.date), "HH:mm")}
                      </span>
                    </div>

                    {/* Address */}
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium">{order.address}</p>
                        {order.neighborhood && (
                          <p className="text-muted-foreground text-xs">{order.neighborhood}</p>
                        )}
                        {order.reference && (
                          <p className="text-muted-foreground text-xs italic">Ref: {order.reference}</p>
                        )}
                      </div>
                    </div>

                    {/* Distance + Fee row */}
                    <div className="flex items-center gap-4 text-sm">
                      {order.distanceKm !== undefined && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Navigation className="h-3.5 w-3.5" />
                          {order.distanceKm.toFixed(1)} km
                        </span>
                      )}
                      {order.deliveryFee !== undefined && (
                        <span className="flex items-center gap-1 font-medium text-success">
                          <DollarSign className="h-3.5 w-3.5" />
                          R$ {order.deliveryFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>

                    {/* Customer */}
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{order.customer}</span>
                      {order.customerPhone && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {order.customerPhone}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Items summary */}
                    {order.itemsSummary && order.itemsSummary.length > 0 && (
                      <div className="bg-muted/50 rounded-md p-2">
                        <p className="text-xs text-muted-foreground mb-1 font-medium">Itens do pedido:</p>
                        <div className="flex flex-wrap gap-1">
                          {order.itemsSummary.map((item, i) => (
                            <Badge key={i} variant="secondary" className="text-xs font-normal">
                              {item.qty}x {item.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assign button */}
                    <Button
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => handleAssign(order.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Atribuir este pedido
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EquipeContent() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-success" />
            Disponíveis: <span className="font-medium text-foreground">{mockDrivers.filter(d => d.status === 'available').length}</span>
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-info" />
            Em entrega: <span className="font-medium text-foreground">{mockDrivers.filter(d => d.status === 'busy').length}</span>
          </span>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      <div className="bg-card rounded-xl border divide-y">
        {mockDrivers.map(driver => {
          const status = driverStatusConfig[driver.status];
          return (
            <div key={driver.id} className="flex items-center gap-4 p-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={driver.avatar} />
                <AvatarFallback>{driver.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-sm">{driver.name}</span>
                  <Badge className={`${status.color} text-xs`}>{status.label}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{driver.phone}</span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-warning text-warning" />
                    {driver.rating}
                  </span>
                  <span>{driver.deliveries} entregas</span>
                </div>
              </div>
              {driver.status === 'available' && (
                <AssignDeliveryDialog driverName={driver.name} driverId={driver.id} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FaturamentoContent() {
  const [driverFilter, setDriverFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateStart, setDateStart] = useState<Date | undefined>();
  const [dateEnd, setDateEnd] = useState<Date | undefined>();

  const filteredDeliveries = useMemo(() => {
    return mockDeliveries.filter(d => {
      if (driverFilter !== 'all' && d.driverId !== driverFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (dateStart && new Date(d.date) < dateStart) return false;
      if (dateEnd) {
        const end = new Date(dateEnd);
        end.setHours(23, 59, 59);
        if (new Date(d.date) > end) return false;
      }
      return true;
    });
  }, [driverFilter, statusFilter, dateStart, dateEnd]);

  const stats = useMemo(() => {
    const total = filteredDeliveries.length;
    const completed = filteredDeliveries.filter(d => d.status === 'completed');
    const returned = filteredDeliveries.filter(d => d.status === 'returned');
    const completedCost = completed.reduce((s, d) => s + d.freightCost, 0);
    const returnedCost = returned.reduce((s, d) => s + d.freightCost, 0);
    return {
      total,
      completed: completed.length,
      completedPct: total ? ((completed.length / total) * 100).toFixed(1) : '0',
      returned: returned.length,
      returnedPct: total ? ((returned.length / total) * 100).toFixed(1) : '0',
      completedCost,
      returnedCost,
      totalCost: completedCost + returnedCost,
    };
  }, [filteredDeliveries]);

  const clearFilters = () => {
    setDriverFilter('all');
    setStatusFilter('all');
    setDateStart(undefined);
    setDateEnd(undefined);
  };

  const hasFilters = driverFilter !== 'all' || statusFilter !== 'all' || dateStart || dateEnd;

  const exportCSV = () => {
    const header = 'Motoboy,Código,Nº Pedido,Data,Status,Custo Frete,Motivo Devolução\n';
    const rows = filteredDeliveries.map(d =>
      `${d.driverName},${d.driverId},${d.orderNumber},${d.date},${d.status === 'completed' ? 'Concluída' : 'Devolvida'},${d.freightCost.toFixed(2)},${d.returnReason || ''}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relatorio-entregas.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalFreight = filteredDeliveries.reduce((s, d) => s + d.freightCost, 0);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package className="h-4 w-4" />
              <span className="text-xs font-medium">Total Entregas</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-success mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Concluídas</span>
            </div>
            <p className="text-2xl font-bold">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">{stats.completedPct}% do total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <XCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Devolvidas</span>
            </div>
            <p className="text-2xl font-bold">{stats.returned}</p>
            <p className="text-xs text-muted-foreground">{stats.returnedPct}% taxa devolução</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Custo Fretes</span>
            </div>
            <p className="text-2xl font-bold">R$ {stats.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <div className="flex gap-2 text-xs mt-0.5">
              <span className="text-success">✓ R$ {stats.completedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <span className="text-destructive">✗ R$ {stats.returnedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={driverFilter} onValueChange={setDriverFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os motoboys" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os motoboys</SelectItem>
            {mockDrivers.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateStart && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateStart ? format(dateStart, 'dd/MM/yyyy') : 'Data início'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateStart} onSelect={setDateStart} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateEnd && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateEnd ? format(dateEnd, 'dd/MM/yyyy') : 'Data fim'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateEnd} onSelect={setDateEnd} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-4 w-4" /> Limpar filtros
          </Button>
        )}

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Trophy className="h-4 w-4" /> Ranking Entregadores
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-warning" />
                  Ranking por Entregador
                  {(dateStart || dateEnd) && (
                    <span className="text-xs font-normal text-muted-foreground ml-2">
                      {dateStart ? format(dateStart, 'dd/MM/yyyy') : '...'} — {dateEnd ? format(dateEnd, 'dd/MM/yyyy') : '...'}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="flex-1 -mx-6 px-6">
                {(() => {
                  const driverRanking = mockDrivers.map(driver => {
                    const driverDeliveries = filteredDeliveries.filter(d => d.driverId === driver.id);
                    const completed = driverDeliveries.filter(d => d.status === 'completed');
                    const returned = driverDeliveries.filter(d => d.status === 'returned');
                    const totalRevenue = driverDeliveries.reduce((s, d) => s + d.freightCost, 0);
                    const completedRevenue = completed.reduce((s, d) => s + d.freightCost, 0);
                    const returnedRevenue = returned.reduce((s, d) => s + d.freightCost, 0);
                    const total = driverDeliveries.length;
                    const avgTicket = total > 0 ? totalRevenue / total : 0;
                    const completionRate = total > 0 ? (completed.length / total) * 100 : 0;
                    const avgCompletedFreight = completed.length > 0 ? completedRevenue / completed.length : 0;
                    const avgReturnedFreight = returned.length > 0 ? returnedRevenue / returned.length : 0;
                    return {
                      ...driver,
                      total,
                      completed: completed.length,
                      returned: returned.length,
                      totalRevenue,
                      avgTicket,
                      completionRate,
                      avgCompletedFreight,
                      avgReturnedFreight,
                    };
                  }).filter(d => d.total > 0).sort((a, b) => b.totalRevenue - a.totalRevenue);

                  const medalColors = ['text-medal-gold', 'text-medal-silver', 'text-medal-bronze'];

                  if (driverRanking.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <TrendingUp className="h-10 w-10 mb-3 opacity-50" />
                        <p className="text-sm font-medium">Nenhum dado para o período selecionado</p>
                      </div>
                    );
                  }

                  const maxRevenue = driverRanking[0]?.totalRevenue || 1;

                  return (
                    <div className="space-y-3 pb-2">
                      {driverRanking.map((driver, idx) => (
                        <Card key={driver.id} className={cn("transition-all", idx === 0 && "border-yellow-500/50 shadow-md")}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex items-center justify-center w-8 h-8 shrink-0">
                                {idx < 3 ? (
                                  <Medal className={cn("h-6 w-6", medalColors[idx])} />
                                ) : (
                                  <span className="text-sm font-bold text-muted-foreground">{idx + 1}º</span>
                                )}
                              </div>
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">{driver.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{driver.name}</p>
                                <p className="text-xs text-muted-foreground">{driver.id}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold">R$ {driver.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                <p className="text-xs text-muted-foreground">faturamento</p>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-muted rounded-full h-2 mb-3">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${(driver.totalRevenue / maxRevenue) * 100}%` }}
                              />
                            </div>

                            {/* Metrics grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div>
                                <p className="text-muted-foreground">Entregas</p>
                                <p className="font-semibold">{driver.total}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Taxa Conclusão</p>
                                <p className={cn("font-semibold", driver.completionRate >= 80 ? "text-success" : driver.completionRate >= 50 ? "text-warning" : "text-destructive")}>
                                  {driver.completionRate.toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Ticket Médio</p>
                                <p className="font-semibold">R$ {driver.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Frete Médio</p>
                                <div className="flex gap-2">
                                  <span className="text-success font-semibold">R$ {driver.avgCompletedFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  {driver.avgReturnedFreight > 0 && (
                                    <span className="text-destructive font-semibold">R$ {driver.avgReturnedFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })()}
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status filter tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="completed">Concluídas</TabsTrigger>
          <TabsTrigger value="returned">Devolvidas</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Motoboy</TableHead>
              <TableHead>Nº Pedido</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Custo Frete</TableHead>
              <TableHead>Motivo Devolução</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDeliveries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma entrega encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredDeliveries.map(d => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">{d.driverName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium whitespace-nowrap">{d.driverName}</p>
                        <p className="text-xs text-muted-foreground">{d.driverId}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{d.orderNumber}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{format(new Date(d.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <Badge className={d.status === 'completed' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                      {d.status === 'completed' ? 'Concluída' : 'Devolvida'}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn("text-right font-medium tabular-nums", d.status === 'returned' && 'text-destructive')}>
                    R$ {d.freightCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.returnReason || '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3">
        <span>{filteredDeliveries.length} registro(s) exibido(s)</span>
        <span className="font-medium text-foreground">
          Total fretes: R$ {totalFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}

export function DriversTab() {
  return (
    <Tabs defaultValue="equipe" className="space-y-4">
      <TabsList>
        <TabsTrigger value="equipe">Equipe</TabsTrigger>
        <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
      </TabsList>
      <TabsContent value="equipe">
        <EquipeContent />
      </TabsContent>
      <TabsContent value="faturamento">
        <FaturamentoContent />
      </TabsContent>
    </Tabs>
  );
}
