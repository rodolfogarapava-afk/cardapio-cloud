import { VendorDomain } from '@/types';

// ============================================
// Subdomínios de vendor (multi-tenant, front + mock)
// Host completo = `${subdomain}.${DOMAIN_SUFFIX}`.
// ============================================

export const DOMAIN_SUFFIX = 'uselivre.com.br';
export const SUBDOMAIN_MIN = 3;
export const SUBDOMAIN_MAX = 30;

/** Palavras reservadas — nunca podem ser usadas como subdomínio de tenant. */
export const RESERVED_SUBDOMAINS: readonly string[] = [
  'www', 'admin', 'api', 'app', 'mail', 'cdn', 'static',
  'painel', 'marketplace', 'uselivre', 'suporte',
];

const SUBDOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

/**
 * Converte um nome de estabelecimento em um subdomínio válido.
 * - lowercase
 * - remove acentos (NFD + strip diacríticos)
 * - troca espaços por hífen
 * - remove caracteres inválidos
 * - colapsa hífens consecutivos e trims
 */
export function slugifySubdomain(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SUBDOMAIN_MAX);
}

/**
 * Valida um subdomínio. Retorna null se OK, ou uma mensagem de erro em pt-BR.
 * `takenBy` mapeia subdomain -> vendorId em uso (para checagem de duplicidade).
 * `currentVendorId` é opcional (o próprio vendor não colide consigo mesmo).
 */
export function validateSubdomain(
  slug: string,
  takenBy: Record<string, string>,
  currentVendorId?: string,
): string | null {
  if (!slug) return 'Informe um subdomínio.';
  if (slug.length < SUBDOMAIN_MIN) return `Mínimo de ${SUBDOMAIN_MIN} caracteres.`;
  if (slug.length > SUBDOMAIN_MAX) return `Máximo de ${SUBDOMAIN_MAX} caracteres.`;
  if (slug.includes('--')) return 'Não use "--" seguidos.';
  if (!SUBDOMAIN_REGEX.test(slug)) return 'Use apenas letras minúsculas, números e hífen.';
  if (RESERVED_SUBDOMAINS.includes(slug)) return 'Este subdomínio é reservado.';
  const owner = takenBy[slug];
  if (owner && owner !== currentVendorId) return 'Este subdomínio já está em uso.';
  return null;
}

/** Monta o host completo `${subdomain}.uselivre.com.br`. */
export function fullHost(slug: string): string {
  return `${slug}.${DOMAIN_SUFFIX}`;
}

/** Monta a URL pública `https://${subdomain}.uselivre.com.br`. */
export function fullUrl(slug: string): string {
  return `https://${fullHost(slug)}`;
}

// ---- Mock inicial (alinhado a src/data/adminVendors.ts) ----
export const seedVendorDomains: VendorDomain[] = [
  { vendorId: '1', subdomain: 'sabor-e-arte',    status: 'active',  updatedAt: '2025-06-16T10:00:00Z' },
  { vendorId: '2', subdomain: 'pizza-express',   status: 'active',  updatedAt: '2025-07-21T14:20:00Z' },
  { vendorId: '3', subdomain: 'sushi-zen',       status: 'pending', updatedAt: '2025-08-11T09:15:00Z' },
  { vendorId: '4', subdomain: 'acai-tropical',   status: 'error',   updatedAt: '2025-09-02T08:30:00Z' },
];
