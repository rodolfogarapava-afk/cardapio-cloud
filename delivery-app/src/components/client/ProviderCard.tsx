import { Link } from 'react-router-dom';
import { Star, MapPin, BadgeCheck, Calendar } from 'lucide-react';
import { nextAvailableSlot } from '@/data/bookings';

import { ServiceProvider } from '@/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { serviceCategories } from '@/data/serviceProviders';
import { formatPriceSuffix } from '@/lib/priceUnit';

export type ProviderViewMode = 'grid' | 'list';

interface Props {
  provider: ServiceProvider;
  viewMode?: ProviderViewMode;
  distanceKm?: number;
  className?: string;
}

function Logo({ logo, name, size }: { logo: string; name: string; size: 'lg' | 'sm' }) {
  const dim = size === 'lg' ? 'h-24 w-24 text-4xl' : 'h-16 w-16 text-2xl';
  return (
    <div className={cn('flex shrink-0 items-center justify-center rounded-full overflow-hidden bg-background border shadow-sm', dim)}>
      <img src={logo} alt={name} className="h-full w-full object-cover" loading="lazy" />
    </div>
  );
}

function TypeBadge({ type }: { type: ServiceProvider['type'] }) {
  return (
    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground shrink-0">
      {type === 'company' ? 'Empresa' : 'Autônomo'}
    </Badge>
  );
}

export function ProviderCard({ provider, viewMode = 'grid', distanceKm, className }: Props) {
  const { slug, name, logo, banner, categories, rating, reviewCount, priceRange, serviceArea, verified, isActive } = provider;
  const isGrid = viewMode === 'grid';
  const catNames = categories.map(c => serviceCategories.find(sc => sc.id === c)?.name).filter(Boolean).slice(0, 2).join(' • ');
  const unitLabel = formatPriceSuffix(priceRange.unit);
  const priceLabel = `R$ ${priceRange.min}${priceRange.max ? `–${priceRange.max}` : ''}${unitLabel}`;
  const next = nextAvailableSlot(provider);
  const nextLabel = next
    ? next.isToday
      ? `Próx. horário: hoje ${next.slot}`
      : `Próx. horário: ${next.date.split('-').reverse().slice(0,2).join('/')} ${next.slot}`
    : null;



  return (
    <motion.div whileHover={{ y: isGrid ? -4 : -2, scale: isGrid ? 1.01 : 1.005 }} transition={{ duration: 0.2 }} layout>
      <Link
        to={`/servicos/${slug}`}
        className={cn(
          'group rounded-xl border bg-card overflow-hidden transition-all hover:shadow-lg hover:border-primary/20',
          isGrid ? 'flex flex-col h-full' : 'block flex items-center gap-3 p-3',
          !isActive && 'opacity-70 grayscale-[30%]',
          className,
        )}
      >
        {isGrid ? (
          <>
            <div className="relative flex shrink-0 items-center justify-center min-h-[140px] py-8 overflow-hidden bg-gradient-to-br from-muted/60 to-muted/20">
              {banner && (
                <>
                  <img src={banner} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/40 to-background/10" />
                </>
              )}
              <div className="relative z-10">
                <Logo logo={logo} name={name} size="lg" />
              </div>
              <div className="absolute top-3 left-3 z-10 flex gap-1.5">
                <TypeBadge type={provider.type} />
                {verified && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-success/10 text-success">
                    <BadgeCheck className="h-3 w-3 mr-0.5" />
                    Verificado
                  </Badge>
                )}
              </div>
              <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
                {reviewCount >= 80 && (
                  <Badge className="text-[10px] font-semibold shadow-sm bg-warning text-warning-foreground px-1.5 py-0.5">
                    Mais contratado
                  </Badge>
                )}

                {reviewCount < 30 && (
                  <Badge className="text-[10px] font-semibold shadow-sm bg-info text-info-foreground px-1.5 py-0.5">
                    Novo
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex-1 flex flex-col p-4 space-y-2 text-center">
              <h3 className="font-bold text-foreground text-lg sm:text-xl leading-tight line-clamp-1">{name}</h3>
              <div className="flex items-center justify-center gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="fill-warning text-warning h-4 w-4" />
                  <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({reviewCount})</span>
                </div>
                {catNames && <><span className="text-muted-foreground">•</span><span className="text-muted-foreground truncate">{catNames}</span></>}
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{priceLabel}</span>
                <span>•</span>
                <MapPin className="h-3 w-3" />
                <span>{distanceKm != null ? `${distanceKm} km` : serviceArea.city}</span>
              </div>
              <div className={cn(
                "inline-flex items-center justify-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 mx-auto mt-auto",
                nextLabel ? "text-success bg-success/10" : "invisible"
              )}>
                <Calendar className="h-3 w-3" />
                <span>{nextLabel || 'Próx. horário: --'}</span>
              </div>
            </div>
          </>

        ) : (
          <>
            <Logo logo={logo} name={name} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-bold text-foreground text-base leading-tight line-clamp-1">{name}</h3>
                <TypeBadge type={provider.type} />
                {verified && <BadgeCheck className="h-4 w-4 text-success shrink-0" />}
              </div>
              <div className="flex items-center gap-2 text-xs mt-0.5">
                <div className="flex items-center gap-1">
                  <Star className="fill-warning text-warning h-3 w-3" />
                  <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({reviewCount})</span>
                </div>
                {catNames && <><span className="text-muted-foreground">•</span><span className="text-muted-foreground truncate">{catNames}</span></>}
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{priceLabel}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3" />
                <span>{distanceKm != null ? `${distanceKm} km` : serviceArea.city}</span>
                {nextLabel && (
                  <>
                    <span>•</span>
                    <Calendar className="h-3 w-3 text-success" />
                    <span className="text-success font-medium truncate">{nextLabel}</span>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </Link>
    </motion.div>
  );
}

