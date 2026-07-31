import { useNavigate, useLocation } from 'react-router-dom';
import { UtensilsCrossed, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

type Vertical = 'products' | 'services';

interface Props {
  className?: string;
  size?: 'sm' | 'md';
}

export function VerticalSwitcher({ className, size = 'md' }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active: Vertical = pathname.startsWith('/servicos') ? 'services' : 'products';

  const go = (v: Vertical) => {
    if (v === active) return;
    navigate(v === 'services' ? '/servicos' : '/');
  };

  const items: { key: Vertical; label: string; icon: typeof Wrench }[] = [
    { key: 'products', label: 'Produtos', icon: UtensilsCrossed },
    { key: 'services', label: 'Serviços', icon: Wrench },
  ];

  return (
    <div
      role="tablist"
      aria-label="Alternar vertical"
      className={cn(
        'inline-flex items-center rounded-full border bg-muted/60 p-1',
        size === 'sm' ? 'gap-0.5' : 'gap-1',
        className,
      )}
    >
      {items.map(it => {
        const Icon = it.icon;
        const isActive = active === it.key;
        return (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => go(it.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full font-medium transition-all',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            <span>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
