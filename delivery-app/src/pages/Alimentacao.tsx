import { useState, useMemo } from 'react';
import { Search, MapPin, LayoutGrid, List, ChevronDown, Navigation, Sparkles, Star, Clock, ArrowLeft, Zap, Truck, Award, DoorOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { RestaurantCard, ViewMode } from '@/components/client/RestaurantCard';
import { PromoBannerCarousel } from '@/components/client/PromoBannerCarousel';
import { RecentOrdersStrip } from '@/components/client/RecentOrdersStrip';
import { mockRestaurants } from '@/data/restaurants';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/contexts/AuthContext';

const categories = ['Todos', 'Espetinhos'];

// Municípios derivados dos restaurantes disponíveis (mock).
// A seleção inicial é "Todos" — sem pré-fixar bairro algum.
const ALL_CITIES = 'Todos os municípios';
const mockCities = [
  { name: ALL_CITIES, count: 0 },
  { name: 'São Paulo', count: 0 },
  { name: 'Guarulhos', count: 0 },
  { name: 'Osasco', count: 0 },
  { name: 'Santo André', count: 0 },
];

type SortOption = 'relevance' | 'distance' | 'rating' | 'delivery_time';

// Mock distances for restaurants
const restaurantDistances: Record<string, number> = {};
mockRestaurants.forEach((r, i) => {
  restaurantDistances[r.id] = [1.2, 2.8, 3.5, 0.8, 4.1, 1.9, 5.2, 2.3][i % 8];
});

// Embaralha apenas no 1º acesso (apresentação variada). Próximas visitas: ordem padrão.
const VISITED_KEY = 'uselivre:visited';
const isFirstVisit = typeof window !== 'undefined' && !window.localStorage.getItem(VISITED_KEY);
const deliveryRestaurants = mockRestaurants.filter(restaurant => restaurant.slug === 'proveu-espeto');
const presentationOrder = isFirstVisit
  ? [...deliveryRestaurants].sort(() => Math.random() - 0.5)
  : deliveryRestaurants;
if (isFirstVisit && typeof window !== 'undefined') {
  window.localStorage.setItem(VISITED_KEY, '1');
}

type QuickFilter = 'open' | 'free_delivery' | 'fast' | 'top_rated';

export default function CatalogoRestaurantes() {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [quickFilters, setQuickFilters] = useState<Set<QuickFilter>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCity, setSelectedCity] = useState<string>(ALL_CITIES);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [sortOpen, setSortOpen] = useState(false);


  const toggleQuick = (k: QuickFilter) =>
    setQuickFilters(prev => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  const filteredRestaurants = useMemo(() => {
    let results = presentationOrder.filter(r => {
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (activeCategory !== 'Todos' && r.category !== activeCategory) return false;
      if (quickFilters.has('open') && !r.isOpen) return false;
      if (quickFilters.has('free_delivery') && r.deliveryFee > 0) return false;
      if (quickFilters.has('fast') && parseInt(r.deliveryTime) > 30) return false;
      if (quickFilters.has('top_rated') && r.rating < 4.7) return false;
      return true;
    });

    if (sortBy === 'distance') {
      results = [...results].sort((a, b) => (restaurantDistances[a.id] || 0) - (restaurantDistances[b.id] || 0));
    } else if (sortBy === 'rating') {
      results = [...results].sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'delivery_time') {
      results = [...results].sort((a, b) => parseInt(a.deliveryTime) - parseInt(b.deliveryTime));
    }

    return results;
  }, [search, activeCategory, quickFilters, sortBy]);


  const openCount = deliveryRestaurants.filter(r => r.isOpen).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="container py-2.5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1 min-w-0">
              <Button variant="ghost" size="icon" asChild aria-label="Voltar ao hub" className="-ml-2 shrink-0">
                <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
              </Button>
              <Link to="/" aria-label="Use Livre" className="shrink-0 flex items-center">
                <Logo className="h-12 sm:h-14" />
              </Link>
              <span className="mx-1 h-5 w-px bg-border hidden sm:block" />
              <h1 className="text-lg font-bold text-foreground truncate hidden sm:block">Alimentação</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center rounded-lg border bg-muted p-1">
                <Button variant="ghost" size="icon" onClick={() => setViewMode('grid')}
                  className={cn('h-8 w-8 rounded-md transition-all', viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                  aria-label="Visualização em grade"><LayoutGrid className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setViewMode('list')}
                  className={cn('h-8 w-8 rounded-md transition-all', viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                  aria-label="Visualização em lista"><List className="h-4 w-4" /></Button>
              </div>

              {/* Município (sem pré-seleção de bairro) */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm hidden sm:inline max-w-[140px] truncate">{selectedCity}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-60 p-2" align="end">
                  <p className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">Município</p>
                  {mockCities.map(c => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedCity(c.name)}
                      className={cn(
                        'w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors',
                        selectedCity === c.name ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                      )}
                    >
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                  <p className="text-[11px] text-muted-foreground px-2 pt-2 leading-snug">
                    Bairros aparecem só após escolher um endereço de entrega.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar restaurantes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>

          {/* Categorias */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-4 -mx-4 px-4">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >{cat}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <PromoBannerCarousel />

        {isAuthenticated && <RecentOrdersStrip />}

        {/* Toolbar unificada: filtros (chips) + ordenação (dropdown) */}
        {(() => {
          const filterDefs = [
            { k: 'open' as const, label: 'Aberto agora', Icon: DoorOpen },
            { k: 'free_delivery' as const, label: 'Entrega grátis', Icon: Truck },
          ];
          const sortOptions: { key: SortOption; label: string; icon: typeof Sparkles }[] = [
            { key: 'relevance', label: 'Relevância', icon: Sparkles },
            { key: 'distance', label: 'Mais perto', icon: Navigation },
            { key: 'rating', label: 'Melhor avaliados', icon: Star },
          ];

          const activeSort = sortOptions.find(s => s.key === sortBy)!;
          const ActiveSortIcon = activeSort.icon;
          const activeFilterCount = quickFilters.size;
          return (
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground mr-auto">
                <span className="font-medium text-foreground">{filteredRestaurants.length}</span> restaurantes
                {activeCategory !== 'Todos' && ` em ${activeCategory}`}
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                {filterDefs.map(({ k, label, Icon }) => {
                  const active = quickFilters.has(k);
                  return (
                    <button
                      key={k}
                      onClick={() => toggleQuick(k)}
                      aria-pressed={active}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full h-9 px-3.5 text-xs font-medium border transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background text-foreground border-border hover:bg-muted'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  );
                })}

                {activeFilterCount > 0 && (
                  <button
                    onClick={() => setQuickFilters(new Set())}
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline px-1"
                  >
                    Limpar
                  </button>
                )}

                <span className="h-6 w-px bg-border hidden sm:block" />

                <Popover open={sortOpen} onOpenChange={setSortOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="inline-flex items-center gap-1.5 rounded-full h-9 px-3.5 text-xs font-medium border border-border bg-background hover:bg-muted transition-colors"
                      aria-label="Ordenar por"
                    >
                      <ActiveSortIcon className="h-3.5 w-3.5" />
                      <span className="text-muted-foreground">Ordenar:</span>
                      <span>{activeSort.label}</span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-1" align="end">
                    {sortOptions.map(opt => {
                      const Icon = opt.icon;
                      const active = sortBy === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => { setSortBy(opt.key); setSortOpen(false); }}
                          className={cn(
                            'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                            active ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </PopoverContent>
                </Popover>

              </div>
            </div>
          );
        })()}




        {filteredRestaurants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-lg font-semibold">Nenhum restaurante encontrado</h2>
            <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros ou buscar por outro termo</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={viewMode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
              className={cn(viewMode === 'grid' ? 'grid gap-8 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-4')}
            >
              {filteredRestaurants.map((restaurant, index) => (
                <motion.div key={restaurant.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} layout>
                  <div className="relative">
                    <RestaurantCard restaurant={restaurant} viewMode={viewMode} />
                    {/* Distância badge */}
                    {restaurantDistances[restaurant.id] && (
                      <div className="absolute bottom-2 right-2 z-10">
                        <span className="inline-flex items-center gap-1 rounded-full bg-background/90 backdrop-blur border px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                          <Navigation className="h-2.5 w-2.5" />
                          {restaurantDistances[restaurant.id]} km
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <footer className="border-t py-6 mt-auto">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2026 Use Livre. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
