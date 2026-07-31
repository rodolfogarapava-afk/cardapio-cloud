import { Home, ClipboardList, Store, User, LogIn } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const HIDDEN_PATTERNS: RegExp[] = [
  /^\/vendor(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/prestador(\/|$)/,
  /^\/acesso-interno$/,
  /^\/acesso$/,
  /^\/entrar(\/|$)/,
  /^\/cadastro(\/|$)/,
  /^\/login$/,
  /^\/seja-parceiro$/,
  /^\/checkout(\/|$)/,
  /^\/pedido-confirmado$/,
  /^\/pedido\//,
  /^\/pedidos(\/|$)/,
  // Cardápio tem barra inferior contextual própria (Cardápio · Ofertas · Pedidos · Perfil)
  /^\/cardapio(\/|$)/,
  /^\/acompanhar(\/|$)/,
  // Perfil do prestador tem CTA fixo próprio (Ligar · Agendar · WhatsApp)
  /^\/servicos\/[^/]+$/,
];

export function AppBottomNav() {
  const { pathname } = useLocation();
  const { isAuthenticated, user } = useAuth();

  if (HIDDEN_PATTERNS.some((r) => r.test(pathname))) return null;

  const isClientLogged = isAuthenticated && user?.role === 'client';

  const items = [
    {
      key: 'inicio',
      label: 'Início',
      icon: Home,
      to: '/',
      match: (p: string) => p === '/',
    },
    {
      key: 'pedidos',
      label: 'Pedidos',
      icon: ClipboardList,
      to: '/historico',
      match: (p: string) => p.startsWith('/historico'),
    },
    {
      key: 'parceiros',
      label: 'Parceiros',
      icon: Store,
      to: '/seja-parceiro',
      match: (p: string) => p === '/seja-parceiro',
    },
    isClientLogged
      ? {
          key: 'perfil',
          label: 'Perfil',
          icon: User,
          to: '/perfil',
          match: (p: string) => p === '/perfil',
        }
      : {
          key: 'acesso',
          label: 'Acesso',
          icon: LogIn,
          to: '/acesso',
          match: (p: string) => p === '/acesso',
        },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        'fixed z-40 bg-background/95 backdrop-blur',
        // Mobile: full-width bottom bar
        'inset-x-0 bottom-0 border-t pb-[env(safe-area-inset-bottom)]',
        // Desktop: floating pill dock centered
        'sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-4 sm:border sm:rounded-2xl sm:shadow-lg sm:pb-0 sm:w-[420px]',
      )}
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <li key={item.key} className="relative">
              <NavLink
                to={item.to}
                className={cn(
                  'w-full flex flex-col items-center justify-center gap-0.5 py-2.5 sm:py-3 text-[10px] sm:text-[11px] font-medium transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary sm:hidden" />
                )}
                <Icon className={cn('h-5 w-5', active && 'sm:fill-primary/10')} />
                <span className="leading-none">{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
