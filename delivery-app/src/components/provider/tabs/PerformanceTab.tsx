import { Eye, Phone, Star, TrendingUp, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ServiceProvider } from '@/types';
import { SectionCard } from '@/components/common/SectionCard';
import { StatCard } from '@/components/common/StatCard';

interface Props { provider: ServiceProvider; }


export function PerformanceTab({ provider }: Props) {
  const views = provider.profileViews || 0;
  const clicks = provider.contactClicks || 0;
  const conversion = views > 0 ? ((clicks / views) * 100).toFixed(1) + '%' : '—';

  const data = Array.from({ length: 14 }).map((_, i) => ({
    day: `${i + 1}`,
    views: Math.max(0, Math.round(views / 14 + (Math.sin(i) * 8))),
    contacts: Math.max(0, Math.round(clicks / 14 + (Math.cos(i) * 3))),
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Visualizações" value={views.toLocaleString('pt-BR')} icon={Eye} tone="info" />
        <StatCard label="Contatos" value={clicks.toLocaleString('pt-BR')} icon={Phone} tone="success" />
        <StatCard label="Conversão" value={conversion} icon={TrendingUp} tone="primary" />
        <StatCard label="Nota média" value={provider.rating.toFixed(1)} icon={Star} tone="warning" />
      </div>

      <SectionCard icon={BarChart3} title="Últimos 14 dias" accent="info" subtitle="Visualizações do perfil × contatos recebidos">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="views" stroke="hsl(var(--info))" strokeWidth={2.5} name="Visualizações" dot={false} />
              <Line type="monotone" dataKey="contacts" stroke="hsl(var(--success))" strokeWidth={2.5} name="Contatos" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
