import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Star, ThumbsUp, ThumbsDown, Minus, EyeOff } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { mockReviews } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { usePublicCommentsVisibility } from '@/lib/reviewsVisibility';

// Mapeia sentimento → nota estimada (1–5)
const sentimentToStars = (s: 'good' | 'neutral' | 'bad') => (s === 'good' ? 5 : s === 'neutral' ? 3 : 2);

// Cores determinísticas para o avatar (baseado em hash simples do nome)
const avatarPalette = [
  'bg-primary/15 text-primary',
  'bg-success/15 text-success',
  'bg-warning/15 text-warning',
  'bg-info/15 text-info',
  'bg-destructive/15 text-destructive',
];
const getAvatarColor = (name: string) => {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return avatarPalette[hash % avatarPalette.length];
};
const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

interface Props {
  open: boolean;
  onClose: () => void;
  restaurantName: string;
  rating: number;
  ownerKey: string;
  isActive: boolean;
}

const sentimentMap = {
  good: { icon: ThumbsUp, label: 'Positiva', cls: 'text-success bg-success/10' },
  neutral: { icon: Minus, label: 'Neutra', cls: 'text-muted-foreground bg-muted' },
  bad: { icon: ThumbsDown, label: 'Negativa', cls: 'text-destructive bg-destructive/10' },
} as const;

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

export function RestaurantReviewsModal({ open, onClose, restaurantName, rating, ownerKey, isActive }: Props) {
  const commentsVis = usePublicCommentsVisibility({ ownerId: ownerKey, isActive });
  const total = mockReviews.length;
  const counts = mockReviews.reduce(
    (acc, r) => ({ ...acc, [r.sentiment]: (acc[r.sentiment] || 0) + 1 }),
    {} as Record<string, number>
  );
  const distribution = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: mockReviews.filter(r => sentimentToStars(r.sentiment) === stars).length,
  }));
  const recommendPct = total > 0 ? Math.round(((counts.good || 0) / total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-warning text-warning" />
            Avaliações de {restaurantName}
          </DialogTitle>
          <DialogDescription>O que os clientes estão dizendo</DialogDescription>
        </DialogHeader>

        {/* Resumo */}
        <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-3">
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground leading-none">{rating.toFixed(1)}</p>
            <div className="flex justify-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={cn('h-3 w-3', s <= Math.round(rating) ? 'fill-warning text-warning' : 'text-muted-foreground/30')} />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{total} avaliações</p>
          </div>
          <div className="flex-1 space-y-1.5 text-xs">
            {(['good', 'neutral', 'bad'] as const).map(s => {
              const info = sentimentMap[s];
              const Icon = info.icon;
              const pct = total > 0 ? ((counts[s] || 0) / total) * 100 : 0;
              return (
                <div key={s} className="flex items-center gap-2">
                  <Icon className={cn('h-3.5 w-3.5', info.cls.split(' ')[0])} />
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn('h-full rounded-full', s === 'good' ? 'bg-success' : s === 'bad' ? 'bg-destructive' : 'bg-muted-foreground/50')} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-muted-foreground tabular-nums w-7 text-right">{counts[s] || 0}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribuição 5→1 + % recomenda */}
        <div className="rounded-lg border bg-card p-3 space-y-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Distribuição</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-success">{recommendPct}%</span> recomenda
            </p>
          </div>
          {distribution.map(d => {
            const pct = total > 0 ? (d.count / total) * 100 : 0;
            return (
              <div key={d.stars} className="flex items-center gap-2 text-[11px]">
                <span className="w-3 tabular-nums font-medium text-foreground">{d.stars}</span>
                <Star className="h-3 w-3 fill-warning text-warning shrink-0" />
                <Progress value={pct} className="h-1.5 flex-1" />
                <span className="w-6 text-right tabular-nums text-muted-foreground">{d.count}</span>
              </div>
            );
          })}
        </div>


        {/* Lista de comentários — só quando permitido */}
        {commentsVis.showComments ? (
          <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-4 pt-1">
            {mockReviews.map(r => {
              const info = sentimentMap[r.sentiment];
              const Icon = info.icon;
              return (
                <div key={r.id} className="rounded-xl border-2 border-border bg-card p-3.5 space-y-2.5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className={cn('text-xs font-semibold', getAvatarColor(r.customer))}>
                        {getInitials(r.customer)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate leading-tight">{r.customer}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(r.date)}</p>
                    </div>
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0', info.cls)}>
                      <Icon className="h-3 w-3" /> {info.label}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{r.comment}</p>
                  {r.photos && r.photos.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
                      {r.photos.map((src, i) => (
                        <img key={i} src={src} alt="" loading="lazy"
                          className="h-16 w-16 rounded-md object-cover border shrink-0" />
                      ))}
                    </div>
                  )}
                  {r.reply && (
                    <div className="rounded-md bg-muted/50 border-l-2 border-primary px-2.5 py-1.5">
                      <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-0.5">Resposta do estabelecimento</p>
                      <p className="text-xs text-muted-foreground">{r.reply}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-muted/20 p-4 flex items-center gap-3 text-sm text-muted-foreground">
            <EyeOff className="h-4 w-4 shrink-0" />
            <p>
              Comentários indisponíveis no momento.
              {commentsVis.hiddenReason === 'inactive' && ' A nota em estrelas continua refletindo o desempenho.'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
