import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BarChart3, Truck, Package, Ticket, MapPin, Star, Settings,
  LogOut, Store, Bell, Receipt, ChefHat,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardTab } from './tabs/DashboardTab';
import { ReportsTab } from './tabs/ReportsTab';
import { DriversTab } from './tabs/DriversTab';
import { StockTab } from './tabs/StockTab';
import { CouponsTab } from './tabs/CouponsTab';
import { ShippingTab } from './tabs/ShippingTab';
import { ReviewsTab } from './tabs/ReviewsTab';
import { SettingsTab } from './tabs/SettingsTab';
import { ReceiptsTab } from './tabs/ReceiptsTab';
import { mockStoreSettings, mockStats } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { PanelShell, type PanelTab } from '@/components/common/PanelShell';

const tabs: PanelTab[] = [
  { id: 'dashboard', label: 'Demanda', icon: LayoutDashboard },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'drivers', label: 'Entregadores', icon: Truck },
  { id: 'stock', label: 'Estoque', icon: Package },
  { id: 'receipts', label: 'Recibos', icon: Receipt },
  { id: 'coupons', label: 'Cupons', icon: Ticket },
  { id: 'shipping', label: 'Frete', icon: MapPin },
  { id: 'reviews', label: 'Avaliações', icon: Star },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

const tabComponents: Record<string, React.ComponentType> = {
  dashboard: DashboardTab,
  reports: ReportsTab,
  drivers: DriversTab,
  stock: StockTab,
  receipts: ReceiptsTab,
  coupons: CouponsTab,
  shipping: ShippingTab,
  reviews: ReviewsTab,
  settings: SettingsTab,
};

export function VendorPanel() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { logout } = useAuth();
  const navigate = useNavigate();
  const ActiveComponent = tabComponents[activeTab];

  const handleLogout = () => { logout(); navigate('/'); };

  const headerCenter = (
    <div className="flex items-center gap-6 text-sm">
      <div>
        <span className="text-muted-foreground">Hoje: </span>
        <span className="font-semibold tabular-nums">{mockStats.todayOrders} pedidos</span>
      </div>
      <div>
        <span className="font-semibold text-success tabular-nums">
          R$ {mockStats.todayRevenue.toLocaleString('pt-BR')}
        </span>
      </div>
    </div>
  );

  const headerRight = (
    <>
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
        {mockStats.pendingOrders > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium flex items-center justify-center text-destructive-foreground tabular-nums">
            {mockStats.pendingOrders}
          </span>
        )}
      </Button>
      <Link to="/vendor/cozinha">
        <Button variant="default" size="sm" className="gap-2">
          <ChefHat className="h-4 w-4" />
          <span className="hidden sm:inline">Cozinha</span>
        </Button>
      </Link>
      <Link to="/">
        <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
          <Store className="h-4 w-4" />
          Ver Loja
        </Button>
      </Link>
    </>
  );

  return (
    <PanelShell
      brand={{
        icon: Store,
        title: mockStoreSettings.name,
        status: mockStoreSettings.acceptingOrders ? 'active' : 'inactive',
        statusLabel: mockStoreSettings.acceptingOrders ? 'Aberta' : 'Fechada',
      }}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerCenter={headerCenter}
      headerRight={headerRight}
      onLogout={handleLogout}
    >
      <ActiveComponent />
    </PanelShell>
  );
}
