import { useSyncExternalStore } from 'react';

/**
 * Mock store para preferências de visibilidade dos comentários (texto) de
 * avaliações, por dono (prestador ou lojista). As estrelas/nota sempre são
 * públicas — este switch controla apenas os textos escritos pelos clientes.
 *
 * Chave sugerida:
 *   - prestador: provider.id (ex: 'p1')
 *   - lojista:   restaurant.slug (ex: 'sabor-arte')
 */

const state = new Map<string, boolean>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

// Snapshot estável (útil para useSyncExternalStore evitar re-render loop)
let snapshot: Record<string, boolean> = {};
const rebuildSnapshot = () => {
  snapshot = Object.fromEntries(state.entries());
};

export function getReviewsVisibility(ownerId: string): boolean {
  // padrão: comentários visíveis
  return state.has(ownerId) ? !!state.get(ownerId) : true;
}

export function setReviewsVisibility(ownerId: string, value: boolean) {
  state.set(ownerId, value);
  rebuildSnapshot();
  emit();
}

export function useReviewsVisibility(ownerId: string): boolean {
  const map = useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb); },
    () => snapshot,
    () => snapshot,
  );
  return ownerId in map ? !!map[ownerId] : true;
}

/**
 * Decide, no lado público, se os comentários devem aparecer.
 * Regras:
 *  - Se o dono estiver INATIVO → esconde comentários (estrelas seguem visíveis).
 *  - Se o dono desligou o switch → esconde comentários.
 */
export function canShowPublicComments(opts: { ownerId: string; isActive: boolean }): {
  showComments: boolean;
  hiddenReason: 'inactive' | 'owner_off' | null;
} {
  const showByOwner = getReviewsVisibility(opts.ownerId);
  if (!opts.isActive) return { showComments: false, hiddenReason: 'inactive' };
  if (!showByOwner) return { showComments: false, hiddenReason: 'owner_off' };
  return { showComments: true, hiddenReason: null };
}

/** Hook conveniente pro público. */
export function usePublicCommentsVisibility(opts: { ownerId: string; isActive: boolean }) {
  const on = useReviewsVisibility(opts.ownerId);
  if (!opts.isActive) return { showComments: false, hiddenReason: 'inactive' as const };
  if (!on) return { showComments: false, hiddenReason: 'owner_off' as const };
  return { showComments: true, hiddenReason: null };
}
