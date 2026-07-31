import { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { ProductCategory } from '@/types';
import { cn } from '@/lib/utils';

interface CategoryNavProps {
  categories: ProductCategory[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  className?: string;
}

export function CategoryNav({
  categories,
  activeCategory,
  onCategoryChange,
  className,
}: CategoryNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll para categoria ativa quando mudar
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const active = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();

      // Se o botão ativo não está visível, faz scroll
      if (activeRect.left < containerRect.left || activeRect.right > containerRect.right) {
        active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeCategory]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex gap-2 overflow-x-auto scrollbar-hide py-2',
        className
      )}
    >
      {categories.map(category => {
        const isActive = activeCategory === category.id;
        return (
          <button
            key={category.id}
            ref={isActive ? activeRef : null}
            onClick={() => onCategoryChange(isActive ? '' : category.id)}
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <span>{category.name}</span>
            {isActive && (
              <X className="h-3.5 w-3.5 opacity-90" aria-label="Limpar filtro" />
            )}
          </button>
        );
      })}
    </div>
  );
}
