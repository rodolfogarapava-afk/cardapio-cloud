import { useState } from 'react';
import { Star, MessageSquare, Eye, EyeOff, Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ServiceProvider, ServiceReview } from '@/types';
import { mockProviderReviews } from '@/data/serviceProviders';
import { SectionCard } from '../SectionCard';
import { useReviewsVisibility, setReviewsVisibility } from '@/lib/reviewsVisibility';
import { cn } from '@/lib/utils';

interface Props { provider: ServiceProvider; }

export function ReviewsProviderTab({ provider }: Props) {
  const [reviews, setReviews] = useState<ServiceReview[]>(mockProviderReviews.filter(r => r.providerId === provider.id));
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const showComments = useReviewsVisibility(provider.id);

  const submitReply = (id: string) => {
    const text = replyDraft[id]?.trim();
    if (!text) return;
    setReviews(prev => prev.map(r => r.id === id ? { ...r, reply: text } : r));
    setReplyDraft(prev => ({ ...prev, [id]: '' }));
  };

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const pending = reviews.filter(r => !r.reply).length;

  return (
    <div className="space-y-5">
      {/* Controle de exibição pública */}
      <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          showComments ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
        )}>
          {showComments ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <Label htmlFor="pub-comments" className="font-medium cursor-pointer">
            Exibir comentários no meu perfil público
          </Label>
          <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            A <strong className="font-semibold text-foreground">nota em estrelas continua sempre visível</strong> — este controle afeta apenas os textos das avaliações.
          </p>
          {!provider.isActive && (
            <p className="text-xs text-warning mt-2">
              Seu perfil está inativo, então os comentários já estão ocultos no público até você reativar.
            </p>
          )}
        </div>
        <Switch
          id="pub-comments"
          checked={showComments}
          onCheckedChange={v => setReviewsVisibility(provider.id, v)}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Nota média</p>
          <p className="text-2xl font-bold text-warning tabular-nums mt-1 flex items-center gap-1.5">
            {avg.toFixed(1)} <Star className="h-4 w-4 fill-warning text-warning" />
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{reviews.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Aguardando resposta</p>
          <p className={`text-2xl font-bold tabular-nums mt-1 ${pending > 0 ? 'text-warning' : 'text-success'}`}>{pending}</p>
        </div>
      </div>

      <SectionCard icon={MessageSquare} title="Avaliações dos clientes" accent="warning" subtitle={`${reviews.length} avaliações públicas`}>
        {reviews.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/20">
            <Star className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-medium">Nenhuma avaliação ainda</p>
            <p className="text-xs text-muted-foreground mt-1">Assim que um cliente avaliar, você poderá responder por aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="rounded-lg border p-4 bg-background hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{r.customerName}</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{r.comment}</p>
                {r.reply ? (
                  <div className="mt-3 bg-primary/5 border-l-2 border-primary rounded-r-md p-3">
                    <p className="text-xs font-semibold text-primary mb-0.5">Sua resposta</p>
                    <p className="text-sm text-muted-foreground">{r.reply}</p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <Textarea rows={2} placeholder="Responder publicamente..." value={replyDraft[r.id] || ''} onChange={e => setReplyDraft(p => ({ ...p, [r.id]: e.target.value }))} />
                    <Button size="sm" onClick={() => submitReply(r.id)}>Responder</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
