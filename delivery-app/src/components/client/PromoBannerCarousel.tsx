import { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useBanners } from '@/data/banners';
import { cn } from '@/lib/utils';

export function PromoBannerCarousel() {
  const all = useBanners();
  const mockBanners = all.filter(b => b.active);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, [
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }),
  ]);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSel = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSel);
    onSel();
    return () => { emblaApi.off('select', onSel); };
  }, [emblaApi]);

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {mockBanners.map(b => (
            <div key={b.id} className="relative flex-[0_0_100%] min-w-0">
              <Link
                to={b.ctaHref}
                className="relative block h-36 sm:h-44 md:h-48 overflow-hidden rounded-2xl border bg-card group"
              >
                <img
                  src={b.image}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className={cn('absolute inset-0 bg-gradient-to-r', b.tone)} />
                <div className="relative h-full flex flex-col justify-center px-5 sm:px-7 max-w-[70%] text-primary-foreground">
                  <h3 className="text-lg sm:text-2xl font-bold leading-tight drop-shadow">{b.title}</h3>
                  <p className="text-xs sm:text-sm mt-1 opacity-90 line-clamp-2 drop-shadow">{b.subtitle}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full bg-background/95 text-foreground text-xs font-semibold px-3 py-1.5 shadow">
                    {b.ctaText} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-1.5 mt-2.5">
        {mockBanners.map((_, i) => (
          <button
            key={i}
            aria-label={`Ir para banner ${i + 1}`}
            onClick={() => emblaApi?.scrollTo(i)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === selected ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
            )}
          />
        ))}
      </div>
    </div>
  );
}
