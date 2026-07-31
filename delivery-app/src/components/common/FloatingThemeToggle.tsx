import { ThemeToggle } from './ThemeToggle';
import { useLocation } from 'react-router-dom';

const HIDDEN: RegExp[] = [
  /^\/vendor(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/prestador(\/|$)/,
  /^\/acesso-interno$/,
  /^\/cardapio(\/|$)/,
  /^\/checkout(\/|$)/,
  /^\/pedido(\/|$)/,
  /^\/pedido-confirmado$/,
  /^\/pedidos(\/|$)/,
];

/**
 * Discrete floating theme toggle available on client-facing pages.
 * Positioned bottom-left to avoid conflicting with headers (cart, logo, back)
 * and the bottom nav (which sits centered/right on desktop and full-width mobile).
 */
export function FloatingThemeToggle() {
  const { pathname } = useLocation();
  if (HIDDEN.some((r) => r.test(pathname))) return null;

  // Hidden on mobile/tablet to avoid overlapping cards, images and CTAs.
  // On those viewports users toggle theme via the Perfil menu (inline entry).
  return (
    <div
      className="hidden lg:block fixed z-[55] lg:left-4 lg:bottom-4"
      aria-hidden={false}
    >
      <ThemeToggle className="shadow-lg" />
    </div>
  );
}
