import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Image as ImageIcon, Calendar, MapPin, Star, BarChart3, Store, ShieldCheck, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { mockProviders } from '@/data/serviceProviders';
import { ProfileTab } from './tabs/ProfileTab';
import { GalleryTab } from './tabs/GalleryTab';
import { AgendaTab } from './tabs/AgendaTab';
import { AtendimentosTab } from './tabs/AtendimentosTab';
import { ServiceAreaTab } from './tabs/ServiceAreaTab';
import { ReviewsProviderTab } from './tabs/ReviewsProviderTab';
import { PerformanceTab } from './tabs/PerformanceTab';
import { VerificationTab } from './tabs/VerificationTab';
import { ServiceProvider } from '@/types';
import { PanelShell, type PanelTab } from '@/components/common/PanelShell';

const tabs: PanelTab[] = [
  { id: 'profile', label: 'Meu Perfil', icon: User },
  { id: 'atendimentos', label: 'Atendimentos', icon: ClipboardList },
  { id: 'gallery', label: 'Galeria', icon: ImageIcon },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'area', label: 'Área de Atendimento', icon: MapPin },
  { id: 'reviews', label: 'Avaliações', icon: Star },
  { id: 'verification', label: 'Verificação', icon: ShieldCheck },
  { id: 'performance', label: 'Desempenho', icon: BarChart3 },
];

export function ProviderPanel() {
  const [activeTab, setActiveTab] = useState('profile');
  const [provider, setProvider] = useState<ServiceProvider>(mockProviders[0]);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  const renderTab = () => {
    switch (activeTab) {
      case 'profile': return <ProfileTab provider={provider} onChange={setProvider} />;
      case 'atendimentos': return <AtendimentosTab provider={provider} />;
      case 'gallery': return <GalleryTab provider={provider} onChange={setProvider} />;
      case 'agenda': return <AgendaTab provider={provider} onChange={setProvider} />;
      case 'area': return <ServiceAreaTab provider={provider} onChange={setProvider} />;
      case 'reviews': return <ReviewsProviderTab provider={provider} />;
      case 'verification': return <VerificationTab />;
      case 'performance': return <PerformanceTab provider={provider} />;
      default: return null;
    }
  };

  const headerRight = (
    <Link to="/servicos">
      <Button variant="outline" size="sm" className="gap-2">
        <Store className="h-4 w-4" />
        <span className="hidden sm:inline">Ver perfil público</span>
      </Button>
    </Link>
  );

  return (
    <PanelShell
      brand={{
        icon: Store,
        title: provider.name,
        status: provider.isActive ? 'active' : 'inactive',
        statusLabel: provider.isActive ? 'Perfil ativo' : 'Inativo',
      }}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerRight={headerRight}
      onLogout={handleLogout}
      contentMaxWidth="max-w-4xl"
    >
      {renderTab()}
    </PanelShell>
  );
}
