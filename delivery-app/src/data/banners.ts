import { useSyncExternalStore } from 'react';

export interface PromoBanner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  ctaText: string;
  ctaHref: string;
  /** Tailwind classes for the colored side block (uses semantic tokens). */
  tone: string;
  active: boolean;
}

let banners: PromoBanner[] = [
  {
    id: 'b1',
    title: 'Frete grátis hoje',
    subtitle: 'Em pedidos acima de R$ 30 nos restaurantes selecionados',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&h=300&fit=crop',
    ctaText: 'Ver restaurantes',
    ctaHref: '/alimentacao',
    tone: 'from-primary/90 via-primary/70 to-transparent',
    active: true,
  },
  {
    id: 'b2',
    title: '20% OFF em pizzas',
    subtitle: 'Use o cupom PIZZA20 — válido até domingo',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&h=300&fit=crop',
    ctaText: 'Aproveitar',
    ctaHref: '/alimentacao',
    tone: 'from-warning/90 via-warning/70 to-transparent',
    active: true,
  },
  {
    id: 'b3',
    title: 'Novos prestadores na cidade',
    subtitle: 'Encanadores, eletricistas e jardineiros perto de você',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=900&h=300&fit=crop',
    ctaText: 'Conhecer',
    ctaHref: '/servicos',
    tone: 'from-success/90 via-success/70 to-transparent',
    active: true,
  },
];

const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export const TONE_PRESETS: { id: string; label: string; value: string }[] = [
  { id: 'primary', label: 'Verde (primary)', value: 'from-primary/90 via-primary/70 to-transparent' },
  { id: 'warning', label: 'Âmbar (warning)', value: 'from-warning/90 via-warning/70 to-transparent' },
  { id: 'success', label: 'Sucesso', value: 'from-success/90 via-success/70 to-transparent' },
  { id: 'destructive', label: 'Destaque (destructive)', value: 'from-destructive/90 via-destructive/70 to-transparent' },
  { id: 'accent', label: 'Accent', value: 'from-accent/90 via-accent/70 to-transparent' },
];

export function getBanners(): PromoBanner[] { return banners; }
export function getActiveBanners(): PromoBanner[] { return banners.filter(b => b.active); }

export function upsertBanner(b: PromoBanner) {
  const exists = banners.some(x => x.id === b.id);
  banners = exists ? banners.map(x => (x.id === b.id ? b : x)) : [...banners, b];
  emit();
}
export function removeBanner(id: string) {
  banners = banners.filter(b => b.id !== id);
  emit();
}
export function toggleBanner(id: string) {
  banners = banners.map(b => (b.id === id ? { ...b, active: !b.active } : b));
  emit();
}
export function newBannerId() {
  return `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function useBanners(): PromoBanner[] {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb); },
    () => banners,
    () => banners,
  );
}

/** @deprecated use useBanners()/getActiveBanners() */
export const mockBanners = banners;
