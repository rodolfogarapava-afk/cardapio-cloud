// ============================================
// TIPOS CENTRALIZADOS - USELIVRE PDV
// ============================================

// --- Usuários e Autenticação ---
export type UserRole = 'client' | 'vendor' | 'admin' | 'provider';

// --- Serviços / Prestadores ---
export type ProviderType = 'individual' | 'company';

export interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  icon: string;
}

export interface PriceRange {
  min: number;
  max?: number;
  // Presets ('service' | 'hour' | 'visit' | 'day') OR free-form
  // unit label defined by the provider (e.g. "metro", "litro", "m²").
  unit: string;
  note?: string;
}

export interface CustomServiceCategory {
  id: string;
  name: string;
}

export interface Availability {
  days: number[];
  from: string;
  to: string;
  onDemand?: boolean;
  note?: string;
  slotDurationMin?: number; // default 30
}

export interface ExternalCalendar {
  provider: 'google';
  connected: boolean;
  calendarId?: string;
}

export interface Booking {
  id: string;
  providerId: string;
  clientName: string;
  clientPhone?: string;
  service?: string;
  address?: string;
  date: string; // YYYY-MM-DD
  slot: string; // HH:mm
  status: 'pending' | 'confirmed' | 'done' | 'cancelled';
  createdAt: string;
  note?: string;
}

export interface VerificationInfo {
  cnpj?: boolean;
  documents?: boolean;
  identity?: boolean;
  address?: boolean;
}



export interface ServiceArea {
  city: string;
  neighborhoods?: string[];
  radiusKm?: number;
  lat?: number;
  lng?: number;
}

export interface ServiceReview {
  id: string;
  providerId: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
  reply?: string;
  photos?: string[];
  recommends?: boolean;
}

export interface ServiceProvider {
  id: string;
  slug: string;
  name: string;
  type: ProviderType;
  logo: string;
  banner?: string;
  categories: string[];
  customCategories?: CustomServiceCategory[];
  bio: string;
  rating: number;
  reviewCount: number;
  priceRange: PriceRange;
  availability: Availability;
  serviceArea: ServiceArea;
  address?: string;
  cnpj?: string;
  phone: string;
  whatsapp: string;
  photos: string[];
  videos?: string[];
  verified?: boolean;
  verification?: VerificationInfo;
  responseTimeMin?: number;
  isActive: boolean;
  profileViews?: number;
  contactClicks?: number;
  externalCalendar?: ExternalCalendar;
}



export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
}

export interface Address {
  id: string;
  label: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault?: boolean;
}

export interface DeliveryAddress {
  street: string;
  number: string;
  quadra?: string;
  lote?: string;
  neighborhood: string;
  complement?: string;
  aptBloco?: string;
  referencePoint: string;
  city: string;
  state: string;
  lat?: number;
  lng?: number;
}

// --- Restaurantes/Vendors ---
export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  logo: string;
  banner?: string;
  category: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  deliveryFee: number;
  minOrder: number;
  isOpen: boolean;
  address: string;
  phone: string;
  description?: string;
  prepTime?: string;
  socials?: { instagram?: string; facebook?: string };
  verified?: boolean;
  verification?: VerificationInfo;
  responseTimeMin?: number;
}


// --- Produtos e Cardápio ---
/**
 * Janela de disponibilidade recorrente (por dia da semana + horário).
 * Se `alwaysWhenOpen` for true, ignora `days`/`startTime`/`endTime` e considera
 * disponível sempre que a loja estiver aberta.
 */
export interface AvailabilitySchedule {
  alwaysWhenOpen: boolean;
  days: number[];        // 0=Dom, 1=Seg, ... 6=Sab
  startTime: string;     // HH:mm
  endTime: string;       // HH:mm
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  order: number;
  /** Ex.: "Marmitas só Seg–Sex 08–13h". Ausente = sempre disponível quando aberto. */
  availability?: AvailabilitySchedule;
}

export interface ComplementGroup {
  id: string;
  name: string;
  required: boolean;
  min: number;
  max: number;
  complements: Complement[];
  /**
   * Modo de seleção da UI do cliente:
   * - 'single'   → radio (uma única opção)
   * - 'multiple' → checkbox (várias sem repetir, respeitando min/max)
   * - 'repeat'   → stepper (repetição da mesma opção)
   * Ausente = inferido (compat.): max===1 vira 'single'; kind==='flavor' ou pricingMode==='max' vira 'multiple'; caso contrário 'repeat'.
   */
  selectionType?: 'single' | 'multiple' | 'repeat';
  /**
   * Como cobrar o grupo dado o conjunto de opções escolhidas:
   * - 'sum' (default) → soma dos preços
   * - 'avg'           → média dos preços
   * - 'max'           → preço da opção mais cara (pizza meia a meia)
   * - 'min'           → preço da opção mais barata
   */
  pricingMode?: 'sum' | 'avg' | 'max' | 'min';
  /** Janela em que o grupo aparece. Ausente = sempre que a loja estiver aberta. */
  availability?: AvailabilitySchedule;
  /** Rótulo semântico do grupo para UI condicional. */
  kind?: 'flavor' | 'meat_point' | 'temperature' | 'cutlery' | 'extras';
}

export interface Complement {
  id: string;
  name: string;
  price: number;
  /** Descrição curta / ingredientes exibida abaixo do nome. */
  description?: string;
  /** Imagem opcional; quando presente em grupos 'flavor', troca o hero do modal. */
  image?: string;
  /** Default true. Quando false exibe badge EM FALTA e bloqueia seleção. */
  available?: boolean;
}

export interface ProductIngredient {
  id: string;
  name: string;
  /** Quando true, o cliente pode marcar para remover (ex.: "sem cebola"). */
  removable: boolean;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  /** Preço original (antes do desconto). Quando > price, exibe selo de oferta. */
  originalPrice?: number;
  /** Preço de custo (uso interno; margem). */
  costPrice?: number;
  /** Preço promocional. Ativo apenas dentro de `promoSchedule`. */
  promoPrice?: number;
  /** Janela em que a promo vale. Ausente = sempre que a loja estiver aberta. */
  promoSchedule?: AvailabilitySchedule;
  /** Aparece na faixa "Destaques" no topo do cardápio. */
  featured?: boolean;
  /** Produto para maiores de 18 anos. */
  ageRestricted?: boolean;
  /** Onde o produto pode ser vendido. Ausente = 'both'. */
  fulfillment?: 'pickup' | 'delivery' | 'both';
  /** Janela em que o produto aparece. Ausente = sempre que a loja estiver aberta. */
  availability?: AvailabilitySchedule;
  image?: string;
  categoryId: string;
  available: boolean;
  complementGroups?: ComplementGroup[];
  /** Ingredientes "inclusos" no produto, controláveis pelo cliente (remover). */
  ingredients?: ProductIngredient[];
}

// --- Carrinho ---
export type DeliveryMode = 'delivery' | 'pickup';
export interface CartItemComplement {
  groupId: string;
  groupName: string;
  complementId: string;
  complementName: string;
  price: number;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  complements: CartItemComplement[];
  /** Ingredientes "inclusos" que o cliente pediu para remover (nomes). */
  removedIngredients?: string[];
  observation?: string;
  totalPrice: number;
}

export interface Cart {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  restaurantAddress?: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

// --- Pedidos ---
export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'cash';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  complements: CartItemComplement[];
  observation?: string;
  totalPrice: number;
}

export interface Order {
  id: string;
  restaurantId: string;
  restaurantName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  change?: number;
  address: Address;
  createdAt: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

// --- Vendor/Loja ---
export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: 'available' | 'busy' | 'offline';
  deliveries: number;
  rating: number;
  avatar?: string;
}

export interface StockProduct {
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

export interface Review {
  id: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
  orderId: string;
  reply?: string;
  photos?: string[];
  recommends?: boolean;
}

// --- Pausas Programadas ---
export interface ScheduledBreak {
  id: string;
  label: string;           // Ex: "Almoço", "Academia", "Café"
  startTime: string;       // HH:mm
  endTime: string;         // HH:mm
  active: boolean;
  daysOfWeek: number[];    // 0=Dom, 1=Seg, ... 6=Sab (array para pausas recorrentes)
}

export interface DaySchedule {
  dayIndex: number;        // 0=Dom, 1=Seg, ... 6=Sab
  dayName: string;         // "Domingo", "Segunda", etc.
  dayShort: string;        // "Dom", "Seg", etc.
  isOpen: boolean;
  openTime: string;        // HH:mm
  closeTime: string;       // HH:mm
}

export interface StoreSchedule {
  days: DaySchedule[];
  breaks: ScheduledBreak[];
}

export interface OpeningHours {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

export interface StoreSettings {
  name: string;
  slug: string;
  cnpj: string;
  logo: string;
  banner?: string;
  address: string;
  phone: string;
  email: string;
  openingHours: OpeningHours[];
  schedule: StoreSchedule;
  minOrderValue: number;
  acceptingOrders: boolean;
  prepTime?: string;
  socials?: { instagram?: string; facebook?: string };
}

// --- Admin ---
export interface VendorStats {
  id: string;
  name: string;
  /** @deprecated mantido por retrocompatibilidade; a UI usa `category` para o ícone. */
  logo?: string;
  category?: 'food' | 'market' | 'pharmacy' | 'other';
  totalOrders: number;
  totalRevenue: number;
  rating: number;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
}

// --- Domínios de vendor (subdomínio próprio da storefront do tenant) ---
export type DomainStatus = 'pending' | 'active' | 'error';

export interface VendorDomain {
  vendorId: string;
  subdomain: string;   // apenas o rótulo, ex.: "padaria-da-vila"
  status: DomainStatus;
  updatedAt: string;   // ISO
}



export interface SystemStats {
  totalVendors: number;
  activeVendors: number;
  totalOrders: number;
  totalRevenue: number;
  totalClients: number;
  ordersToday: number;
  revenueToday: number;
}

// --- Dashboard Stats ---
export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  averageTicket: number;
  pendingOrders: number;
  inTransitOrders: number;
  completedToday: number;
  cancelledToday: number;
  averageDeliveryTime: string;
}

export interface SalesData {
  name: string;
  vendas: number;
  pedidos: number;
}

// --- Sistema de Pontos/Fidelidade ---
export type PointTransactionType = 'earned' | 'redeemed' | 'expired';

export interface PointTransaction {
  id: string;
  type: PointTransactionType;
  amount: number;
  description: string;
  orderId?: string;
  date: string;
}

// --- Helpers ---
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Pronto',
  in_transit: 'Em Trânsito',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro',
};
