import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BottomNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
  hidden?: boolean;
}

interface MobileBottomNavProps {
  items: BottomNavItem[];
}

export function MobileBottomNav({ items }: MobileBottomNavProps) {
  const visible = items.filter(i => !i.hidden);
  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação principal"
    >
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }}
      >
        {visible.map(item => {
          const Icon = item.icon;
          return (
            <li key={item.key} className="relative">
              <button
                type="button"
                onClick={item.onClick}
                className={cn(
                  'w-full flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  item.active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-current={item.active ? 'page' : undefined}
              >
                {item.active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary" />
                )}
                <Icon className="h-5 w-5" />
                <span className="leading-none">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
