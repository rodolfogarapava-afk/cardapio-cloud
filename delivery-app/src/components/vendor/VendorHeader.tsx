import { Bell, LogOut, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { mockStoreSettings, mockStats } from '@/data/mockData';

export function VendorHeader() {
  return (
    <header className="sticky top-0 z-50 bg-card border-b">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
              <Store className="w-4 h-4 text-background" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-semibold text-sm">{mockStoreSettings.name}</h1>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${mockStoreSettings.acceptingOrders ? 'bg-success' : 'bg-destructive'}`} />
                <span className="text-xs text-muted-foreground">
                  {mockStoreSettings.acceptingOrders ? 'Aberta' : 'Fechada'}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Hoje: </span>
              <span className="font-semibold">{mockStats.todayOrders} pedidos</span>
            </div>
            <div>
              <span className="font-semibold text-success">R$ {mockStats.todayRevenue.toLocaleString('pt-BR')}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  <Bell className="h-4 w-4" />
                  {mockStats.pendingOrders > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-foreground text-[10px] font-medium flex items-center justify-center text-background">
                      {mockStats.pendingOrders}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <div className="p-2 border-b">
                  <p className="font-medium text-sm">Notificações</p>
                </div>
                <DropdownMenuItem className="p-3">
                  <div>
                    <p className="text-sm font-medium">Novo pedido</p>
                    <p className="text-xs text-muted-foreground">ORD-001 • R$ 58,90</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ThemeToggle className="h-9 w-9 border-0 bg-transparent hover:bg-accent" />


            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
