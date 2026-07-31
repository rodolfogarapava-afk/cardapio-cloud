import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, GalleryHorizontal, Search, ShoppingCart, Sparkles, X } from 'lucide-react';

type Setters = {
  setCarouselEnabled: (v: boolean) => void;
  setSearch: (v: string) => void;
  setCartOpen: (v: boolean) => void;
};

type Step = {
  caption: string;
  icon: React.ComponentType<{ className?: string }>;
  apply: (s: Setters) => void;
  hold: number;
};

const STORAGE_KEY = 'menu-tour-seen-v2';

interface Props extends Setters {
  /** Slug do restaurante — garante 1x por loja por dispositivo */
  vendorSlug: string;
}

export function MenuTour({ vendorSlug, setCarouselEnabled, setSearch, setCartOpen }: Props) {
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const skippedRef = useRef(false);
  const setters: Setters = { setCarouselEnabled, setSearch, setCartOpen };

  const steps: Step[] = [
    { caption: 'Bem-vindo ao cardápio', icon: Sparkles, apply: () => {}, hold: 900 },
    { caption: 'Modo Lista', icon: LayoutGrid, apply: (s) => s.setCarouselEnabled(false), hold: 1100 },
    { caption: 'Modo Carrossel', icon: GalleryHorizontal, apply: (s) => s.setCarouselEnabled(true), hold: 1100 },
    { caption: 'Busca rápida', icon: Search, apply: (s) => s.setSearch('a'), hold: 1100 },
    { caption: 'Carrinho sempre à mão', icon: ShoppingCart, apply: (s) => { s.setSearch(''); s.setCartOpen(true); }, hold: 1400 },
  ];

  // Boot: only once per device per vendor
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `${STORAGE_KEY}:${vendorSlug}`;
    if (localStorage.getItem(key)) return;
    // Mark immediately to avoid double-run on Strict Mode
    localStorage.setItem(key, '1');
    const t = setTimeout(() => setActive(true), 600);
    return () => clearTimeout(t);
  }, [vendorSlug]);

  const finish = (skipped = false) => {
    skippedRef.current = skipped;
    // Restore defaults
    setCartOpen(false);
    setSearch('');
    setCarouselEnabled(true);
    setActive(false);
    setStepIdx(0);
  };

  // Advance steps
  useEffect(() => {
    if (!active) return;
    const step = steps[stepIdx];
    step.apply(setters);
    const t = setTimeout(() => {
      if (skippedRef.current) return;
      if (stepIdx >= steps.length - 1) finish(false);
      else setStepIdx((i) => i + 1);
    }, step.hold);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIdx]);

  if (!active) return null;

  const Step = steps[stepIdx];
  const Icon = Step.icon;
  const progress = ((stepIdx + 1) / steps.length) * 100;

  return (
    <AnimatePresence>
      <motion.div
        key="menu-tour"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] pointer-events-none"
      >
        {/* Dim vignette */}
        <div className="absolute inset-0 bg-foreground/10 backdrop-blur-[1px]" />

        {/* Caption pill */}
        <div className="absolute inset-x-0 top-20 flex justify-center px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIdx}
              initial={{ y: -8, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -6, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-auto flex items-center gap-2.5 rounded-full border bg-background/95 backdrop-blur px-4 py-2 shadow-lg"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-foreground">{Step.caption}</span>
              <button
                onClick={() => finish(true)}
                aria-label="Pular tour"
                className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="absolute inset-x-0 top-0 h-1 bg-transparent">
          <motion.div
            className="h-full bg-primary"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
