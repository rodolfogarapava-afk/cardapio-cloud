import { useState, useMemo } from 'react';
import { Search, MapPin, LayoutGrid, List, ChevronDown, Navigation, Sparkles, Star, BadgeCheck, ArrowLeft, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ProviderCard, ProviderViewMode } from '@/components/client/ProviderCard';
import { mockProviders, serviceCategories } from '@/data/serviceProviders';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/common/Logo';

const ALL_CITIES = 'Todos os municípios';
const mockCities = [ALL_CITIES, 'São Paulo', 'Guarulhos', 'Osasco', 'Santo André'];

type SortOption = 'relevance' | 'distance' | 'rating';

const distances: Record<string, number> = {};
mockProviders.forEach((p, i) => { distances[p.id] = [1.2, 2.8, 3.5, 0.8, 4.1, 1.9, 5.2, 2.3, 6.0, 3.1][i] || 5; });

type QuickFilter = 'verified' | 'top_rated' | 'fast' | 'budget';

export default function Servicos() {
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ProviderViewMode>('grid');
  const [selectedCity, setSelectedCity] = useState<string>(ALL_CITIES);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [sortOpen, setSortOpen] = useState(false);
  const [quickFilters, setQuickFilters] = useState<Set<QuickFilter>>(new Set());


  const toggleQuick = (k: QuickFilter) =>
    setQuickFilters(prev => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  const filtered = useMemo(() => {
    let results = mockProviders.filter(p => {
      if (!p.isActive) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (activeCat !== 'all' && !p.categories.includes(activeCat)) return false;
      if (selectedCity !== ALL_CITIES && p.serviceArea.city !== selectedCity) return false;
      if (quickFilters.has('verified') && !p.verified) return false;
      if (quickFilters.has('top_rated') && p.rating < 4.7) return false;
      if (quickFilters.has('fast') && (distances[p.id] || 99) > 3) return false;
      if (quickFilters.has('budget') && p.priceRange.min > 80) return false;
      return true;
    });
    if (sortBy === 'distance') results = [...results].sort((a, b) => (distances[a.id] || 0) - (distances[b.id] || 0));
    if (sortBy === 'rating') results = [...results].sort((a, b) => b.rating - a.rating);
    return results;
  }, [search, activeCat, selectedCity, sortBy, quickFilters]);


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="container py-2.5">
          <div className="flex items-center justify-between mb-4 gap-3">
            <div className="flex items-center gap-1 min-w-0">
              <Button variant="ghost" size="icon" asChild aria-label="Voltar ao hub" className="-ml-2 shrink-0">
                <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
              </Button>
              <Link to="/" aria-label="Use Livre" className="shrink-0 flex items-center">
                <Logo className="h-12 sm:h-14" />
              </Link>
              <span className="mx-1 h-5 w-px bg-border hidden sm:block" />
              <h1 className="text-lg font-bold text-foreground truncate hidden sm:block">Serviços</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border bg-muted p-1">
                <Button variant="ghost" size="icon" onClick={() => setViewMode('grid')}
                  className={cn('h-8 w-8 rounded-md', viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}
                  aria-label="Grade"><LayoutGrid className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setViewMode('list')}
                  className={cn('h-8 w-8 rounded-md', viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}
                  aria-label="Lista"><List className="h-4 w-4" /></Button>
              </div>
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
                    <button key={c} onClick={() => setSelectedCity(c)}
                      className={cn('w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors',
                        selectedCity === c ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted')}>
                      <span className="truncate">{c}</span>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar prestadores..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-4 -mx-4 px-4">
            <button onClick={() => setActiveCat('all')}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeCat === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              Todos
            </button>
            {serviceCategories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeCat === cat.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Toolbar unificada: filtros (chips) + ordenação (dropdown) */}
        {(() => {
          const filterDefs = [
            { k: 'verified' as const, label: 'Verificado', Icon: BadgeCheck },
            { k: 'budget' as const, label: 'Econômico', Icon: Wallet },
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
                <span className="font-medium text-foreground">{filtered.length}</span> prestadores
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




        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-lg font-semibold">Nenhum prestador encontrado</h2>
            <p className="text-sm text-muted-foreground mt-1">Ajuste os filtros ou tente outra categoria</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={viewMode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
              className={cn(viewMode === 'grid' ? 'grid gap-8 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-4')}>
              {filtered.map((p, index) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} layout>
                  <ProviderCard provider={p} viewMode={viewMode} distanceKm={distances[p.id]} />
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
