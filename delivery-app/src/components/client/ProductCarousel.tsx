import { useCallback, useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProductCarouselProps {
  products: Product[];
  categoryName?: string;
  onAddToCart: (product: Product) => void;
  className?: string;
  showFeaturedBadge?: boolean;
}

export function ProductCarousel({ products, categoryName, onAddToCart, className, showFeaturedBadge = true }: ProductCarouselProps) {
  const isMobile = useIsMobile();
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);
  
  // Plugin de autoplay com useRef para manter referência estável
  const autoplayRef = useRef(
    Autoplay({
      delay: 3000,
      stopOnInteraction: true,
      stopOnMouseEnter: true,
      playOnInit: true,
    })
  );

  // Só faz sentido autoplay se houver mais de 1 produto
  const canAutoplay = isMobile && products.length > 1;

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: 'start',
      containScroll: 'trimSnaps',
      dragFree: false,
      loop: products.length > 2,
    },
    canAutoplay ? [autoplayRef.current] : []
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    const onReInit = () => setSnapCount(emblaApi.scrollSnapList().length);
    onReInit();
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onReInit);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onReInit);
    };
  }, [emblaApi, products.length]);


  // Garante que o autoplay inicia mesmo após reInit
  useEffect(() => {
    if (!emblaApi || !canAutoplay) return;
    const autoplay = autoplayRef.current;
    // Pequeno delay para garantir que o Embla finalizou a montagem
    const timer = setTimeout(() => {
      if (!isAutoplayPaused) autoplay.play();
    }, 100);
    return () => clearTimeout(timer);
  }, [emblaApi, canAutoplay, isAutoplayPaused, products.length]);

  // Detecta interação do usuário para pausar permanentemente
  useEffect(() => {
    if (!emblaApi || !canAutoplay) return;

    const onPointerDown = () => {
      setIsAutoplayPaused(true);
      autoplayRef.current.stop();
    };

    emblaApi.on('pointerDown', onPointerDown);

    return () => {
      emblaApi.off('pointerDown', onPointerDown);
    };
  }, [emblaApi, isMobile]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (products.length === 0) return null;

  return (
    <div className={cn('relative', className)}>
      {/* Header da categoria */}
      {categoryName && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="h-6 w-1 rounded-full bg-warning" />
            <h2 className="text-lg font-bold text-foreground">{categoryName}</h2>
          </div>
          <div className="hidden sm:flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={scrollPrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={scrollNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Carrossel */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ml-3 sm:-ml-4 flex">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex-[0_0_100%] min-w-0 pl-3 sm:flex-[0_0_50%] sm:pl-4 lg:flex-[0_0_33.3333%]"
            >
              <ProductCarouselCard product={product} onAddToCart={onAddToCart} showFeaturedBadge={showFeaturedBadge} />
            </div>
          ))}
        </div>
      </div>

      {/* Bullets de progresso (apenas quando há mais de um snap) */}
      {snapCount > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: snapCount }).map((_, i) => (
            <button
              key={i}
              aria-label={`Ir para slide ${i + 1}`}
              onClick={() => emblaApi?.scrollTo(i)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === selectedIndex
                  ? 'w-5 bg-primary'
                  : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
            />
          ))}
        </div>
      )}

    </div>
  );
}

interface ProductCarouselCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  showFeaturedBadge?: boolean;
}

export function ProductCarouselCard({ product, onAddToCart, showFeaturedBadge = true }: ProductCarouselCardProps) {
  const { name, description, price, originalPrice, image, available, featured, ageRestricted } = product;
  const hasOffer = typeof originalPrice === 'number' && originalPrice > price;


  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'group relative rounded-xl border bg-card overflow-hidden transition-all hover:shadow-lg hover:border-primary/20 cursor-pointer',
        !available && 'opacity-50 pointer-events-none'
      )}
      onClick={() => available && onAddToCart(product)}
    >
      {/* Imagem grande como destaque */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {image?.startsWith('http') ? (
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : image ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <span className="text-6xl">{image}</span>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <span className="text-6xl">🍽️</span>
          </div>
        )}

        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Badges topo */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {!available && (
            <Badge variant="secondary" className="text-xs font-medium bg-muted/90 text-muted-foreground">
              Indisponível
            </Badge>
          )}
          {featured && showFeaturedBadge && (
            <Badge className="text-[10px] font-bold bg-warning text-warning-foreground border-transparent">
              ★ Destaque
            </Badge>
          )}
          {ageRestricted && (
            <Badge className="text-[10px] font-bold bg-destructive text-destructive-foreground border-transparent">
              +18
            </Badge>
          )}
        </div>

        {/* Botão de adicionar */}
        {available && (
          <div className="absolute bottom-3 right-3">
            <Button
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg bg-primary hover:bg-primary/90"
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(product);
              }}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Preço sobre a imagem */}
        <div className="absolute bottom-3 left-3 flex items-baseline gap-2">
          <span className="text-lg font-bold text-white drop-shadow-md">
            R$ {price.toFixed(2).replace('.', ',')}
          </span>
          {hasOffer && (
            <span className="text-xs text-white/70 line-through drop-shadow">
              R$ {originalPrice!.toFixed(2).replace('.', ',')}
            </span>
          )}
        </div>
      </div>


      {/* Conteúdo textual */}
      <div className="p-3">
        <h4 className="font-semibold text-foreground line-clamp-1 leading-tight">
          {name}
        </h4>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </motion.div>
  );
}
