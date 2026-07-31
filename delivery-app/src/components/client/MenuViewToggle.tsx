import { List, GalleryHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type MenuViewMode = 'list' | 'carousel';

interface MenuViewToggleProps {
  viewMode: MenuViewMode;
  onViewModeChange: (mode: MenuViewMode) => void;
  className?: string;
}

export function MenuViewToggle({ viewMode, onViewModeChange, className }: MenuViewToggleProps) {
  return (
    <div className={cn('flex items-center gap-1 p-1 rounded-lg bg-muted/50', className)}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-7 w-7 rounded-md transition-colors',
          viewMode === 'list' && 'bg-background shadow-sm text-primary'
        )}
        onClick={() => onViewModeChange('list')}
        title="Visualização em lista"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-7 w-7 rounded-md transition-colors',
          viewMode === 'carousel' && 'bg-background shadow-sm text-primary'
        )}
        onClick={() => onViewModeChange('carousel')}
        title="Visualização em galeria"
      >
        <GalleryHorizontal className="h-4 w-4" />
      </Button>
    </div>
  );
}
