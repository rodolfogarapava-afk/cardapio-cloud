import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Bell, LucideIcon, ShoppingCart, Sparkles, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HubTile, HubTone } from '@/components/client/HubTile';
import { toast } from '@/hooks/use-toast';

const presets: Record<string, { label: string; tone: HubTone; icon: LucideIcon }> = {
  '/mercado': { label: 'Mercado', tone: 'market', icon: ShoppingCart },
  '/bem-estar': { label: 'Bem-estar', tone: 'wellness', icon: Sparkles },
  '/beleza': { label: 'Beleza', tone: 'beauty', icon: Scissors },
};

export default function EmBreve() {
  const { pathname } = useLocation();
  const preset = presets[pathname] ?? { label: 'Em breve', tone: 'all' as HubTone, icon: Sparkles };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="container py-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild aria-label="Voltar ao hub">
          <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-base font-semibold text-foreground">{preset.label}</h1>
      </header>

      <main className="container flex-1 flex flex-col items-center justify-center py-12 text-center">
        <div className="w-40 sm:w-48 mb-6">
          <HubTile icon={preset.icon} label={preset.label} tone={preset.tone} comingSoon />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Em breve por aqui</h2>
        <p className="text-muted-foreground max-w-sm text-sm sm:text-base mb-6">
          Estamos preparando essa vertical com cuidado. Quer ser avisado quando lançar?
        </p>
        <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
          <Button
            className="gap-2 flex-1"
            onClick={() => toast({ title: 'Combinado!', description: `Avisaremos quando ${preset.label} chegar.` })}
          >
            <Bell className="h-4 w-4" />
            Avise-me
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link to="/">Voltar ao hub</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
