import { useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  ShoppingCart,
  Wrench,
  Sparkles,
  Scissors,
  LayoutGrid,
  Search,
} from 'lucide-react';
import { HubTile } from '@/components/client/HubTile';
import { Logo } from '@/components/common/Logo';

export default function Home() {
  const navigate = useNavigate();

  const tiles = [
    { to: '/alimentacao', icon: UtensilsCrossed, label: 'Alimentação', tone: 'food' as const },
    { to: '/mercado', icon: ShoppingCart, label: 'Mercado', tone: 'market' as const, comingSoon: true },
    { to: '/servicos', icon: Wrench, label: 'Serviços', tone: 'services' as const },
    { to: '/bem-estar', icon: Sparkles, label: 'Bem-estar', tone: 'wellness' as const, comingSoon: true },
    { to: '/ver-tudo', icon: LayoutGrid, label: 'Ver tudo', tone: 'all' as const },
    { to: '/beleza', icon: Scissors, label: 'Beleza', tone: 'beauty' as const, comingSoon: true },
  ];

  const goSearch = () => navigate('/ver-tudo', { state: { focusSearch: true } });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="container flex-1 pt-4 sm:pt-5 pb-6 sm:pb-8">
        {/* Hero: logo + saudação + busca, com glow ambiente único (CSS) */}
        <section
          className="relative mx-auto max-w-3xl text-center px-2 pt-2 pb-4 sm:pb-5 md:pb-6"
          style={{ backgroundImage: 'var(--hero-glow)' }}
        >
          <div className="flex justify-center mb-3 sm:mb-4">
            <Logo className="h-24 sm:h-28 drop-shadow-sm" />
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-[2rem] font-bold tracking-tight text-foreground">
            Olá!
          </h1>
          <p className="mt-1 mb-4 sm:mb-5 text-muted-foreground text-base sm:text-lg">
            O que você precisa hoje?
          </p>

          <button
            type="button"
            onClick={goSearch}
            aria-label="Buscar restaurantes e serviços"
            className="group mx-auto flex w-full max-w-xl items-center gap-3 rounded-full border border-border bg-card px-5 py-3 sm:py-3.5 text-left shadow-sm hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="text-sm sm:text-base text-muted-foreground truncate">
              Buscar restaurantes, serviços…
            </span>
          </button>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-2xl mx-auto md:max-w-3xl md:grid-cols-3 mt-1">
          {tiles.map((t, i) => (
            <HubTile
              key={t.label}
              to={t.to}
              icon={t.icon}
              label={t.label}
              tone={t.tone}
              comingSoon={t.comingSoon}
              index={i}
              aspectClassName="aspect-square md:aspect-[5/4] lg:aspect-[3/2]"
            />
          ))}
        </div>
      </main>

    </div>
  );
}
