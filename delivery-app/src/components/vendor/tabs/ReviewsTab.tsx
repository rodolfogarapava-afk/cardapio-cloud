import { useState } from 'react';
import { 
  Star, 
  MessageSquare, 
  Filter, 
  ChevronDown, 
  ThumbsUp, 
  Minus, 
  ThumbsDown,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { mockReviews, ReviewSentiment } from '@/data/mockData';
import { useReviewsVisibility, setReviewsVisibility } from '@/lib/reviewsVisibility';
import { mockStoreSettings } from '@/data/mockData';

// Chave compartilhada com o público (Cardapio). Ver src/lib/reviewsVisibility.ts
const VENDOR_KEY = 'sabor-arte';

// Configuração de sentimentos
const sentimentConfig: Record<ReviewSentiment, { 
  label: string; 
  icon: React.ElementType; 
  color: string;
  bgColor: string;
  starValue: number;
}> = {
  good: { 
    label: 'Bom', 
    icon: ThumbsUp, 
    color: 'text-success', 
    bgColor: 'bg-success/10',
    starValue: 5 
  },
  neutral: { 
    label: 'Neutro', 
    icon: Minus, 
    color: 'text-muted-foreground', 
    bgColor: 'bg-muted',
    starValue: 3 
  },
  bad: { 
    label: 'Ruim', 
    icon: ThumbsDown, 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10',
    starValue: 1 
  },
};

type FilterType = 'pending' | 'all' | 'good' | 'neutral' | 'bad' | 'hidden';

function SentimentBadge({ sentiment }: { sentiment: ReviewSentiment }) {
  const config = sentimentConfig[sentiment];
  const Icon = config.icon;
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
      config.bgColor,
      config.color
    )}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={cn(
            'h-4 w-4',
            s <= rating ? 'fill-warning text-warning' : 'text-muted-foreground/20'
          )}
        />
      ))}
    </div>
  );
}

export function ReviewsTab() {
  const [filter, setFilter] = useState<FilterType>('pending');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const showPublicReviews = useReviewsVisibility(VENDOR_KEY);
  const isStoreActive = !!mockStoreSettings.acceptingOrders;

  // Cálculos com base em Bom/Neutro/Ruim
  const totalReviews = mockReviews.length;
  const goodCount = mockReviews.filter(r => r.sentiment === 'good').length;
  const neutralCount = mockReviews.filter(r => r.sentiment === 'neutral').length;
  const badCount = mockReviews.filter(r => r.sentiment === 'bad').length;
  const pendingCount = mockReviews.filter(r => !r.reply && !r.hidden).length;
  const hiddenCount = mockReviews.filter(r => r.hidden).length;
  const remediatedCount = mockReviews.filter(r => r.remediated).length;

  // Calcula média de estrelas baseado nos sentimentos
  const totalStarValue = mockReviews.reduce((sum, r) => {
    if (r.hidden) return sum;
    return sum + sentimentConfig[r.sentiment].starValue;
  }, 0);
  const visibleReviews = mockReviews.filter(r => !r.hidden).length;
  const avgRating = visibleReviews > 0 ? totalStarValue / visibleReviews : 0;

  // Filtrar reviews
  const filteredReviews = mockReviews.filter(r => {
    switch (filter) {
      case 'pending':
        return !r.reply && !r.hidden;
      case 'good':
        return r.sentiment === 'good' && !r.hidden;
      case 'neutral':
        return r.sentiment === 'neutral' && !r.hidden;
      case 'bad':
        return r.sentiment === 'bad' && !r.hidden;
      case 'hidden':
        return r.hidden;
      case 'all':
      default:
        return !r.hidden;
    }
  });

  const filterLabels: Record<FilterType, string> = {
    pending: `Pendentes (${pendingCount})`,
    all: `Todas (${totalReviews - hiddenCount})`,
    good: `Bom (${goodCount})`,
    neutral: `Neutro (${neutralCount})`,
    bad: `Ruim (${badCount})`,
    hidden: `Ocultas (${hiddenCount})`,
  };

  const handleReply = (reviewId: string) => {
    console.log('Enviando resposta para', reviewId, ':', replyText);
    setReplyingTo(null);
    setReplyText('');
  };

  return (
    <div className="space-y-6">
      {/* Configuração de exibição */}
      <div className="flex items-start justify-between gap-3 p-4 bg-card rounded-xl border">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn(
            "p-2 rounded-lg shrink-0",
            showPublicReviews ? "bg-success/10" : "bg-muted"
          )}>
            {showPublicReviews ? (
              <Eye className="h-5 w-5 text-success" />
            ) : (
              <EyeOff className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <Label htmlFor="public-reviews" className="font-medium cursor-pointer">
              Exibir comentários no perfil público
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              A <strong className="text-foreground font-semibold">nota em estrelas sempre aparece</strong>. Este controle afeta apenas os textos das avaliações.
            </p>
            {!isStoreActive && (
              <p className="text-xs text-warning mt-2">
                Sua loja está inativa; os comentários já estão ocultos publicamente até você reabrir.
              </p>
            )}
          </div>
        </div>
        <Switch
          id="public-reviews"
          checked={showPublicReviews}
          onCheckedChange={v => setReviewsVisibility(VENDOR_KEY, v)}
        />
      </div>


      {/* Resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Nota calculada */}
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-2">Nota Geral</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold">{avgRating.toFixed(1)}</span>
            <RatingStars rating={Math.round(avgRating)} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Baseado em {visibleReviews} avaliações
          </p>
        </div>

        {/* Bom - Clicável */}
        <button
          onClick={() => setFilter(filter === 'good' ? 'pending' : 'good')}
          className={cn(
            "bg-card rounded-xl border p-4 text-left transition-all hover:shadow-md",
            filter === 'good' && "ring-2 ring-success border-success"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-success" />
              <p className="text-xs text-muted-foreground">Bom</p>
            </div>
            {filter === 'good' && (
              <span className="text-[10px] text-success font-medium">✕ Limpar</span>
            )}
          </div>
          <p className="text-2xl font-bold text-success">{goodCount}</p>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-success rounded-full" 
              style={{ width: `${(goodCount / totalReviews) * 100}%` }}
            />
          </div>
        </button>

        {/* Neutro - Clicável */}
        <button
          onClick={() => setFilter(filter === 'neutral' ? 'pending' : 'neutral')}
          className={cn(
            "bg-card rounded-xl border p-4 text-left transition-all hover:shadow-md",
            filter === 'neutral' && "ring-2 ring-muted-foreground border-muted-foreground"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Minus className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Neutro</p>
            </div>
            {filter === 'neutral' && (
              <span className="text-[10px] text-muted-foreground font-medium">✕ Limpar</span>
            )}
          </div>
          <p className="text-2xl font-bold">{neutralCount}</p>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-muted-foreground/50 rounded-full" 
              style={{ width: `${(neutralCount / totalReviews) * 100}%` }}
            />
          </div>
        </button>

        {/* Ruim - Clicável */}
        <button
          onClick={() => setFilter(filter === 'bad' ? 'pending' : 'bad')}
          className={cn(
            "bg-card rounded-xl border p-4 text-left transition-all hover:shadow-md",
            filter === 'bad' && "ring-2 ring-destructive border-destructive"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ThumbsDown className="h-4 w-4 text-destructive" />
              <p className="text-xs text-muted-foreground">Ruim</p>
            </div>
            {filter === 'bad' && (
              <span className="text-[10px] text-destructive font-medium">✕ Limpar</span>
            )}
          </div>
          <p className="text-2xl font-bold text-destructive">{badCount}</p>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-destructive rounded-full" 
              style={{ width: `${(badCount / totalReviews) * 100}%` }}
            />
          </div>
        </button>
      </div>

      {/* Filtro */}
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              {filter === 'pending' ? 'Pendentes' : filter === 'all' ? 'Todas' : filter === 'hidden' ? 'Ocultas' : 'Filtrar'}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44 bg-popover border shadow-md z-50">
            <DropdownMenuItem 
              onClick={() => setFilter('pending')}
              className={filter === 'pending' ? 'bg-accent' : ''}
            >
              Pendentes ({pendingCount})
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-accent' : ''}
            >
              Todas ({totalReviews - hiddenCount})
            </DropdownMenuItem>
            {hiddenCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setFilter('hidden')}
                  className={filter === 'hidden' ? 'bg-accent' : ''}
                >
                  Ocultas ({hiddenCount})
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Lista de avaliações */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="bg-card rounded-xl border p-8 text-center">
            <p className="text-muted-foreground">
              {filter === 'pending' 
                ? 'Nenhuma avaliação pendente de resposta 🎉'
                : 'Nenhuma avaliação encontrada'
              }
            </p>
          </div>
        ) : (
          filteredReviews.map(review => (
            <div 
              key={review.id} 
              className={cn(
                "bg-card rounded-xl border p-4",
                review.hidden && "opacity-60",
                review.remediated && "border-l-4 border-l-info"
              )}
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-muted text-sm font-medium">
                    {review.customer.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{review.customer}</span>
                    <SentimentBadge sentiment={review.sentiment} />
                    {!review.reply && !review.hidden && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">
                        Aguardando resposta
                      </span>
                    )}
                    {review.remediated && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-info/10 text-info font-medium">
                        Remediada
                      </span>
                    )}
                    {review.hidden && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                        Oculta
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(review.date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                    {' • '}
                    Pedido #{review.orderId}
                  </p>
                </div>

                {/* Menu de ações */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {review.hidden ? (
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        Tornar visível
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem>
                        <EyeOff className="mr-2 h-4 w-4" />
                        Ocultar avaliação
                      </DropdownMenuItem>
                    )}
                    {review.sentiment === 'bad' && !review.remediated && (
                      <DropdownMenuItem>
                        <CheckCircle2 className="mr-2 h-4 w-4 text-info" />
                        Marcar como remediada
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Comentário */}
              <p className="text-sm text-foreground mb-3 leading-relaxed">
                "{review.comment}"
              </p>

              {/* Resposta existente */}
              {review.reply && (
                <div className={cn(
                  "rounded-lg p-3 mb-3 border-l-2",
                  review.remediated ? "bg-info/5 border-l-info" : "bg-muted/50 border-l-primary"
                )}>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {review.remediated ? 'Resposta (remediação):' : 'Sua resposta:'}
                  </p>
                  <p className="text-sm">{review.reply}</p>
                </div>
              )}

              {/* Área de resposta */}
              {replyingTo === review.id ? (
                <div className="space-y-3">
                  <Textarea
                    placeholder={
                      review.sentiment === 'bad' 
                        ? "Escreva sua resposta para remediar a situação..."
                        : "Escreva sua resposta..."
                    }
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  {review.sentiment === 'bad' && (
                    <p className="text-xs text-muted-foreground">
                      💡 Dica: Ao responder avaliações negativas, você pode marcar como "remediada" após resolver o problema.
                    </p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText('');
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      disabled={!replyText.trim()}
                      onClick={() => handleReply(review.id)}
                    >
                      Enviar Resposta
                    </Button>
                  </div>
                </div>
              ) : (
                !review.reply && !review.hidden && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setReplyingTo(review.id)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Responder
                  </Button>
                )
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
