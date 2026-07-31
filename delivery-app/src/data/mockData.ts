// Mock Data para o Painel Vendor

export interface OrderItemModifier {
  type: 'option' | 'addon' | 'removal' | 'preparation';
  label: string;          // ex: "Granola", "Nutella", "Sem picles", "Mal passado"
  qty?: number;           // default 1; só renderiza se > 1
  price?: number;         // só para addon
  groupName?: string;     // ex: "Acompanhamentos", "Sabores", "Borda"
}

export interface OrderItemSummary {
  qty: number;
  name: string;
  unitPrice?: number;     // opcional na Demanda; obrigatório em Relatórios
  modifiers?: OrderItemModifier[];
  note?: string;
}

// Em Relatórios, o item exige preço unitário
export interface OrderItemDetail extends OrderItemSummary {
  unitPrice: number;
}

export interface Order {
  id: string;
  customer: string;
  customerPhone?: string;
  items: string[];
  itemsSummary?: OrderItemSummary[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'in_transit' | 'delivered' | 'cancelled';
  date: string;
  address: string;
  neighborhood?: string;
  reference?: string;
  deliveryFee?: number;
  distanceKm?: number;
  paymentMethod: string;
}

export interface VendorOrderDetail {
  id: string;
  customer: string;
  customerPhone: string;
  items: OrderItemDetail[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'in_transit' | 'delivered' | 'cancelled';
  paymentMethod: string;
  address: string;
  neighborhood: string;
  distanceKm: number;
  createdAt: string;
  observation?: string;
  driverName?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: 'available' | 'busy' | 'offline';
  deliveries: number;
  rating: number;
  avatar: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  sku: string;
  image: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  minOrder: number;
  usageLimit: number;
  usedCount: number;
  expiresAt: string;
  active: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  estimatedTime: string;
  active: boolean;
}

export type ReviewSentiment = 'good' | 'neutral' | 'bad';

export interface Review {
  id: string;
  customer: string;
  sentiment: ReviewSentiment;
  comment: string;
  date: string;
  orderId: string;
  reply?: string;
  hidden?: boolean;
  photos?: string[];
  recommends?: boolean;
  remediated?: boolean;
}

import type { ScheduledBreak, DaySchedule, StoreSchedule } from '@/types';

export interface StoreSettings {
  name: string;
  slug: string;
  cnpj: string;
  logo: string;
  banner?: string;
  address: string;
  phone: string;
  email: string;
  schedule: StoreSchedule;
  openingHours: { day: string; open: string; close: string; closed: boolean }[];
  minOrderValue: number;
  acceptingOrders: boolean;
  prepTime?: string;
  socials?: { instagram?: string; facebook?: string };
}

export const mockOrders: Order[] = [
  {
    id: 'ORD-001', customer: 'Maria Silva', customerPhone: '(11) 98765-1234',
    items: ['Pizza Margherita', 'Coca-Cola 2L'],
    itemsSummary: [{ qty: 1, name: 'Pizza Margherita' }, { qty: 1, name: 'Coca-Cola 2L' }],
    total: 58.90, status: 'pending', date: '2026-01-09T14:30:00',
    address: 'Rua das Flores, 123', neighborhood: 'Centro', reference: 'Próximo à padaria',
    deliveryFee: 5.00, distanceKm: 1.8, paymentMethod: 'PIX'
  },
  {
    id: 'ORD-002', customer: 'João Santos', customerPhone: '(11) 97654-3210',
    items: ['Hambúrguer Artesanal', 'Batata Frita', 'Milkshake'],
    itemsSummary: [{ qty: 1, name: 'Hambúrguer Artesanal' }, { qty: 2, name: 'Porções de fritas' }, { qty: 1, name: 'Milkshake' }],
    total: 72.50, status: 'preparing', date: '2026-01-09T14:15:00',
    address: 'Av. Brasil, 456', neighborhood: 'Jardim América', reference: 'Edifício azul, apto 302',
    deliveryFee: 8.00, distanceKm: 3.2, paymentMethod: 'Cartão de Crédito'
  },
  {
    id: 'ORD-003', customer: 'Ana Oliveira', customerPhone: '(11) 91234-5678',
    items: ['Salada Caesar', 'Suco Natural'],
    itemsSummary: [{ qty: 1, name: 'Salada Caesar' }, { qty: 2, name: 'Suco Natural' }],
    total: 35.00, status: 'in_transit', date: '2026-01-09T13:45:00',
    address: 'Rua do Comércio, 789', neighborhood: 'Vila Nova',
    deliveryFee: 7.00, distanceKm: 2.5, paymentMethod: 'Cartão de Débito'
  },
  {
    id: 'ORD-004', customer: 'Carlos Mendes', customerPhone: '(11) 99876-5432',
    items: ['Combo Família', 'Refrigerante 2L x2'],
    itemsSummary: [{ qty: 1, name: 'Combo Família' }, { qty: 2, name: 'Refrigerante 2L' }],
    total: 129.90, status: 'delivered', date: '2026-01-09T12:00:00',
    address: 'Rua Principal, 321', neighborhood: 'Centro',
    deliveryFee: 5.00, distanceKm: 1.2, paymentMethod: 'Dinheiro'
  },
  {
    id: 'ORD-005', customer: 'Fernanda Lima', customerPhone: '(11) 93456-7890',
    items: ['Açaí 500ml'],
    itemsSummary: [{
      qty: 1, name: 'Açaí 500ml',
      modifiers: [
        { type: 'option', groupName: 'Acompanhamentos', label: 'Granola' },
        { type: 'option', groupName: 'Acompanhamentos', label: 'Leite em pó' },
        { type: 'option', groupName: 'Acompanhamentos', label: 'Leite condensado' },
        { type: 'addon', label: 'Nutella', price: 5.00 },
      ],
      note: 'Capricha na granola, por favor',
    }],
    total: 27.90, status: 'cancelled', date: '2026-01-09T11:30:00',
    address: 'Av. das Palmeiras, 654', neighborhood: 'Bela Vista',
    deliveryFee: 9.00, distanceKm: 4.1, paymentMethod: 'PIX'
  },
  {
    id: 'ORD-050', customer: 'Patrícia Rocha', customerPhone: '(11) 94321-8765',
    items: ['Pizza Grande', 'Guaraná 1L'],
    itemsSummary: [
      {
        qty: 1, name: 'Pizza Grande',
        modifiers: [
          { type: 'option', groupName: 'Sabores', label: '½ Calabresa' },
          { type: 'option', groupName: 'Sabores', label: '½ Mussarela' },
          { type: 'addon', groupName: 'Borda', label: 'Borda recheada de Catupiry', price: 8.00 },
        ],
      },
      { qty: 1, name: 'Guaraná 1L' },
    ],
    total: 62.90, status: 'ready', date: '2026-04-11T18:20:00',
    address: 'Rua Amazonas, 88', neighborhood: 'Jardim Paulista', reference: 'Casa com portão verde',
    deliveryFee: 7.50, distanceKm: 2.8, paymentMethod: 'PIX'
  },
  {
    id: 'ORD-051', customer: 'Roberto Dias', customerPhone: '(11) 92345-6789',
    items: ['Smash Burger', 'Onion Rings', 'Refrigerante'],
    itemsSummary: [
      {
        qty: 2, name: 'Smash Burger',
        modifiers: [
          { type: 'option', groupName: 'Inclui', label: 'Cebola caramelizada' },
          { type: 'option', groupName: 'Inclui', label: 'Alface' },
          { type: 'option', groupName: 'Inclui', label: 'Tomate' },
          { type: 'option', groupName: 'Inclui', label: 'Queijo cheddar' },
          { type: 'removal', label: 'Sem picles' },
          { type: 'preparation', label: 'Mal passado' },
        ],
      },
      { qty: 1, name: 'Onion Rings' },
      { qty: 2, name: 'Refrigerante Lata' },
    ],
    total: 89.70, status: 'ready', date: '2026-04-11T18:35:00',
    address: 'Av. Paulista, 1500, apto 42', neighborhood: 'Bela Vista', reference: 'Edifício Itália, bloco B',
    deliveryFee: 10.00, distanceKm: 4.5, paymentMethod: 'Cartão de Crédito'
  },
  {
    id: 'ORD-052', customer: 'Camila Sousa', customerPhone: '(11) 98765-4321',
    items: ['Açaí 700ml'],
    itemsSummary: [{
      qty: 1, name: 'Açaí 700ml',
      modifiers: [
        { type: 'option', groupName: 'Acompanhamentos', label: 'Banana' },
        { type: 'addon', label: 'Leite condensado extra', price: 4.00 },
      ],
      note: 'Sem gelo, por favor',
    }],
    total: 34.50, status: 'ready', date: '2026-04-11T18:40:00',
    address: 'Rua XV de Novembro, 230', neighborhood: 'Centro', reference: 'Em frente à farmácia',
    deliveryFee: 5.00, distanceKm: 1.3, paymentMethod: 'Dinheiro'
  },
  {
    id: 'ORD-053', customer: 'Diego Martins', customerPhone: '(11) 91122-3344',
    items: ['Combo X-Tudo', 'Batata Grande', 'Milkshake Ovomaltine'],
    itemsSummary: [{ qty: 1, name: 'Combo X-Tudo' }, { qty: 1, name: 'Batata Grande' }, { qty: 1, name: 'Milkshake Ovomaltine' }],
    total: 55.80, status: 'ready', date: '2026-04-11T18:50:00',
    address: 'Rua Consolação, 678', neighborhood: 'Consolação',
    deliveryFee: 8.50, distanceKm: 3.2, paymentMethod: 'PIX'
  },
];

export const mockVendorOrders: VendorOrderDetail[] = [
  {
    id: 'ORD-001', customer: 'Maria Silva', customerPhone: '(11) 98765-1234',
    items: [{ qty: 1, name: 'Pizza Margherita', unitPrice: 45.90 }, { qty: 1, name: 'Coca-Cola 2L', unitPrice: 12.90 }],
    subtotal: 58.80, deliveryFee: 5.00, total: 63.80, status: 'delivered',
    paymentMethod: 'PIX', address: 'Rua das Flores, 123', neighborhood: 'Centro',
    distanceKm: 1.8, createdAt: '2026-04-11T14:30:00', driverName: 'Ricardo Alves',
  },
  {
    id: 'ORD-002', customer: 'João Santos', customerPhone: '(11) 97654-3210',
    items: [{ qty: 2, name: 'Hambúrguer Artesanal', unitPrice: 32.90 }, { qty: 1, name: 'Batata Frita', unitPrice: 18.90 }, { qty: 2, name: 'Milkshake Chocolate', unitPrice: 16.00 }],
    subtotal: 116.70, deliveryFee: 8.00, total: 124.70, status: 'delivered',
    paymentMethod: 'Cartão de Crédito', address: 'Av. Brasil, 456', neighborhood: 'Jardim América',
    distanceKm: 3.2, createdAt: '2026-04-11T14:15:00', driverName: 'Paulo Costa',
  },
  {
    id: 'ORD-003', customer: 'Ana Oliveira', customerPhone: '(11) 91234-5678',
    items: [{ qty: 1, name: 'Combo Sushi 30pçs', unitPrice: 89.90 }, { qty: 1, name: 'Edamame', unitPrice: 18.00 }],
    subtotal: 107.90, deliveryFee: 7.00, total: 114.90, status: 'in_transit',
    paymentMethod: 'Cartão de Débito', address: 'Rua do Comércio, 789', neighborhood: 'Vila Nova',
    distanceKm: 2.5, createdAt: '2026-04-11T13:45:00', driverName: 'Ricardo Alves',
  },
  {
    id: 'ORD-004', customer: 'Carlos Mendes', customerPhone: '(11) 99876-5432',
    items: [{ qty: 1, name: 'Combo Família (4 pessoas)', unitPrice: 119.90 }, { qty: 2, name: 'Refrigerante 2L', unitPrice: 12.90 }],
    subtotal: 145.70, deliveryFee: 5.00, total: 150.70, status: 'delivered',
    paymentMethod: 'Dinheiro', address: 'Rua Principal, 321', neighborhood: 'Centro',
    distanceKm: 1.2, createdAt: '2026-04-10T12:00:00', observation: 'Troco para R$ 200,00', driverName: 'Paulo Costa',
  },
  {
    id: 'ORD-005', customer: 'Fernanda Lima', customerPhone: '(11) 93456-7890',
    items: [
      {
        qty: 1, name: 'Açaí 500ml', unitPrice: 22.90,
        modifiers: [
          { type: 'option', groupName: 'Acompanhamentos', label: 'Granola' },
          { type: 'option', groupName: 'Acompanhamentos', label: 'Leite em pó' },
          { type: 'option', groupName: 'Acompanhamentos', label: 'Leite condensado' },
          { type: 'addon', label: 'Nutella', price: 5.00 },
        ],
        note: 'Capricha na granola, por favor',
      },
    ],
    subtotal: 27.90, deliveryFee: 0, total: 27.90, status: 'cancelled',
    paymentMethod: 'PIX', address: 'Av. das Palmeiras, 654', neighborhood: 'Bela Vista',
    distanceKm: 4.1, createdAt: '2026-04-10T11:30:00',
  },
  {
    id: 'ORD-006', customer: 'Roberto Dias', customerPhone: '(11) 92345-6789',
    items: [
      {
        qty: 1, name: 'Pizza Grande', unitPrice: 52.90,
        modifiers: [
          { type: 'option', groupName: 'Sabores', label: '½ Calabresa' },
          { type: 'option', groupName: 'Sabores', label: '½ Mussarela' },
          { type: 'addon', groupName: 'Borda', label: 'Borda recheada de Catupiry', price: 8.00 },
        ],
      },
    ],
    subtotal: 60.90, deliveryFee: 6.00, total: 66.90, status: 'ready',
    paymentMethod: 'PIX', address: 'Rua Amazonas, 88', neighborhood: 'Jardim Paulista',
    distanceKm: 2.8, createdAt: '2026-04-11T15:10:00',
  },
  {
    id: 'ORD-007', customer: 'Luciana Ferraz', customerPhone: '(11) 99956-1100',
    items: [
      {
        qty: 1, name: 'Smash Burger', unitPrice: 28.90,
        modifiers: [
          { type: 'option', groupName: 'Inclui', label: 'Cebola caramelizada' },
          { type: 'option', groupName: 'Inclui', label: 'Alface' },
          { type: 'option', groupName: 'Inclui', label: 'Tomate' },
          { type: 'option', groupName: 'Inclui', label: 'Queijo cheddar' },
          { type: 'removal', label: 'Sem picles' },
          { type: 'preparation', label: 'Mal passado' },
        ],
      },
      { qty: 1, name: 'Onion Rings', unitPrice: 15.90 },
      { qty: 1, name: 'Suco Laranja', unitPrice: 9.90 },
    ],
    subtotal: 54.70, deliveryFee: 5.00, total: 59.70, status: 'pending',
    paymentMethod: 'Cartão de Crédito', address: 'Rua XV de Novembro, 230', neighborhood: 'Centro',
    distanceKm: 1.3, createdAt: '2026-04-11T15:25:00',
  },
  {
    id: 'ORD-008', customer: 'Diego Martins', customerPhone: '(11) 91122-3344',
    items: [{ qty: 2, name: 'Temaki Salmão', unitPrice: 32.90 }, { qty: 2, name: 'Missoshiru', unitPrice: 14.90 }],
    subtotal: 95.60, deliveryFee: 10.00, total: 105.60, status: 'in_transit',
    paymentMethod: 'PIX', address: 'Av. Paulista, 1500, apto 42', neighborhood: 'Bela Vista',
    distanceKm: 4.5, createdAt: '2026-04-09T14:50:00', driverName: 'André Souza',
  },
  {
    id: 'ORD-009', customer: 'Camila Sousa', customerPhone: '(11) 98765-4321',
    items: [{ qty: 1, name: 'Picanha na Brasa 400g', unitPrice: 69.90 }, { qty: 1, name: 'Arroz, Feijão e Farofa', unitPrice: 15.00 }, { qty: 2, name: 'Cerveja 600ml', unitPrice: 14.90 }],
    subtotal: 114.70, deliveryFee: 5.00, total: 119.70, status: 'delivered',
    paymentMethod: 'Cartão de Débito', address: 'Rua Consolação, 678', neighborhood: 'Consolação',
    distanceKm: 3.2, createdAt: '2026-04-09T12:45:00', driverName: 'Ricardo Alves',
  },
  {
    id: 'ORD-010', customer: 'Thiago Nunes', customerPhone: '(11) 99922-6677',
    items: [{ qty: 1, name: 'Açaí 700ml', unitPrice: 28.90 }, { qty: 1, name: 'Morango + Leite Condensado', unitPrice: 5.00 }],
    subtotal: 33.90, deliveryFee: 7.00, total: 40.90, status: 'pending',
    paymentMethod: 'Dinheiro', address: 'Rua das Acácias, 45', neighborhood: 'Zona Norte',
    distanceKm: 5.1, createdAt: '2026-04-08T15:40:00', observation: 'Troco para R$ 50,00',
  },
  {
    id: 'ORD-011', customer: 'Patrícia Rocha', customerPhone: '(11) 94321-8765',
    items: [{ qty: 1, name: 'Pizza Calabresa GG', unitPrice: 52.90 }, { qty: 1, name: 'Guaraná 1L', unitPrice: 8.90 }],
    subtotal: 61.80, deliveryFee: 7.50, total: 69.30, status: 'delivered',
    paymentMethod: 'PIX', address: 'Rua Amazonas, 88', neighborhood: 'Jardim Paulista',
    distanceKm: 2.8, createdAt: '2026-04-08T18:20:00', driverName: 'Lucas Ferreira',
  },
  {
    id: 'ORD-012', customer: 'Marcos Pereira', customerPhone: '(11) 93344-5566',
    items: [{ qty: 3, name: 'X-Salada', unitPrice: 24.90 }, { qty: 3, name: 'Refrigerante Lata', unitPrice: 6.90 }],
    subtotal: 95.40, deliveryFee: 5.00, total: 100.40, status: 'delivered',
    paymentMethod: 'Cartão de Crédito', address: 'Rua Augusta, 340', neighborhood: 'Consolação',
    distanceKm: 2.1, createdAt: '2026-04-07T19:10:00', driverName: 'André Souza',
  },
];

export const mockDrivers: Driver[] = [
  {
    id: 'DRV-001', name: 'Ricardo Alves', phone: '(11) 99999-1111',
    status: 'available', deliveries: 156, rating: 4.8,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ricardo'
  },
  {
    id: 'DRV-002', name: 'Paulo Costa', phone: '(11) 99999-2222',
    status: 'busy', deliveries: 243, rating: 4.9,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Paulo'
  },
  {
    id: 'DRV-003', name: 'Lucas Ferreira', phone: '(11) 99999-3333',
    status: 'offline', deliveries: 89, rating: 4.5,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas'
  },
  {
    id: 'DRV-004', name: 'André Souza', phone: '(11) 99999-4444',
    status: 'available', deliveries: 312, rating: 4.7,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Andre'
  },
];

export const mockProducts: Product[] = [
  { id: 'PRD-001', name: 'Pizza Margherita', category: 'Pizzas', price: 45.90, stock: 50, minStock: 10, sku: 'PIZ-001', image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=80&h=80&fit=crop' },
  { id: 'PRD-002', name: 'Hambúrguer Artesanal', category: 'Lanches', price: 32.90, stock: 8, minStock: 15, sku: 'HAM-001', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=80&h=80&fit=crop' },
  { id: 'PRD-003', name: 'Batata Frita', category: 'Acompanhamentos', price: 18.90, stock: 100, minStock: 20, sku: 'BAT-001', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=80&h=80&fit=crop' },
  { id: 'PRD-004', name: 'Coca-Cola 2L', category: 'Bebidas', price: 12.90, stock: 3, minStock: 30, sku: 'COC-001', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=80&h=80&fit=crop' },
  { id: 'PRD-005', name: 'Açaí 500ml', category: 'Sobremesas', price: 22.90, stock: 45, minStock: 10, sku: 'ACA-001', image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=80&h=80&fit=crop' },
  { id: 'PRD-006', name: 'Salada Caesar', category: 'Saladas', price: 28.90, stock: 25, minStock: 5, sku: 'SAL-001', image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=80&h=80&fit=crop' },
];

export const mockCoupons: Coupon[] = [
  { id: 'CPN-001', code: 'BEMVINDO10', discount: 10, type: 'percentage', minOrder: 30, usageLimit: 100, usedCount: 45, expiresAt: '2026-02-28', active: true },
  { id: 'CPN-002', code: 'FRETEGRATIS', discount: 8, type: 'fixed', minOrder: 50, usageLimit: 50, usedCount: 50, expiresAt: '2026-01-31', active: false },
  { id: 'CPN-003', code: 'PIZZA20', discount: 20, type: 'percentage', minOrder: 45, usageLimit: 200, usedCount: 78, expiresAt: '2026-03-15', active: true },
  { id: 'CPN-004', code: 'COMBO15', discount: 15, type: 'fixed', minOrder: 80, usageLimit: 30, usedCount: 12, expiresAt: '2026-01-20', active: true },
];

export const mockDeliveryZones: DeliveryZone[] = [
  { id: 'ZN-001', name: 'Centro', fee: 5.00, estimatedTime: '20-30 min', active: true },
  { id: 'ZN-002', name: 'Zona Norte', fee: 8.00, estimatedTime: '30-45 min', active: true },
  { id: 'ZN-003', name: 'Zona Sul', fee: 7.00, estimatedTime: '25-40 min', active: true },
  { id: 'ZN-004', name: 'Zona Leste', fee: 10.00, estimatedTime: '40-55 min', active: false },
  { id: 'ZN-005', name: 'Zona Oeste', fee: 9.00, estimatedTime: '35-50 min', active: true },
];

export const mockReviews: Review[] = [
  { id: 'REV-001', customer: 'Maria Silva', sentiment: 'good', comment: 'Comida excelente! Chegou quentinha e no prazo. Super recomendo!', date: '2026-01-08', orderId: 'ORD-100', reply: 'Obrigado Maria! Ficamos muito felizes com seu feedback! 🙏', photos: ['https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=70', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&q=70'] },
  { id: 'REV-002', customer: 'João Santos', sentiment: 'neutral', comment: 'Boa comida, mas demorou um pouco mais que o esperado.', date: '2026-01-07', orderId: 'ORD-099' },
  { id: 'REV-003', customer: 'Ana Oliveira', sentiment: 'good', comment: 'Melhor hambúrguer da cidade! Sempre peço aqui.', date: '2026-01-06', orderId: 'ORD-098', reply: 'Que alegria Ana! Esperamos você novamente! 😊' },
  { id: 'REV-004', customer: 'Carlos Mendes', sentiment: 'bad', comment: 'Comida ok, mas poderia melhorar a embalagem. Veio fria.', date: '2026-01-05', orderId: 'ORD-097' },
  { id: 'REV-005', customer: 'Fernanda Lima', sentiment: 'good', comment: 'Açaí perfeito! Sempre fresquinho e bem servido.', date: '2026-01-04', orderId: 'ORD-096' },
  { id: 'REV-006', customer: 'Pedro Almeida', sentiment: 'bad', comment: 'Pedido veio errado e demorou muito.', date: '2026-01-03', orderId: 'ORD-095', remediated: true, reply: 'Pedimos desculpas! Reembolsamos o valor e oferecemos cupom de desconto.' },
  { id: 'REV-007', customer: 'Lucia Fernandes', sentiment: 'neutral', comment: 'Dentro do esperado, nada especial.', date: '2026-01-02', orderId: 'ORD-094' },
];

export const mockStoreSettings: StoreSettings = {
  name: 'Sabor & Arte Delivery',
  slug: 'sabor-e-arte',
  cnpj: '12.345.678/0001-90',
  logo: '',
  banner: '',
  address: 'Rua do Sabor, 100 - Centro, São Paulo - SP',
  phone: '(11) 3333-4444',
  email: 'contato@saborearte.com.br',
  schedule: {
    days: [
      { dayIndex: 0, dayName: 'Domingo', dayShort: 'Dom', isOpen: true, openTime: '12:00', closeTime: '22:00' },
      { dayIndex: 1, dayName: 'Segunda', dayShort: 'Seg', isOpen: true, openTime: '11:00', closeTime: '23:00' },
      { dayIndex: 2, dayName: 'Terça', dayShort: 'Ter', isOpen: true, openTime: '11:00', closeTime: '23:00' },
      { dayIndex: 3, dayName: 'Quarta', dayShort: 'Qua', isOpen: true, openTime: '11:00', closeTime: '23:00' },
      { dayIndex: 4, dayName: 'Quinta', dayShort: 'Qui', isOpen: true, openTime: '11:00', closeTime: '23:00' },
      { dayIndex: 5, dayName: 'Sexta', dayShort: 'Sex', isOpen: true, openTime: '11:00', closeTime: '00:00' },
      { dayIndex: 6, dayName: 'Sábado', dayShort: 'Sáb', isOpen: true, openTime: '11:00', closeTime: '00:00' },
    ],
    breaks: [
      { id: 'brk-001', label: 'Almoço equipe', startTime: '14:30', endTime: '15:00', active: true, daysOfWeek: [1, 2, 3, 4, 5] },
      { id: 'brk-002', label: 'Café', startTime: '17:00', endTime: '17:15', active: false, daysOfWeek: [1, 2, 3, 4, 5] },
    ],
  },
  openingHours: [
    { day: 'Segunda', open: '11:00', close: '23:00', closed: false },
    { day: 'Terça', open: '11:00', close: '23:00', closed: false },
    { day: 'Quarta', open: '11:00', close: '23:00', closed: false },
    { day: 'Quinta', open: '11:00', close: '23:00', closed: false },
    { day: 'Sexta', open: '11:00', close: '00:00', closed: false },
    { day: 'Sábado', open: '11:00', close: '00:00', closed: false },
    { day: 'Domingo', open: '12:00', close: '22:00', closed: false },
  ],
  minOrderValue: 25.00,
  acceptingOrders: true,
  prepTime: '20-30 min',
  socials: { instagram: 'saborearte', facebook: 'saborearte' },
};

export const mockSalesData = [
  { name: 'Seg', vendas: 1200, pedidos: 28 },
  { name: 'Ter', vendas: 1890, pedidos: 42 },
  { name: 'Qua', vendas: 2400, pedidos: 55 },
  { name: 'Qui', vendas: 2100, pedidos: 48 },
  { name: 'Sex', vendas: 3200, pedidos: 72 },
  { name: 'Sáb', vendas: 3800, pedidos: 85 },
  { name: 'Dom', vendas: 2900, pedidos: 65 },
];

export const mockStats = {
  todayRevenue: 2450.00,
  todayOrders: 34,
  averageTicket: 72.06,
  pendingOrders: 5,
  inTransitOrders: 3,
  completedToday: 26,
  cancelledToday: 2,
  averageDeliveryTime: '28 min',
};

export interface DeliveryRecord {
  id: string;
  driverId: string;
  driverName: string;
  orderNumber: string;
  date: string;
  status: 'completed' | 'returned';
  freightCost: number;
  returnReason?: string;
}

export const mockDeliveries: DeliveryRecord[] = [
  { id: 'DEL-001', driverId: 'DRV-001', driverName: 'Ricardo Alves', orderNumber: 'ORD-201', date: '2026-04-10', status: 'completed', freightCost: 8.00 },
  { id: 'DEL-002', driverId: 'DRV-002', driverName: 'Paulo Costa', orderNumber: 'ORD-202', date: '2026-04-10', status: 'completed', freightCost: 10.00 },
  { id: 'DEL-003', driverId: 'DRV-001', driverName: 'Ricardo Alves', orderNumber: 'ORD-203', date: '2026-04-09', status: 'returned', freightCost: 8.00, returnReason: 'Cliente ausente' },
  { id: 'DEL-004', driverId: 'DRV-003', driverName: 'Lucas Ferreira', orderNumber: 'ORD-204', date: '2026-04-09', status: 'completed', freightCost: 7.00 },
  { id: 'DEL-005', driverId: 'DRV-004', driverName: 'André Souza', orderNumber: 'ORD-205', date: '2026-04-09', status: 'completed', freightCost: 9.00 },
  { id: 'DEL-006', driverId: 'DRV-002', driverName: 'Paulo Costa', orderNumber: 'ORD-206', date: '2026-04-08', status: 'returned', freightCost: 10.00, returnReason: 'Endereço não encontrado' },
  { id: 'DEL-007', driverId: 'DRV-001', driverName: 'Ricardo Alves', orderNumber: 'ORD-207', date: '2026-04-08', status: 'completed', freightCost: 5.00 },
  { id: 'DEL-008', driverId: 'DRV-004', driverName: 'André Souza', orderNumber: 'ORD-208', date: '2026-04-07', status: 'completed', freightCost: 9.00 },
  { id: 'DEL-009', driverId: 'DRV-003', driverName: 'Lucas Ferreira', orderNumber: 'ORD-209', date: '2026-04-07', status: 'returned', freightCost: 7.00, returnReason: 'Pedido cancelado pelo cliente' },
  { id: 'DEL-010', driverId: 'DRV-002', driverName: 'Paulo Costa', orderNumber: 'ORD-210', date: '2026-04-06', status: 'completed', freightCost: 10.00 },
  { id: 'DEL-011', driverId: 'DRV-001', driverName: 'Ricardo Alves', orderNumber: 'ORD-211', date: '2026-04-06', status: 'completed', freightCost: 8.00 },
  { id: 'DEL-012', driverId: 'DRV-004', driverName: 'André Souza', orderNumber: 'ORD-212', date: '2026-04-05', status: 'completed', freightCost: 9.00 },
  { id: 'DEL-013', driverId: 'DRV-003', driverName: 'Lucas Ferreira', orderNumber: 'ORD-213', date: '2026-04-05', status: 'completed', freightCost: 7.00 },
  { id: 'DEL-014', driverId: 'DRV-002', driverName: 'Paulo Costa', orderNumber: 'ORD-214', date: '2026-04-04', status: 'returned', freightCost: 10.00, returnReason: 'Produto avariado' },
  { id: 'DEL-015', driverId: 'DRV-001', driverName: 'Ricardo Alves', orderNumber: 'ORD-215', date: '2026-04-03', status: 'completed', freightCost: 5.00 },
];
