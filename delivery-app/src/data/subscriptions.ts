// Mock SaaS subscription data (Use Livre — plano por assinatura, 1 mês grátis).
// Sem comissão sobre vendas.

import type { VendorCategory } from '@/lib/vendorIcon';

export type SubscriptionStatus = 'ativo' | 'trial' | 'inadimplente' | 'cancelado';
export type SubscriptionPlan = 'Essencial' | 'Profissional' | 'Avançado';

export interface Subscriber {
  id: string;
  name: string;
  category: VendorCategory;
  plan: SubscriptionPlan;
  monthlyPrice: number;
  status: SubscriptionStatus;
  nextCharge: string;
  since: string;
}

// MRR (receita recorrente mensal) — últimos 8 meses
export const mrrSeries: { month: string; mrr: number }[] = [
  { month: 'Nov', mrr: 8420 },
  { month: 'Dez', mrr: 9180 },
  { month: 'Jan', mrr: 10240 },
  { month: 'Fev', mrr: 11380 },
  { month: 'Mar', mrr: 12760 },
  { month: 'Abr', mrr: 13920 },
  { month: 'Mai', mrr: 15140 },
  { month: 'Jun', mrr: 16480 },
];

export const subscribers: Subscriber[] = [
  { id: 's1', name: 'Sabor & Arte',    category: 'food',     plan: 'Profissional', monthlyPrice: 149, status: 'ativo',        nextCharge: '2026-07-12', since: '2025-09-04' },
  { id: 's2', name: 'Pizza Express',   category: 'food',     plan: 'Profissional', monthlyPrice: 149, status: 'ativo',        nextCharge: '2026-07-18', since: '2025-11-22' },
  { id: 's3', name: 'Sushi Zen',       category: 'food',     plan: 'Avançado',     monthlyPrice: 249, status: 'ativo',        nextCharge: '2026-07-02', since: '2025-06-30' },
  { id: 's4', name: 'Açaí Tropical',   category: 'food',     plan: 'Essencial',    monthlyPrice:  79, status: 'trial',        nextCharge: '2026-07-25', since: '2026-06-25' },
  { id: 's5', name: 'Doce Encanto',    category: 'food',     plan: 'Essencial',    monthlyPrice:  79, status: 'inadimplente', nextCharge: '2026-06-20', since: '2025-12-10' },
  { id: 's6', name: 'Marcos Eletric.', category: 'other',    plan: 'Essencial',    monthlyPrice:  79, status: 'ativo',        nextCharge: '2026-07-08', since: '2025-10-14' },
  { id: 's7', name: 'Salão J.',        category: 'other',    plan: 'Profissional', monthlyPrice: 149, status: 'trial',        nextCharge: '2026-07-28', since: '2026-06-28' },
  { id: 's8', name: 'Padaria da Ana',  category: 'market',   plan: 'Profissional', monthlyPrice: 149, status: 'cancelado',    nextCharge: '—',          since: '2025-08-12' },
];
