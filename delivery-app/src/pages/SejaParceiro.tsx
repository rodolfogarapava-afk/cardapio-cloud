import { Link } from 'react-router-dom';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, ArrowLeft, Store, Wrench, Sparkles, MessageCircle, Star,
  Check, X as XIcon, Gift, LogIn, Sun, Moon, Lock, Globe, Percent, Zap,
  Utensils, Scissors, ShoppingBag, Dumbbell, ChevronLeft, ChevronRight,
  RotateCw, Heart, MapPin, CalendarClock, ClipboardList, Ticket, Send,
  Instagram, Building2, User, Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/common/Logo';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

// ============================================================
// Motion helpers
// ============================================================

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

// ============================================================
// Theme toggle (light/dark)
// ============================================================

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);
  return {
    theme,
    toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
  };
}

// ============================================================
// Hero — typing URL inside a browser window
// ============================================================

interface StorefrontMock {
  slug: string;
  name: string;
  badge: string;
  icon: typeof Utensils;
  items: { icon: typeof Utensils; name: string; desc: string; price: string }[];
}

const STOREFRONT_CYCLE: StorefrontMock[] = [
  {
    slug: 'suapadaria',
    name: 'Sua Padaria',
    badge: 'loja própria',
    icon: Utensils,
    items: [
      { icon: Utensils, name: 'Pão francês (500g)', desc: 'Crocante, saído do forno.', price: 'R$ 12,90' },
      { icon: Utensils, name: 'Bolo de fubá', desc: 'Fatia grande, café da tarde.', price: 'R$ 8,50' },
      { icon: Utensils, name: 'Sonho de creme', desc: 'Recheio generoso, açúcar.', price: 'R$ 6,00' },
    ],
  },
  {
    slug: 'seusalao',
    name: 'Seu Salão',
    badge: 'agenda própria',
    icon: Scissors,
    items: [
      { icon: Scissors, name: 'Corte feminino', desc: 'Lavagem + finalização.', price: 'R$ 80,00' },
      { icon: Sparkles, name: 'Escova modelada', desc: 'Cabelos até a cintura.', price: 'R$ 65,00' },
      { icon: Scissors, name: 'Barba desenhada', desc: 'Toalha quente + hidratação.', price: 'R$ 45,00' },
    ],
  },
  {
    slug: 'seumercado',
    name: 'Seu Mercado',
    badge: 'catálogo próprio',
    icon: ShoppingBag,
    items: [
      { icon: ShoppingBag, name: 'Cesta básica', desc: '12 itens essenciais do mês.', price: 'R$ 189,90' },
      { icon: ShoppingBag, name: 'Ovos caipira (dz)', desc: 'Granja local, frescos.', price: 'R$ 22,00' },
      { icon: ShoppingBag, name: 'Café torrado 500g', desc: 'Torra média, moído na hora.', price: 'R$ 28,50' },
    ],
  },
  {
    slug: 'suapizzaria',
    name: 'Sua Pizzaria',
    badge: 'loja própria',
    icon: Utensils,
    items: [
      { icon: Utensils, name: 'Pizza Margherita', desc: 'Molho, muçarela e manjericão.', price: 'R$ 54,90' },
      { icon: Utensils, name: 'Pizza Calabresa', desc: 'Cebola, azeitona e orégano.', price: 'R$ 58,00' },
      { icon: Utensils, name: 'Borda recheada', desc: 'Catupiry ou cheddar.', price: 'R$ 8,00' },
    ],
  },
];

function TypingSlug({ paused, wordIdx, setWordIdx }: { paused: boolean; wordIdx: number; setWordIdx: (fn: (i: number) => number) => void }) {
  const reduce = useReducedMotion();
  const [chars, setChars] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (reduce || paused) return;
    const word = STOREFRONT_CYCLE[wordIdx].slug;
    let delay = deleting ? 55 : 100;
    if (!deleting && chars === word.length) delay = 1400;
    if (deleting && chars === 0) delay = 400;
    const t = setTimeout(() => {
      if (!deleting && chars === word.length) {
        setDeleting(true);
      } else if (deleting && chars === 0) {
        setDeleting(false);
        setWordIdx((i) => (i + 1) % STOREFRONT_CYCLE.length);
      } else {
        setChars((c) => c + (deleting ? -1 : 1));
      }
    }, delay);
    return () => clearTimeout(t);
  }, [chars, deleting, wordIdx, paused, reduce, setWordIdx]);

  const currentSlug = STOREFRONT_CYCLE[wordIdx].slug;
  const shown = currentSlug.slice(0, chars);
  return (
    <span className="font-mono text-[11px] sm:text-sm inline-flex items-center min-w-0 truncate">
      <span className="text-muted-foreground">https://</span>
      <span className="font-semibold" style={{ color: 'hsl(var(--vendor))' }}>
        {shown || currentSlug[0]}
      </span>
      <span
        aria-hidden
        className="inline-block w-[1.5px] h-4 ml-0.5 bg-foreground/70 shrink-0"
        style={{ animation: reduce ? undefined : 'sheen 1.1s steps(2, end) infinite' }}
      />
      <span className="text-muted-foreground truncate">.uselivre.com.br</span>
    </span>
  );
}

function BrowserPreview() {
  const [hover, setHover] = useState(false);
  const [wordIdx, setWordIdx] = useState(0);
  const store = STOREFRONT_CYCLE[wordIdx];
  const StoreIcon = store.icon;
  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        aria-hidden
        className="absolute -inset-10 blur-3xl opacity-60 pointer-events-none"
        style={{
          background:
            'radial-gradient(50% 50% at 30% 30%, hsl(var(--vendor) / 0.4), transparent 70%), radial-gradient(50% 50% at 70% 80%, hsl(var(--hub-services) / 0.4), transparent 70%)',
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        className="relative rounded-2xl border bg-card shadow-2xl overflow-hidden"
        style={{ boxShadow: '0 30px 60px -20px hsl(var(--vendor) / 0.35), 0 20px 40px -25px hsl(var(--hub-services) / 0.3)' }}
      >
        {/* traffic lights + url bar */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b bg-muted/40">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          <div className="flex-1 min-w-0 mx-2 h-7 rounded-md border bg-background flex items-center gap-1.5 px-2.5 overflow-hidden">
            <Lock className="h-3 w-3 shrink-0" style={{ color: 'hsl(var(--success))' }} />
            <TypingSlug paused={hover} wordIdx={wordIdx} setWordIdx={setWordIdx} />
          </div>
        </div>

        {/* fake storefront body */}
        <motion.div
          key={store.slug}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="p-4 sm:p-5"
        >
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'hsl(var(--vendor) / 0.15)', color: 'hsl(var(--vendor))' }}
            >
              <StoreIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-base sm:text-lg font-bold truncate">{store.name}</h3>
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'hsl(var(--vendor) / 0.15)', color: 'hsl(var(--vendor))' }}
                >
                  {store.badge}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <motion.span
                  className="h-2 w-2 rounded-full"
                  style={{ background: 'hsl(var(--success))' }}
                  animate={{ scale: [1, 1.35, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                Aberta agora
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {store.items.map((it) => (
              <div key={it.name} className="flex items-center gap-3 rounded-xl border bg-background p-2.5">
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'hsl(var(--vendor) / 0.1)', color: 'hsl(var(--vendor))' }}
                >
                  <it.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{it.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{it.desc}</div>
                </div>
                <div className="font-mono text-sm font-bold" style={{ color: 'hsl(var(--vendor))' }}>
                  {it.price}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button
              className="flex-1 font-semibold text-[hsl(var(--vendor-foreground))]"
              style={{ background: 'hsl(var(--vendor))' }}
            >
              Adicionar ao carrinho
            </Button>
            <button
              type="button"
              className="h-10 w-10 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Favoritar"
            >
              <Heart className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* floating "1 mês grátis" seal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6, rotate: -14 }}
        animate={{ opacity: 1, scale: 1, rotate: -10 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
        className="absolute -top-4 -right-3 sm:-right-6 z-10 px-3 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5"
        style={{
          background: 'hsl(var(--success))',
          color: 'hsl(var(--success-foreground))',
          boxShadow: '0 14px 30px -10px hsl(var(--success))',
        }}
      >
        <Gift className="h-3.5 w-3.5" /> 1 mês grátis
      </motion.div>
    </div>
  );
}

// ============================================================
// Collectible card carousel — the star
// ============================================================

type CardRole = 'lojista' | 'prestador';
interface CollectibleCard {
  id: string;
  number: string;
  role: CardRole;
  category: string;
  slug: string;
  icon: typeof Utensils;
  tone: 'vendor' | 'hub-services';
  features: string[];
  tools: { icon: typeof Utensils; label: string }[];
}

const LOJISTA_TOOLS = [
  { icon: ClipboardList, label: 'Cardápio digital' },
  { icon: MapPin, label: 'Frete no mapa' },
  { icon: Ticket, label: 'Cupons e fidelidade' },
  { icon: Globe, label: 'Endereço próprio' },
];
const PRESTADOR_TOOLS = [
  { icon: Sparkles, label: 'Vitrine profissional' },
  { icon: CalendarClock, label: 'Agenda' },
  { icon: Star, label: 'Avaliações' },
  { icon: MessageCircle, label: 'WhatsApp direto' },
  { icon: Globe, label: 'Endereço próprio' },
];

const CARDS: CollectibleCard[] = [
  { id: 'padaria',     number: '01', role: 'lojista',   category: 'Padaria',     slug: 'suapadaria',        icon: Utensils,    tone: 'vendor',        features: ['cardápio', 'frete', 'cupons'],    tools: LOJISTA_TOOLS },
  { id: 'eletricista', number: '02', role: 'prestador', category: 'Eletricista', slug: 'eletricistajose',   icon: Zap,         tone: 'hub-services',  features: ['vitrine', 'agenda', 'avaliações'], tools: PRESTADOR_TOOLS },
  { id: 'pizzaria',    number: '03', role: 'lojista',   category: 'Pizzaria',    slug: 'suapizzaria',       icon: Utensils,    tone: 'vendor',        features: ['cardápio', 'frete', 'fidelidade'], tools: LOJISTA_TOOLS },
  { id: 'salao',       number: '04', role: 'prestador', category: 'Salão',       slug: 'salaoglamour',      icon: Scissors,    tone: 'hub-services',  features: ['vitrine', 'agenda', 'avaliações'], tools: PRESTADOR_TOOLS },
  { id: 'mercado',     number: '05', role: 'lojista',   category: 'Mercado',     slug: 'mercadinhodobairro',icon: ShoppingBag, tone: 'vendor',        features: ['catálogo', 'frete', 'cupons'],    tools: LOJISTA_TOOLS },
  { id: 'personal',    number: '06', role: 'prestador', category: 'Personal',    slug: 'personaldani',      icon: Dumbbell,    tone: 'hub-services',  features: ['vitrine', 'agenda', 'whatsapp'],   tools: PRESTADOR_TOOLS },
];

interface CollectibleProps {
  card: CollectibleCard;
  offset: number;      // -N .. +N (0 = active)
  flipped: boolean;
  onFlip: () => void;
  onClickInactive: () => void;
  paused: boolean;
  isMobile: boolean;
}

function CollectibleCardView({ card, offset, flipped, onFlip, onClickInactive, paused, isMobile }: CollectibleProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 50 });
  const rafRef = useRef<number | null>(null);

  const isActive = offset === 0;
  const abs = Math.abs(offset);
  const enableTilt = isActive && !reduce && !isMobile;

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!enableTilt) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setTilt({
        rx: (0.5 - py) * 12,
        ry: (px - 0.5) * 12,
        mx: px * 100,
        my: py * 100,
      });
    });
  }, [enableTilt]);
  const onMouseLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setTilt({ rx: 0, ry: 0, mx: 50, my: 50 });
  }, []);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  // Coverflow positioning — responsive so mobile cards stay reachable
  const D1 = isMobile ? 120 : 220;
  const D2 = isMobile ? 190 : 340;
  const D3 = isMobile ? 240 : 420;
  let translateX = 0;
  let rotateY = 0;
  let scale = 1;
  let opacity = 1;
  let z = 10;
  if (offset === 0) {
    z = 30;
  } else if (abs === 1) {
    translateX = offset > 0 ? D1 : -D1;
    rotateY = offset > 0 ? -25 : 25;
    scale = isMobile ? 0.8 : 0.85;
    opacity = 0.45;
    z = 20;
  } else if (abs === 2) {
    translateX = offset > 0 ? D2 : -D2;
    rotateY = offset > 0 ? -35 : 35;
    scale = isMobile ? 0.65 : 0.7;
    opacity = isMobile ? 0.15 : 0.25;
    z = 10;
  } else {
    translateX = offset > 0 ? D3 : -D3;
    rotateY = offset > 0 ? -45 : 45;
    scale = 0.55;
    opacity = 0;
    z = 0;
  }

  const toneVar = card.tone === 'vendor' ? 'var(--vendor)' : 'var(--hub-services)';
  const toneFg = card.tone === 'vendor' ? 'var(--vendor-foreground)' : 'var(--hub-foreground)';
  const IconEl = card.icon;

  return (
    <motion.div
      ref={ref}
      role={isActive ? 'group' : undefined}
      aria-hidden={!isActive}
      onClick={() => (isActive ? onFlip() : onClickInactive())}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={cn(
        'absolute top-1/2 left-1/2 preserve-3d cursor-pointer select-none',
        'w-[240px] h-[360px] sm:w-[320px] sm:h-[450px]',
      )}
      style={{
        transformStyle: 'preserve-3d',
        zIndex: z,
        pointerEvents: abs > 2 ? 'none' : 'auto',
        willChange: 'transform',
      }}
      animate={{
        x: `calc(-50% + ${translateX}px)`,
        y: '-50%',
        rotateY: rotateY + (enableTilt ? tilt.ry : 0),
        rotateX: enableTilt ? tilt.rx : 0,
        scale,
        opacity,
      }}
      transition={{ type: 'spring', stiffness: 200, damping: 26, mass: 0.7 }}
    >
      <motion.div
        className="relative w-full h-full preserve-3d"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* FRONT */}
        <div
          className={cn(
            'absolute inset-0 rounded-3xl overflow-hidden backface-hidden',
            'border-2 bg-card',
            isActive && !reduce && !paused && !isMobile && 'card-sheen',
          )}
          style={{
            borderColor: `hsl(${toneVar} / 0.5)`,
            boxShadow: `0 20px 40px -16px hsl(${toneVar} / 0.5), inset 0 0 0 1px hsl(${toneVar} / 0.15)`,
            backfaceVisibility: 'hidden',
          }}
        >
          {/* gradient background */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(60% 60% at 50% 20%, hsl(${toneVar} / 0.25), transparent 70%), linear-gradient(180deg, hsl(var(--card)) 0%, hsl(${toneVar} / 0.06) 100%)`,
            }}
          />
          {/* grid */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          {/* ribbon */}
          <div
            className="absolute top-4 -right-10 rotate-45 py-1 w-40 text-center text-[10px] font-bold uppercase tracking-wider shadow-md"
            style={{ background: `hsl(${toneVar})`, color: `hsl(${toneFg})` }}
          >
            {card.role}
          </div>

          {/* number */}
          <div className="absolute top-3 left-4 font-mono text-[10px] sm:text-xs font-bold tracking-wider text-muted-foreground">
            Nº {card.number} <span className="opacity-50">/ 06</span>
          </div>

          {/* brasão */}
          <div className="relative flex flex-col items-center pt-12 sm:pt-20 px-5">
            <motion.div
              className="h-20 w-20 sm:h-28 sm:w-28 rounded-full flex items-center justify-center border-4"
              style={{
                background: `radial-gradient(circle at 30% 30%, hsl(${toneVar} / 0.9), hsl(${toneVar}))`,
                color: `hsl(${toneFg})`,
                borderColor: `hsl(${toneVar} / 0.35)`,
                boxShadow: `0 20px 40px -12px hsl(${toneVar} / 0.7), inset 0 -6px 12px hsl(0 0% 0% / 0.15)`,
              }}
              animate={isActive && !reduce && !isMobile ? { rotate: [0, 3, -3, 0] } : undefined}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <IconEl className="h-9 w-9 sm:h-12 sm:w-12" strokeWidth={2.2} />
            </motion.div>

            <h3 className="font-display mt-4 sm:mt-5 text-xl sm:text-3xl font-extrabold text-center">
              {card.category}
            </h3>

            {/* slug chip */}
            <div className="mt-2 sm:mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border bg-background font-mono text-[10px] sm:text-xs">
              <Lock className="h-3 w-3" style={{ color: 'hsl(var(--success))' }} />
              <span className="font-semibold" style={{ color: `hsl(${toneVar})` }}>{card.slug}</span>
              <span className="text-muted-foreground hidden sm:inline">.uselivre.com.br</span>
            </div>

            {/* feature tags */}
            <div className="mt-3 sm:mt-4 flex flex-wrap justify-center gap-1.5 px-2">
              {card.features.map((f) => (
                <span
                  key={f}
                  className="text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border"
                  style={{ color: `hsl(${toneVar})`, borderColor: `hsl(${toneVar} / 0.3)` }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* footer */}
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <RotateCw className="h-3 w-3" /> {isActive ? (isMobile ? 'toque para virar' : 'clique para virar') : ''}
          </div>

          {/* foils — only on active desktop */}
          {isActive && !isMobile && (
            <>
              <div
                aria-hidden
                className="absolute inset-0 foil-diagonal"
                style={{ opacity: 0.35, transform: `translateX(${(tilt.mx - 50) * 0.3}px)` }}
              />
              <div
                aria-hidden
                className="absolute inset-0 foil-conic"
                style={{
                  ['--foil-x' as string]: `${tilt.mx}%`,
                  ['--foil-y' as string]: `${tilt.my}%`,
                }}
              />
            </>
          )}
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 rounded-3xl overflow-hidden backface-hidden border-2 bg-card p-5 sm:p-6 flex flex-col"
          style={{
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            borderColor: `hsl(${toneVar} / 0.5)`,
            boxShadow: `0 20px 40px -16px hsl(${toneVar} / 0.5)`,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center"
              style={{ background: `hsl(${toneVar} / 0.15)`, color: `hsl(${toneVar})` }}
            >
              <IconEl className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Nº {card.number}</div>
              <h3 className="font-display text-base sm:text-lg font-extrabold truncate">{card.category}</h3>
            </div>
          </div>

          <p className="mt-3 text-[11px] sm:text-xs text-muted-foreground">
            Ferramentas incluídas na assinatura:
          </p>
          <ul className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2 flex-1">
            {card.tools.map((t) => (
              <li key={t.label} className="flex items-center gap-2 text-xs sm:text-sm">
                <span
                  className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `hsl(${toneVar} / 0.12)`, color: `hsl(${toneVar})` }}
                >
                  <t.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </span>
                <span className="font-medium">{t.label}</span>
              </li>
            ))}
          </ul>

          <Button
            asChild
            className="w-full font-semibold mt-2"
            style={{
              background: `hsl(${toneVar})`,
              color: `hsl(${toneFg})`,
            }}
          >
            <a href="#form" onClick={(e) => e.stopPropagation()}>
              Começar como {card.role}
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CardCarousel() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [hover, setHover] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const reduce = useReducedMotion();
  const isMobile = useIsMobile();

  const total = CARDS.length;

  const go = useCallback((delta: number) => {
    setIndex((i) => (i + delta + total) % total);
    setInteracted(true);
  }, [total]);

  const goTo = useCallback((i: number) => {
    setIndex(i);
    setInteracted(true);
  }, []);

  // Autoplay — pausa em hover/interaction/reduced-motion; no mobile só até primeira interação
  useEffect(() => {
    if (reduce || hover || interacted) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % total), isMobile ? 5200 : 4600);
    return () => clearInterval(t);
  }, [reduce, hover, interacted, total, isMobile]);

  const offsets = useMemo(() =>
    CARDS.map((_, i) => {
      let off = i - index;
      if (off > total / 2) off -= total;
      if (off < -total / 2) off += total;
      return off;
    }),
    [index, total]
  );

  const active = CARDS[index];

  // Swipe (touch + pointer) on the carousel wrapper
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    touchRef.current = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? 1 : -1);
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className="relative perspective-deep h-[400px] sm:h-[500px] overflow-hidden touch-pan-y"
        aria-live="polite"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {CARDS.map((c, i) => (
          <CollectibleCardView
            key={c.id}
            card={c}
            offset={offsets[i]}
            flipped={!!flipped[c.id]}
            onFlip={() => setFlipped((f) => ({ ...f, [c.id]: !f[c.id] }))}
            onClickInactive={() => goTo(i)}
            paused={hover || interacted}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* arrows */}
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Carta anterior"
        className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border bg-card/90 backdrop-blur flex items-center justify-center shadow-md hover:bg-card active:scale-95 transition-all z-40"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Próxima carta"
        className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border bg-card/90 backdrop-blur flex items-center justify-center shadow-md hover:bg-card active:scale-95 transition-all z-40"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* rail */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {CARDS.map((c, i) => {
          const isActive = i === index;
          const toneVar = c.tone === 'vendor' ? 'var(--vendor)' : 'var(--hub-services)';
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => goTo(i)}
              aria-current={isActive}
              className={cn(
                'text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full border transition-all',
                isActive ? 'shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              style={isActive ? {
                background: `hsl(${toneVar} / 0.12)`,
                color: `hsl(${toneVar})`,
                borderColor: `hsl(${toneVar} / 0.45)`,
              } : undefined}
            >
              {c.category}
            </button>
          );
        })}
      </div>

      {/* active caption for screen readers */}
      <div className="sr-only">Carta ativa: {active.category} — {active.role}</div>
    </div>
  );
}

// ============================================================
// Lead form
// ============================================================

function LeadForm() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', phone: '', social: '' });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border bg-card p-5 sm:p-7 shadow-sm space-y-4">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" /> Seu nome
        </label>
        <Input
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Como podemos te chamar?"
          className="mt-1.5"
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" /> Nome do estabelecimento
        </label>
        <div className="mt-1.5 flex rounded-md border overflow-hidden focus-within:ring-2 focus-within:ring-ring">
          <input
            required
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder="suapadaria"
            className="flex-1 min-w-0 bg-background px-3 py-2 text-sm outline-none font-mono"
          />
          <span className="inline-flex items-center px-2 sm:px-3 text-[11px] sm:text-xs font-mono bg-muted text-muted-foreground border-l shrink-0">
            .uselivre.com.br
          </span>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5" /> WhatsApp
        </label>
        <Input
          required
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="(00) 00000-0000"
          className="mt-1.5"
          inputMode="tel"
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Instagram className="h-3.5 w-3.5" /> Rede social <span className="text-muted-foreground/70 normal-case font-normal">(opcional)</span>
        </label>
        <Input
          value={form.social}
          onChange={(e) => setForm((f) => ({ ...f, social: e.target.value }))}
          placeholder="@seuinsta"
          className="mt-1.5"
        />
      </div>

      <Button
        type="submit"
        disabled={sent}
        className={cn(
          'w-full h-12 font-semibold text-base transition-all',
          sent && 'pointer-events-none'
        )}
        style={{
          background: sent ? 'hsl(var(--success))' : 'hsl(var(--vendor))',
          color: sent ? 'hsl(var(--success-foreground))' : 'hsl(var(--vendor-foreground))',
        }}
      >
        {sent ? (
          <>
            <Check className="mr-2 h-5 w-5" />
            Recebemos! A gente te chama.
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Quero testar grátis
          </>
        )}
      </Button>
    </form>
  );
}

// ============================================================
// Page
// ============================================================

export default function SejaParceiro() {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* NAV */}
      <header className="border-b bg-background/75 backdrop-blur sticky top-0 z-40">
        <div className="container flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Voltar para home"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
            <div className="h-5 w-px bg-border hidden sm:block" aria-hidden />
            <Link to="/" aria-label="Início" className="shrink-0">
              <Logo className="h-9 sm:h-10" />
            </Link>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
              className="h-9 w-9 rounded-full border flex items-center justify-center hover:bg-muted transition-colors shrink-0"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Button asChild variant="ghost" size="sm" className="font-semibold px-2 sm:px-3">
              <Link to="/acesso"><LogIn className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Entrar</span></Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="font-semibold text-[hsl(var(--vendor-foreground))] px-2.5 sm:px-3"
              style={{ background: 'hsl(var(--vendor))' }}
            >
              <a href="#form">Testar grátis</a>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(60% 60% at 10% 10%, hsl(var(--vendor) / 0.28), transparent 60%), radial-gradient(55% 55% at 95% 90%, hsl(var(--hub-services) / 0.25), transparent 60%)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="container py-12 sm:py-20 relative">
          <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center [&>*]:min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <span
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
                style={{ background: 'hsl(var(--success) / 0.15)', color: 'hsl(var(--success))' }}
              >
                <Gift className="h-3.5 w-3.5" /> 1 mês grátis — sem cartão, sem compromisso
              </span>
              <h1 className="font-display mt-4 text-[2rem] sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
                Sua loja. Seu{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(90deg, hsl(var(--vendor)), hsl(var(--hub-services)))' }}
                >
                  endereço
                </span>
                . Zero comissão.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl">
                Monte sua vitrine no Use Livre e receba pedidos num link só seu — <span className="font-mono text-foreground break-all">sualoja.uselivre.com.br</span>.
                Você fica com 100% da venda; a gente vive de assinatura, não da sua comissão.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  size="lg"
                  className="font-semibold text-[hsl(var(--vendor-foreground))] shadow-md"
                  style={{ background: 'hsl(var(--vendor))', boxShadow: '0 10px 30px -10px hsl(var(--vendor))' }}
                >
                  <a href="#form"><Store className="mr-2 h-4 w-4" />Quero testar grátis<ArrowRight className="ml-1 h-4 w-4" /></a>
                </Button>
                <Button asChild size="lg" variant="outline" className="font-semibold">
                  <a href="#caminhos">Ver como funciona</a>
                </Button>
              </div>

              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {[
                  'Zero comissão',
                  'Contato direto no WhatsApp',
                  'A gente te chama pra ativar',
                ].map((t) => (
                  <li key={t} className="inline-flex items-center gap-1.5">
                    <span
                      className="h-4 w-4 rounded-full flex items-center justify-center"
                      style={{ background: 'hsl(var(--success) / 0.18)', color: 'hsl(var(--success))' }}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </motion.div>

            <div className="relative">
              <BrowserPreview />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="border-b bg-muted/30">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="container py-8 grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { icon: Globe, title: 'Endereço próprio', desc: 'sualoja.uselivre.com.br', tone: 'vendor' },
            { icon: Percent, title: 'Zero comissão', desc: '100% da venda é sua', tone: 'success' },
            { icon: MessageCircle, title: 'Contato direto', desc: 'WhatsApp sem intermediário', tone: 'hub-services' },
            { icon: Zap, title: 'Setup em minutos', desc: 'Sem burocracia', tone: 'warning' },
          ].map((t) => (
            <motion.div key={t.title} variants={fadeUp} className="flex items-start gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `hsl(var(--${t.tone}) / 0.15)`, color: `hsl(var(--${t.tone}))` }}
              >
                <t.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm sm:text-base">{t.title}</div>
                <div className="text-xs sm:text-sm text-muted-foreground truncate">{t.desc}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CARROSSEL DE CARTAS COLECIONÁVEIS */}
      <section id="caminhos" className="scroll-mt-20 border-b relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-60 pointer-events-none"
          style={{
            background:
              'radial-gradient(40% 40% at 20% 30%, hsl(var(--vendor) / 0.15), transparent 60%), radial-gradient(40% 40% at 80% 70%, hsl(var(--hub-services) / 0.15), transparent 60%)',
          }}
        />
        <div className="container py-16 sm:py-24 relative">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            className="max-w-2xl mx-auto text-center mb-10"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Uma plataforma, dois perfis
            </span>
            <h2 className="font-display mt-2 text-3xl sm:text-5xl font-extrabold">
              Escolha seu{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(90deg, hsl(var(--vendor)), hsl(var(--hub-services)))' }}
              >
                caminho
              </span>
            </h2>
            <p className="mt-3 text-muted-foreground">
              Navegue pelas possibilidades e vire a carta pra ver as ferramentas.
            </p>
          </motion.div>

          <CardCarousel />
        </div>
      </section>

      {/* COMPARATIVO — "O que você NÃO paga" */}
      <section className="border-b">
        <div className="container py-16 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            className="max-w-2xl mb-10"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold">O que você NÃO paga</h2>
            <p className="text-muted-foreground mt-3">
              Assinatura previsível no lugar de comissão sobre cada pedido.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              className="rounded-2xl border bg-card p-6 sm:p-8 relative"
              style={{ boxShadow: '0 14px 34px -20px hsl(var(--destructive))' }}
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Marketplace tradicional
              </div>
              <div
                className="font-display mt-2 text-4xl sm:text-5xl font-extrabold"
                style={{ color: 'hsl(var(--destructive))' }}
              >
                −12 a 30%
              </div>
              <div className="text-sm text-muted-foreground">tira do seu bolso a cada venda</div>
              <ul className="mt-5 space-y-3">
                {[
                  'Comissão por pedido',
                  'Sua marca escondida atrás do app do marketplace',
                  'Cliente do marketplace, não seu',
                ].map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm line-through opacity-70">
                    <XIcon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'hsl(var(--destructive))' }} />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              className="rounded-2xl border bg-card p-6 sm:p-8 relative"
              style={{ boxShadow: '0 14px 34px -20px hsl(var(--success))' }}
            >
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--success))' }}>
                Com o Use Livre
              </div>
              <div
                className="font-display mt-2 text-4xl sm:text-5xl font-extrabold"
                style={{ color: 'hsl(var(--success))' }}
              >
                R$ 0
              </div>
              <div className="text-sm text-muted-foreground">de comissão. Só a assinatura.</div>
              <ul className="mt-5 space-y-3">
                {[
                  '100% da venda é sua',
                  'Sua marca, seu link, seus clientes',
                  'Preço previsível todo mês',
                ].map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm">
                    <span
                      className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'hsl(var(--success) / 0.15)', color: 'hsl(var(--success))' }}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="font-medium">{s}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="border-b">
        <div className="container py-16 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            className="max-w-2xl mb-10"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold">Como funciona</h2>
            <p className="text-muted-foreground mt-3">Três passos e a sua loja tá no ar.</p>
          </motion.div>

          <motion.ol
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              { n: '01', title: 'Deixe seus dados', desc: 'Formulário rápido: nome, WhatsApp e o slug do seu estabelecimento.' },
              { n: '02', title: 'A gente te chama', desc: 'Nosso time entra em contato pra apresentar a plataforma sem enrolação.' },
              { n: '03', title: '1 mês grátis', desc: 'Sua loja no ar em minutos: sualoja.uselivre.com.br.' },
            ].map((s) => (
              <motion.li
                key={s.n}
                variants={fadeUp}
                className="relative rounded-2xl border bg-card p-6 shadow-sm"
              >
                <div
                  className="font-display absolute -top-4 left-6 h-10 px-3 rounded-full flex items-center justify-center text-sm font-extrabold font-mono"
                  style={{
                    background: 'hsl(var(--vendor))',
                    color: 'hsl(var(--vendor-foreground))',
                    boxShadow: '0 10px 24px -10px hsl(var(--vendor))',
                  }}
                >
                  {s.n}
                </div>
                <h3 className="font-display mt-3 text-lg font-bold">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{s.desc}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* CTA FINAL — FORM */}
      <section id="form" className="scroll-mt-20 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{
            background:
              'radial-gradient(45% 55% at 30% 40%, hsl(var(--vendor) / 0.28), transparent 70%), radial-gradient(45% 55% at 75% 60%, hsl(var(--hub-services) / 0.28), transparent 70%)',
          }}
        />
        <div className="container py-16 sm:py-24 relative">
          <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center [&>*]:min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
            >
              <span
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
                style={{ background: 'hsl(var(--success) / 0.15)', color: 'hsl(var(--success))' }}
              >
                <Gift className="h-3.5 w-3.5" /> 1 mês grátis
              </span>
              <h2 className="font-display mt-4 text-3xl sm:text-5xl font-extrabold leading-[1.05]">
                Deixe seus dados — <br className="hidden sm:block" />a gente te chama.
              </h2>
              <p className="text-muted-foreground mt-4 max-w-md">
                Sem cartão, sem compromisso. A gente entra em contato pra ativar sua loja com você.
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                {[
                  '1 mês grátis pra testar tudo',
                  'Zero comissão sobre vendas',
                  'Cancele quando quiser',
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span
                      className="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'hsl(var(--success) / 0.15)', color: 'hsl(var(--success))' }}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="font-medium">{t}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
            >
              <LeadForm />
            </motion.div>
          </div>
        </div>
      </section>

    </div>
  );
}
