import type { ComplementGroup } from '@/types';

export type SelectionType = 'single' | 'multiple' | 'repeat';
export type PricingMode = 'sum' | 'avg' | 'max' | 'min';

/** Retorna o modo de seleção efetivo do grupo, com fallback compatível com dados antigos. */
export function getSelectionType(group: ComplementGroup): SelectionType {
  if (group.selectionType) return group.selectionType;
  if (group.max === 1) return 'single';
  if (group.kind === 'flavor' || group.pricingMode === 'max') return 'multiple';
  return 'repeat';
}

export function getPricingMode(group: ComplementGroup): PricingMode {
  return group.pricingMode ?? 'sum';
}

/**
 * Calcula o preço efetivo cobrado pelo grupo dadas as opções escolhidas.
 * Recebe a lista de preços (repetida por unidade em modo 'repeat').
 */
export function computeGroupPrice(prices: number[], mode: PricingMode): number {
  if (prices.length === 0) return 0;
  switch (mode) {
    case 'sum': return prices.reduce((s, p) => s + p, 0);
    case 'avg': return prices.reduce((s, p) => s + p, 0) / prices.length;
    case 'max': return Math.max(...prices);
    case 'min': return Math.min(...prices);
  }
}

export const PRICING_MODE_LABEL: Record<PricingMode, string> = {
  sum: 'Somar',
  avg: 'Média',
  max: 'Mais caro',
  min: 'Mais barato',
};

export const PRICING_MODE_EXAMPLE: Record<PricingMode, string> = {
  sum: 'Cobra a soma dos preços das opções escolhidas.',
  avg: 'Cobra a média dos preços das opções escolhidas.',
  max: 'Cobra o valor da opção mais cara escolhida (ex.: pizza meia a meia).',
  min: 'Cobra o valor da opção mais barata escolhida.',
};

export const SELECTION_TYPE_LABEL: Record<SelectionType, string> = {
  single: 'Uma opção',
  multiple: 'Várias sem repetir',
  repeat: 'Com repetição',
};

export const SELECTION_TYPE_HINT: Record<SelectionType, string> = {
  single: 'Cliente escolhe apenas 1 (bolinha / radio).',
  multiple: 'Cliente marca de min a max opções, sem repetir (quadradinho / checkbox).',
  repeat: 'Cliente adiciona quantas quiser da mesma opção (stepper +/−).',
};
