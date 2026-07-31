import { VendorStats } from '@/types';

export const seedVendors: VendorStats[] = [
  { id: '1', name: 'Sabor & Arte',      category: 'food',     totalOrders: 567, totalRevenue: 45890, rating: 4.8, status: 'active',   createdAt: '2025-06-15' },
  { id: '2', name: 'Pizza Express',     category: 'food',     totalOrders: 423, totalRevenue: 38760, rating: 4.6, status: 'active',   createdAt: '2025-07-20' },
  { id: '3', name: 'Sushi Zen',         category: 'food',     totalOrders: 312, totalRevenue: 52340, rating: 4.9, status: 'active',   createdAt: '2025-08-10' },
  { id: '4', name: 'Açaí Tropical',     category: 'food',     totalOrders: 289, totalRevenue: 18920, rating: 4.7, status: 'inactive', createdAt: '2025-09-01' },
  { id: '5', name: 'Churrasco Gaúcho',  category: 'food',     totalOrders:   0, totalRevenue:     0, rating: 0,   status: 'pending',  createdAt: '2026-01-25' },
];
