import { Clock, Star } from 'lucide-react';
import { Restaurant } from '@/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

export type ViewMode = 'grid' | 'list';

interface RestaurantCardProps {
  restaurant: Restaurant;
  className?: string;
  viewMode?: ViewMode;
}

function LogoMark({ logo, name, size }: { logo?: string; name: string; size: 'lg' | 'sm' }) {
  const dim = size === 'lg' ? 'h-24 w-24 text-4xl' : 'h-16 w-16 text-2xl';
  const isUrl = logo?.startsWith('http');
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full overflow-hidden bg-background border shadow-sm',
        dim
      )}
    >
      {isUrl ? (
        <img src={logo} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span>{logo || '🍽️'}</span>
      )}
    </div>
  );
}

export function RestaurantCard({ restaurant, className, viewMode = 'grid' }: RestaurantCardProps) {
  const {
    slug,
    name,
    logo,
    banner,
    category,
    rating,
    reviewCount,
    deliveryTime,
    deliveryFee,
    isOpen,
  } = restaurant;

  const isGrid = viewMode === 'grid';
  const isFreeDelivery = deliveryFee === 0;
  const isTopOrdered = reviewCount >= 400;
  const isNew = reviewCount < 230;


  return (
    <motion.div
      whileHover={{ y: isGrid ? -4 : -2, scale: isGrid ? 1.01 : 1.005 }}
      transition={{ duration: 0.2 }}
      layout
    >
      <a
        href={slug === 'proveu-espeto' ? '/cardapaio1/sabor-arte' : `/cardapaio1/${slug}`}
        target="_top"
        className={cn(
          'group block rounded-xl border bg-card overflow-hidden transition-all hover:shadow-lg hover:border-primary/20',
          !isOpen && 'opacity-70 grayscale-[30%]',
          !isGrid && 'flex items-center gap-3 p-3',
          className
        )}
      >
        {isGrid ? (
          <>
            {/* Hero com logo centralizada sobre banner (se houver) */}
            <div className="relative flex items-center justify-center min-h-[140px] py-8 overflow-hidden bg-gradient-to-br from-muted/60 to-muted/20">
              {banner && (
                <>
                  <img
                    src={banner}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/40 to-background/10" />
                </>
              )}
              <div className="relative z-10">
                <LogoMark logo={logo} name={name} size="lg" />
              </div>
              {!isOpen && (
                <div className="absolute top-3 left-3 z-10">
                  <Badge variant="secondary" className="text-xs font-medium shadow-sm bg-muted text-muted-foreground">
                    <span className="mr-1 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    Fechado
                  </Badge>
                </div>
              )}
              {/* Selos */}
              <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
                {isTopOrdered && (
                  <Badge className="text-[10px] font-semibold shadow-sm bg-warning text-warning-foreground px-1.5 py-0.5">
                    Mais pedido
                  </Badge>
                )}
                {isNew && (
                  <Badge className="text-[10px] font-semibold shadow-sm bg-info text-info-foreground px-1.5 py-0.5">
                    Novo
                  </Badge>
                )}
                {isFreeDelivery && isOpen && (
                  <Badge className="text-[10px] font-semibold shadow-sm bg-success text-success-foreground px-1.5 py-0.5">
                    Entrega grátis
                  </Badge>
                )}
              </div>
            </div>

            {/* Nome destacado + meta */}
            <div className="p-4 space-y-2 text-center">
              <h3 className="font-bold text-foreground text-lg sm:text-xl leading-tight line-clamp-1">
                {name}
              </h3>
              <div className="flex items-center justify-center gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="fill-warning text-warning h-4 w-4" />
                  <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({reviewCount})</span>
                </div>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground truncate">{category}</span>
              </div>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{deliveryTime}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <LogoMark logo={logo} name={name} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-bold text-foreground text-base leading-tight line-clamp-1">
                  {name}
                </h3>
                {!isOpen && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground shrink-0">
                    Fechado
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs mt-0.5">
                <div className="flex items-center gap-1">
                  <Star className="fill-warning text-warning h-3 w-3" />
                  <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({reviewCount})</span>
                </div>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground truncate">{category}</span>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{deliveryTime}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </a>
    </motion.div>
  );
}
