import { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, UtensilsCrossed, Wrench, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RestaurantCard } from '@/components/client/RestaurantCard';
import { ProviderCard } from '@/components/client/ProviderCard';
import { mockRestaurants } from '@/data/restaurants';
import { mockProviders, serviceCategories } from '@/data/serviceProviders';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type Mode = 'food' | 'services';

export default function VerTudo() {
  const [mode, setMode] = useState<Mode>('food');
  const [search, setSearch] = useState('');
  const [foodCat, setFoodCat] = useState<string>('all');
  const [serviceCat, setServiceCat] = useState<string>('all');
  const searchRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  useEffect(() => {
    const state = location.state as { focusSearch?: boolean } | null;
    if (state?.focusSearch) {
      // Pequeno delay para garantir render do input
      const t = setTimeout(() => searchRef.current?.focus(), 50);
      window.history.replaceState({}, '');
      return () => clearTimeout(t);
    }
  }, [location.state]);

  // Categorias únicas de alimentação (derivadas dos restaurantes)
  const foodCategories = useMemo(() => {
    const set = new Set<string>();
    mockRestaurants.forEach(r => set.add(r.category));
    return Array.from(set);
  }, []);

  const restaurants = useMemo(
    () =>
      mockRestaurants.filter(r => {
        if (foodCat !== 'all' && r.category !== foodCat) return false;
        if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [search, foodCat],
  );

  const providers = useMemo(
    () =>
      mockProviders.filter(p => {
        if (!p.isActive) return false;
        if (serviceCat !== 'all' && !p.categories.includes(serviceCat)) return false;
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [search, serviceCat],
  );

  

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background sticky top-0 z-30">
        <div className="container py-3 space-y-3">
          {/* Linha 1: voltar + toggle vertical centralizado */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild aria-label="Voltar ao hub" className="-ml-2 shrink-0">
              <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>

            <div className="flex-1 flex justify-center">
              <div
                role="tablist"
                aria-label="Tipo de vitrine"
                className="inline-flex items-center rounded-full bg-muted p-1 h-10"
              >
                <button
                  role="tab"
                  aria-selected={mode === 'food'}
                  onClick={() => setMode('food')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-4 h-8 text-sm transition-all duration-200',
                    mode === 'food'
                      ? 'bg-background text-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <UtensilsCrossed className={cn('h-4 w-4', mode === 'food' ? 'text-warning' : 'text-muted-foreground/60')} />
                  Alimentos
                </button>
                <button
                  role="tab"
                  aria-selected={mode === 'services'}
                  onClick={() => setMode('services')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-4 h-8 text-sm transition-all duration-200',
                    mode === 'services'
                      ? 'bg-background text-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Wrench className={cn('h-4 w-4', mode === 'services' ? 'text-success' : 'text-muted-foreground/60')} />
                  Serviços
                </button>
              </div>
            </div>

            <span className="w-9 shrink-0" aria-hidden />
          </div>


          {/* Linha 2: busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder={mode === 'food' ? 'Buscar restaurantes...' : 'Buscar prestadores...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Linha 3: chips de categoria por modo */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            {mode === 'food' ? (
              <>
                <CategoryChip
                  active={foodCat === 'all'}
                  label="Todos"
                  onClick={() => setFoodCat('all')}
                />
                {foodCategories.map(c => (
                  <CategoryChip
                    key={c}
                    active={foodCat === c}
                    label={c}
                    onClick={() => setFoodCat(foodCat === c ? 'all' : c)}
                  />
                ))}
              </>
            ) : (
              <>
                <CategoryChip
                  active={serviceCat === 'all'}
                  label="Todos"
                  onClick={() => setServiceCat('all')}
                />
                {serviceCategories.map(c => (
                  <CategoryChip
                    key={c.id}
                    active={serviceCat === c.id}
                    label={c.name}
                    onClick={() => setServiceCat(serviceCat === c.id ? 'all' : c.id)}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container py-6">
        <AnimatePresence mode="wait">
          {mode === 'food' ? (
            <motion.section
              key="food"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {restaurants.length === 0 ? (
                <EmptyMsg query={search} />
              ) : (
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                  {restaurants.map((r, i) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <RestaurantCard restaurant={r} viewMode="grid" />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.section>
          ) : (
            <motion.section
              key="services"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {providers.length === 0 ? (
                <EmptyMsg query={search} />
              ) : (
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                  {providers.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <ProviderCard provider={p} viewMode="grid" />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function CategoryChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80',
      )}
    >
      <span>{label}</span>
      {active && label !== 'Todos' && (
        <X className="h-3.5 w-3.5 opacity-90" aria-label="Limpar filtro" />
      )}
    </button>
  );
}

function EmptyMsg({ query }: { query: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">
        {query ? `Nada encontrado para "${query}".` : 'Nenhum resultado nesta categoria.'}
      </p>
    </div>
  );
}
