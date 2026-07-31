import { useMemo } from 'react';
import { AlertTriangle, TrendingDown, Clock, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockRestaurants } from '@/data/restaurants';
import { cn } from '@/lib/utils';

interface QualityRow {
  id: string;
  name: string;
  logo: string;
  rating: number;
  ratingTrend: number; // negativo = caindo
  cancelRate: number; // %
  slaBreachRate: number; // %
  ordersWeek: number;
}

// Deriva métricas mock determinísticas a partir do hash do id.
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

function buildRows(): QualityRow[] {
  return mockRestaurants.map(r => {
    const h = hash(r.id);
    const ratingTrend = -((h % 7) / 10); // 0 a -0.6
    const cancelRate = (h % 18) + 2; // 2 a 19%
    const slaBreachRate = (h % 25) + 3;
    return {
      id: r.id,
      name: r.name,
      logo: r.logo,
      rating: r.rating,
      ratingTrend,
      cancelRate,
      slaBreachRate,
      ordersWeek: 40 + (h % 220),
    };
  });
}

function severity(row: QualityRow): { score: number; flags: string[]; level: 'crítico' | 'atenção' | 'ok' } {
  const flags: string[] = [];
  let score = 0;
  if (row.ratingTrend <= -0.3) { flags.push('Nota caindo'); score += 3; }
  if (row.cancelRate >= 12) { flags.push('Cancelamento alto'); score += 3; }
  else if (row.cancelRate >= 8) { flags.push('Cancelamento elevado'); score += 1; }
  if (row.slaBreachRate >= 20) { flags.push('SLA estourado'); score += 3; }
  else if (row.slaBreachRate >= 12) { flags.push('SLA frequente'); score += 1; }
  const level = score >= 5 ? 'crítico' : score >= 2 ? 'atenção' : 'ok';
  return { score, flags, level };
}

export function QualityTab() {
  const rows = useMemo(() => {
    const all = buildRows().map(r => ({ row: r, sev: severity(r) }));
    return all
      .filter(x => x.sev.level !== 'ok')
      .sort((a, b) => b.sev.score - a.sev.score);
  }, []);

  const allRows = useMemo(() => buildRows(), []);
  const avgCancel = (allRows.reduce((s, r) => s + r.cancelRate, 0) / allRows.length).toFixed(1);
  const avgSla = (allRows.reduce((s, r) => s + r.slaBreachRate, 0) / allRows.length).toFixed(1);
  const fallingRating = allRows.filter(r => r.ratingTrend <= -0.3).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Em risco</p>
          <p className="text-2xl font-bold text-destructive">{rows.filter(r => r.sev.level === 'crítico').length}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Nota caindo</p>
          <p className="text-2xl font-bold">{fallingRating}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Cancelamento médio</p>
          <p className="text-2xl font-bold">{avgCancel}%</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> SLA estourado (médio)</p>
          <p className="text-2xl font-bold">{avgSla}%</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-medium">Parceiros que precisam de atenção</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ordenado por gravidade. Considere abrir contato comercial ou pausar a vitrine.
          </p>
        </div>

        {rows.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Tudo certo. Nenhum parceiro fora dos padrões.
          </div>
        )}

        <div className="divide-y">
          {rows.map(({ row, sev }) => (
            <div key={row.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <img src={row.logo} alt={row.name} className="h-10 w-10 rounded-lg object-cover bg-muted" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium truncate">{row.name}</h4>
                    <Badge className={cn(
                      'text-xs',
                      sev.level === 'crítico' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning',
                    )}>
                      {sev.level === 'crítico' ? 'Crítico' : 'Atenção'}
                    </Badge>
                    {sev.flags.map(f => (
                      <span key={f} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {f}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{row.ordersWeek} pedidos na semana</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="text-center">
                  <p className="text-muted-foreground flex items-center justify-center gap-1">
                    <Star className="h-3 w-3 fill-warning text-warning" /> Nota
                  </p>
                  <p className="font-semibold text-sm">{row.rating.toFixed(1)}</p>
                  <p className={cn('text-[10px]', row.ratingTrend < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                    {row.ratingTrend.toFixed(1)} 7d
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Cancel.</p>
                  <p className={cn('font-semibold text-sm', row.cancelRate >= 12 ? 'text-destructive' : row.cancelRate >= 8 ? 'text-warning' : '')}>
                    {row.cancelRate}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">SLA</p>
                  <p className={cn('font-semibold text-sm', row.slaBreachRate >= 20 ? 'text-destructive' : row.slaBreachRate >= 12 ? 'text-warning' : '')}>
                    {row.slaBreachRate}%
                  </p>
                </div>
              </div>

              <Button variant="outline" size="sm" className="shrink-0">
                Acionar parceiro
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
