import { forwardRef } from 'react';
import { Plus } from 'lucide-react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  className?: string;
}

export const ProductCard = forwardRef<HTMLDivElement, ProductCardProps>(
  function ProductCard({ product, onAddToCart, className }, ref) {
    const { name, description, price, originalPrice, image, available, featured, ageRestricted } = product;
    const hasOffer = typeof originalPrice === 'number' && originalPrice > price;

    return (
      <motion.div
        ref={ref}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          'group relative flex gap-4 rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/20 cursor-pointer',
          !available && 'opacity-50 pointer-events-none',
          className
        )}
        onClick={() => available && onAddToCart(product)}
      >
        {/* Conteúdo textual */}
        <div className="flex flex-1 flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start gap-1.5 flex-wrap">
              <h4 className="font-semibold text-foreground line-clamp-2 leading-tight flex-1 min-w-0">
                {name}
              </h4>
              {featured && (
                <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide bg-warning/15 text-warning px-1.5 py-0.5 rounded">
                  ★ Destaque
                </span>
              )}
              {ageRestricted && (
                <span className="shrink-0 inline-flex items-center text-[10px] font-bold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                  +18
                </span>
              )}
            </div>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {description}
              </p>
            )}
          </div>


          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-lg font-bold text-primary">
                R$ {price.toFixed(2).replace('.', ',')}
              </span>
              {hasOffer && (
                <span className="text-xs text-muted-foreground line-through">
                  R$ {originalPrice!.toFixed(2).replace('.', ',')}
                </span>
              )}
            </div>

            {!available && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                Indisponível
              </span>
            )}
          </div>
        </div>

        {/* Imagem com maior destaque */}
        {image && (
          <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-xl bg-muted overflow-hidden shadow-sm">
            {image.startsWith('http') ? (
              <img 
                src={image} 
                alt={name} 
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" 
                loading="lazy"
              />
            ) : (
              <span className="text-4xl">{image}</span>
            )}
            
            {/* Botão de adicionar sobre a imagem */}
            {available && (
              <div className="absolute -bottom-1 -right-1">
                <Button
                  size="icon"
                  className="h-8 w-8 rounded-full shadow-lg bg-primary hover:bg-primary/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(product);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Sem imagem - botão alternativo */}
        {!image && available && (
          <Button
            size="icon"
            className="absolute bottom-4 right-4 h-8 w-8 rounded-full shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </motion.div>
    );
  }
);
