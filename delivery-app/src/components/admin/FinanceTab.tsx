import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  TrendingUp, TrendingDown, Download, Wallet, Users, Gift, Activity,
  Sparkles, Zap, Rocket, CircleDot, Clock, AlertTriangle, XCircle, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { mrrSeries, subscribers, SubscriptionStatus, SubscriptionPlan } from '@/data/subscriptions';
import { getVendorMeta } from '@/lib/vendorIcon';
import type { LucideIcon } from 'lucide-react';

function StatCard({
  label, value, change, up, icon: Icon, tone = 'primary',
}: {
  label: string;
  value: string;
  change?: string;
  up?: boolean;
  icon: LucideIcon;
  tone?: 'primary' | 'info' | 'success' | 'warning';
}) {
  const toneMap = {
    primary: 'bg-primary/10 text-primary',
    info:    'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  } as const;
  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs text-muted-foreground leading-tight">{label}</p>
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', toneMap[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {change && (
        <p className={cn('text-xs flex items-center gap-1 mt-1', up ? 'text-success' : 'text-destructive')}>
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change}
        </p>
      )}
    </div>
  );
}

const STATUS_META: Record<SubscriptionStatus, { label: string; icon: LucideIcon; className: string }> = {
  ativo:        { label: 'Ativo',        icon: CheckCircle2,   className: 'bg-success/10 text-success border-success/20' },
  trial:        { label: 'Em teste',     icon: Clock,          className: 'bg-info/10 text-info border-info/20' },
  inadimplente: { label: 'Inadimplente', icon: AlertTriangle,  className: 'bg-warning/10 text-warning border-warning/20' },
  cancelado:    { label: 'Cancelado',    icon: XCircle,        className: 'bg-muted text-muted-foreground border-border' },
};

const PLAN_META: Record<SubscriptionPlan, { icon: LucideIcon; className: string }> = {
  Essencial:    { icon: Sparkles, className: 'bg-muted text-muted-foreground' },
  Profissional: { icon: Zap,      className: 'bg-info/10 text-info' },
  Avançado:     { icon: Rocket,   className: 'bg-primary/10 text-primary' },
};

export function FinanceTab() {
  const mrr = mrrSeries[mrrSeries.length - 1].mrr;
  const prevMrr = mrrSeries[mrrSeries.length - 2].mrr;
  const mrrChange = ((mrr - prevMrr) / prevMrr) * 100;

  const activeCount = useMemo(() => subscribers.filter(s => s.status === 'ativo').length, []);
  const trialCount = useMemo(() => subscribers.filter(s => s.status === 'trial').length, []);
  const canceledCount = useMemo(() => subscribers.filter(s => s.status === 'cancelado').length, []);
  const paying = activeCount + subscribers.filter(s => s.status === 'inadimplente').length;
  const churn = paying + canceledCount > 0 ? (canceledCount / (paying + canceledCount)) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="MRR"
          value={`R$ ${(mrr / 1000).toFixed(1)}k`}
          change={`${mrrChange >= 0 ? '+' : ''}${mrrChange.toFixed(1)}%`}
          up={mrrChange >= 0}
          icon={Wallet}
          tone="primary"
        />
        <StatCard label="Assinantes ativos" value={String(activeCount)} icon={Users} tone="success" />
        <StatCard label="Em teste (1º mês)" value={String(trialCount)} icon={Gift} tone="info" />
        <StatCard label="Churn" value={`${churn.toFixed(1)}%`} icon={Activity} tone="warning" />
      </div>

      <div className="bg-card rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h3 className="font-medium">MRR ao longo do tempo</h3>
          </div>
          <span className="text-xs text-muted-foreground">Últimos 8 meses</span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mrrSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, 'MRR']}
              />
              <Line type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 border-b">
          <div className="min-w-0">
            <h3 className="font-medium flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-primary" />
              Assinantes
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {subscribers.length} no total · <span className="font-semibold text-foreground">{activeCount}</span> ativos · <span className="font-semibold text-foreground">{trialCount}</span> em teste
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 shrink-0">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium p-3">Assinante</th>
                <th className="text-left font-medium p-3">Plano</th>
                <th className="text-right font-medium p-3">Mensalidade</th>
                <th className="text-left font-medium p-3">Próxima cobrança</th>
                <th className="text-left font-medium p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map(s => {
                const status = STATUS_META[s.status];
                const plan = PLAN_META[s.plan];
                const cat = getVendorMeta(s.category);
                const CatIcon = cat.icon;
                const PlanIcon = plan.icon;
                const StatusIcon = status.icon;
                return (
                  <tr key={s.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', cat.toneBg, cat.toneText)}>
                          <CatIcon className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{s.name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium', plan.className)}>
                        <PlanIcon className="h-3 w-3" />
                        {s.plan}
                      </span>
                    </td>
                    <td className="p-3 text-right tabular-nums font-semibold">R$ {s.monthlyPrice.toLocaleString('pt-BR')}</td>
                    <td className="p-3 text-xs text-muted-foreground tabular-nums">
                      {s.nextCharge === '—' ? '—' : new Date(s.nextCharge).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={cn('text-xs gap-1 font-medium', status.className)}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y">
          {subscribers.map(s => {
            const status = STATUS_META[s.status];
            const plan = PLAN_META[s.plan];
            const cat = getVendorMeta(s.category);
            const CatIcon = cat.icon;
            const PlanIcon = plan.icon;
            const StatusIcon = status.icon;
            return (
              <div key={s.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', cat.toneBg, cat.toneText)}>
                      <CatIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{s.name}</p>
                      <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium mt-0.5', plan.className)}>
                        <PlanIcon className="h-2.5 w-2.5" />
                        {s.plan}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn('text-xs gap-1 font-medium shrink-0', status.className)}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Próx.: {s.nextCharge === '—' ? '—' : new Date(s.nextCharge).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="font-semibold tabular-nums text-sm">R$ {s.monthlyPrice.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
