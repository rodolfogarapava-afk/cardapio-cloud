import { ReactNode, useState } from 'react';
import { LucideIcon, Menu, LogOut, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { cn } from '@/lib/utils';

export interface PanelTab {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
}

export interface PanelBrand {
  title: string;
  subtitle?: string;
  status?: 'active' | 'inactive' | 'neutral';
  statusLabel?: string;
  icon: LucideIcon;
}

interface PanelShellProps {
  brand: PanelBrand;
  tabs: PanelTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  title?: string;
  headerRight?: ReactNode;
  headerCenter?: ReactNode;
  onLogout: () => void;
  contentMaxWidth?: string;
  children: ReactNode;
}

/**
 * PanelShell — casca compartilhada por Provider, Vendor e Admin.
 * Sidebar colapsável (desktop) + Sheet (mobile) + header sticky.
 */
export function PanelShell({
  brand, tabs, activeTab, onTabChange, title, headerRight, headerCenter,
  onLogout, contentMaxWidth = 'max-w-6xl', children,
}: PanelShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const BrandIcon = brand.icon;
  const statusDot = brand.status === 'active' ? 'bg-success'
    : brand.status === 'inactive' ? 'bg-destructive'
    : 'bg-muted-foreground';

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => {
    const compact = sidebarCollapsed && !mobile;
    return (
      <div className="flex flex-col h-full">
        <div className={cn('flex items-center gap-3 p-4 border-b', compact && 'justify-center')}>
          <div className="w-9 h-9 rounded-lg bg-foreground flex items-center justify-center shrink-0">
            <BrandIcon className="w-5 h-5 text-background" />
          </div>
          {!compact && (
            <div className="min-w-0">
              <h1 className="font-semibold text-sm truncate">{brand.title}</h1>
              {brand.status ? (
                <div className="flex items-center gap-1.5">
                  <span className={cn('w-1.5 h-1.5 rounded-full', statusDot)} />
                  <span className="text-xs text-muted-foreground truncate">
                    {brand.statusLabel ?? (brand.status === 'active' ? 'Ativo' : 'Inativo')}
                  </span>
                </div>
              ) : brand.subtitle ? (
                <p className="text-xs text-muted-foreground truncate">{brand.subtitle}</p>
              ) : null}
            </div>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { onTabChange(tab.id); if (mobile) setSidebarOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  compact && 'justify-center px-2',
                )}
                title={compact ? tab.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!compact && <span className="flex-1 text-left">{tab.label}</span>}
                {!compact && tab.badge != null && tab.badge !== 0 && (
                  <span className={cn(
                    'text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center tabular-nums',
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-warning/15 text-warning',
                  )}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className={cn('p-4 border-t', compact && 'flex justify-center')}>
          <Button
            variant="ghost"
            size={compact ? 'icon' : 'sm'}
            className={cn('text-muted-foreground hover:text-destructive', !compact && 'w-full justify-start gap-2')}
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
            {!compact && <span>Sair</span>}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col border-r bg-card transition-all duration-300 relative',
        sidebarCollapsed ? 'w-16' : 'w-64',
      )}>
        <SidebarContent />
        <button
          onClick={() => setSidebarCollapsed(v => !v)}
          className="absolute bottom-20 -right-3 w-6 h-6 rounded-full border bg-background flex items-center justify-center hover:bg-muted transition-colors z-10"
          aria-label={sidebarCollapsed ? 'Expandir menu' : 'Colapsar menu'}
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
        </button>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <SidebarContent mobile />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center justify-between h-14 px-4 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold truncate">
                {title ?? tabs.find(t => t.id === activeTab)?.label}
              </h2>
            </div>
            {headerCenter && <div className="hidden md:flex flex-1 justify-center">{headerCenter}</div>}
            <div className="flex items-center gap-2 shrink-0">
              {headerRight}
              <ThemeToggle className="h-9 w-9" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className={cn(contentMaxWidth, 'mx-auto')}>{children}</div>
        </main>
      </div>
    </div>
  );
}
