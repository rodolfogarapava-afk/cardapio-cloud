import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Clock, Star, Search, ShoppingCart, GalleryHorizontal, X, ArrowUp, User as UserIcon, LogIn, LogOut, MapPin, ArrowRight, UtensilsCrossed, Tag, ClipboardList, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CategoryNav } from '@/components/client/CategoryNav';
import { ProductCard } from '@/components/client/ProductCard';
import { ProductCarousel, ProductCarouselCard } from '@/components/client/ProductCarousel';
import { CartDrawer } from '@/components/client/CartDrawer';
import { ComplementsModal } from '@/components/client/ComplementsModal';
import { MobileBottomNav, BottomNavItem } from '@/components/client/MobileBottomNav';
import { OffersModal } from '@/components/client/OffersModal';
import { RestaurantInfoModal } from '@/components/client/RestaurantInfoModal';
import { RestaurantReviewsModal } from '@/components/client/RestaurantReviewsModal';
import { MenuTour } from '@/components/client/MenuTour';
import { getRestaurantBySlug, getCategoriesBySlug, getProductsBySlug } from '@/data/restaurants';
import { Product, CartItem, ProductCategory, Restaurant, Address } from '@/types';
import { isWithinSchedule } from '@/lib/availability';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';

import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { motion, AnimatePresence } from 'framer-motion';

type CloudProduct = {
  id: number;
  category: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  tag?: string;
  stock?: number;
  trackStock?: boolean;
  preparationPointEnabled?: boolean;
};

type CloudCatalog = {
  tenantId: string;
  tenantName: string;
  deliveryFee?: number;
  products: CloudProduct[];
  categories: string[];
};

const categoryKey = (name: string) =>
  `deus-proveu-${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
const deviceTokenKey = (tenantId: string | undefined, phone: string) =>
  `cardapio_delivery_device_token_${tenantId || 'unknown'}_${phone}`;

function LoyaltyModal({ open, onClose, name, phone, onLogout }: { open: boolean; onClose: () => void; name: string; phone: string; onLogout: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-primary" /> Minha conta
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Nome</p>
            <p className="mt-1 font-semibold text-foreground">{name || 'Cliente'}</p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Telefone</p>
            <p className="mt-1 font-semibold text-foreground">{phone}</p>
          </div>
          <Button type="button" variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Sair da conta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Cardapio() {
  const { vendorSlug } = useParams<{ vendorSlug: string }>();
  const navigate = useNavigate();
  const { cart, itemCount, setDeliveryFee, deliveryMode, setDeliveryAddress } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authStep, setAuthStep] = useState<'identify' | 'register'>('identify');
  const [authIdentifier, setAuthIdentifier] = useState('');
  const [identifiedName, setIdentifiedName] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerStreet, setRegisterStreet] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [registerNeighborhood, setRegisterNeighborhood] = useState('');
  const [registerCity, setRegisterCity] = useState('');
  const [registerState, setRegisterState] = useState('');
  const [authErr, setAuthErr] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [cloudCatalog, setCloudCatalog] = useState<CloudCatalog | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryName, setDeliveryName] = useState('');

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    async function loadDeusProveuCatalog() {
      const { data, error } = await (supabase as any).rpc('get_public_menu', {
        p_slug: vendorSlug,
      });

      if (!active) return;
      if (error || !data) {
        setCatalogError('Não foi possível carregar os produtos da Deus Proveu.');
        return;
      }

      setCatalogError('');
      setCloudCatalog(data as CloudCatalog);
    }

    void loadDeusProveuCatalog();
    timer = window.setInterval(() => { void loadDeusProveuCatalog(); }, 5000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadDeusProveuCatalog();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [vendorSlug]);

  useEffect(() => {
    try {
      const access = JSON.parse(localStorage.getItem('cardapio_delivery_access') || 'null') as { phone?: string; token?: string } | null;
      const digits = (access?.phone || '').replace(/\D/g, '');
      if (digits.length < 10) return;
      if (access?.token) localStorage.setItem(deviceTokenKey(cloudCatalog?.tenantId, digits), access.token);
      setDeliveryPhone(digits);
      const profile = JSON.parse(localStorage.getItem(`cardapio_delivery_profile_${digits}`) || 'null') as { name?: string; address?: Address } | null;
      setDeliveryName(profile?.name?.trim() || 'Cliente');
      if (profile?.address) setDeliveryAddress(profile.address);
    } catch {
      localStorage.removeItem('cardapio_delivery_access');
    }
  }, [cloudCatalog?.tenantId, setDeliveryAddress]);

  const onlyDigits = (s: string) => s.replace(/\D/g, '');
  // Heurística: 11 dígitos com 3º dígito = 9 → celular; 10 dígitos → fixo; 11 dígitos sem 9 na 3ª pos → CPF.
  const detectKind = (digits: string): 'phone' | 'cpf' | 'unknown' => {
    if (digits.length === 10) return 'phone';
    if (digits.length === 11) return digits[2] === '9' ? 'phone' : 'cpf';
    return 'unknown';
  };
  const formatIdentifier = (v: string) => {
    const d = onlyDigits(v).slice(0, 11);
    const kind = detectKind(d);
    if (kind === 'cpf') {
      // 000.000.000-00
      return d
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
    }
    if (kind === 'phone') {
      if (d.length === 10) {
        return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2');
      }
      return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
    }
    // Parcial: ainda não dá pra decidir — formata como telefone progressivo sem travar
    if (d.length <= 2) return d.length ? `(${d}` : '';
    if (d.length <= 6) return d.replace(/^(\d{2})(\d+)/, '($1) $2');
    return d.replace(/^(\d{2})(\d{4,5})(\d+)/, '($1) $2-$3');
  };
  const resetAuth = () => {
    setAuthStep('identify'); setAuthIdentifier(''); setIdentifiedName('');
    setRegisterName(''); setRegisterStreet(''); setRegisterNumber('');
    setRegisterNeighborhood(''); setRegisterCity(''); setRegisterState('');
    setAuthErr(''); setAuthLoading(false);
  };

  const connectCustomer = (phone: string, name: string, token = '', address?: Address) => {
    const rememberedToken = token || localStorage.getItem(deviceTokenKey(cloudCatalog?.tenantId, phone)) || '';
    localStorage.setItem('cardapio_delivery_access', JSON.stringify({
      phone, tenantId: cloudCatalog?.tenantId, vendorSlug, token: rememberedToken, updatedAt: Date.now(),
    }));
    if (rememberedToken) localStorage.setItem(deviceTokenKey(cloudCatalog?.tenantId, phone), rememberedToken);
    setDeliveryPhone(phone);
    setDeliveryName(name);
    if (address) setDeliveryAddress(address);
    setIdentifiedName(name);
    setAuthOpen(false);
    resetAuth();
  };

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErr('');
    const d = onlyDigits(authIdentifier);
    const kind = detectKind(d);
    if (kind !== 'phone') { setAuthErr('Informe um telefone válido com DDD.'); return; }
    setAuthLoading(true);
    try {
      const localProfile = JSON.parse(localStorage.getItem(`cardapio_delivery_profile_${d}`) || 'null') as { name?: string; address?: Address } | null;
      let customer: any = localProfile?.name ? { name: localProfile.name, ...(localProfile.address || {}) } : null;
      const access = JSON.parse(localStorage.getItem('cardapio_delivery_access') || 'null') as { phone?: string; token?: string } | null;
      const rememberedToken = (access?.phone === d ? access.token || '' : '') || localStorage.getItem(deviceTokenKey(cloudCatalog?.tenantId, d)) || '';
      if (cloudCatalog?.tenantId) {
        const { data } = await (supabase as any).rpc('get_public_customer', {
          p_tenant_id: cloudCatalog.tenantId,
          p_phone: d,
          p_access_token: rememberedToken,
        });
        if (data?.name?.trim()) customer = data;
      }
      if (customer?.name?.trim()) {
        let savedAddress = localProfile?.address;
        if (!localProfile?.name) {
          savedAddress = {
            id: `address-${Date.now()}`, label: 'Endereço cadastrado', isDefault: true,
            street: customer.street || '', number: customer.number || '', neighborhood: customer.neighborhood || '',
            complement: customer.reference || '', city: '', state: '', zipCode: '',
          };
          localStorage.setItem(`cardapio_delivery_profile_${d}`, JSON.stringify({ name: customer.name.trim(), phone: d, address: savedAddress, updatedAt: Date.now() }));
        }
        connectCustomer(d, customer.name.trim(), rememberedToken, savedAddress);
      } else {
        setAuthStep('register');
      }
    } catch {
      setAuthErr('Não foi possível acessar agora. Tente novamente.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = (event: React.FormEvent) => {
    event.preventDefault();
    const phone = onlyDigits(authIdentifier);
    if (!registerName.trim() || !registerStreet.trim() || !registerNumber.trim() || !registerNeighborhood.trim()) {
      setAuthErr('Preencha nome, rua, número e bairro.');
      return;
    }
    const address: Address = {
      id: `address-${Date.now()}`, label: 'Endereço cadastrado', isDefault: true,
      street: registerStreet.trim(), number: registerNumber.trim(), neighborhood: registerNeighborhood.trim(),
      city: registerCity.trim(), state: registerState.trim(), zipCode: '', complement: '',
    };
    localStorage.setItem(`cardapio_delivery_profile_${phone}`, JSON.stringify({
      name: registerName.trim(), phone, address, updatedAt: Date.now(),
    }));
    connectCustomer(phone, registerName.trim(), '', address);
  };

  const customerConnected = isAuthenticated || deliveryPhone.length >= 10;
  const customerFirstName = user?.name.split(' ')[0] || deliveryName.split(' ')[0] || 'Cliente';

  const ProfileButton = ({ compact = false }: { compact?: boolean }) => (
    isAuthenticated && user ? (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size={compact ? 'icon' : 'sm'} className={compact ? 'h-9 w-9 shrink-0' : 'gap-1.5 text-xs'}>
            <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!compact && <span className="truncate max-w-[80px]">{user.name.split(' ')[0]}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-2">
          <div className="px-2 py-1.5 border-b mb-1">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <button onClick={() => { logout(); }} className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted text-destructive">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </PopoverContent>
      </Popover>
    ) : (
      <Button variant="outline" size={compact ? 'icon' : 'sm'} onClick={() => setAuthOpen(true)} className={compact ? 'h-9 w-9 shrink-0' : 'gap-1.5 text-xs'}>
        <LogIn className="h-3.5 w-3.5" />
        {!compact && <span>Entrar</span>}
      </Button>
    )
  );


  const visualRestaurant = (vendorSlug ? getRestaurantBySlug(vendorSlug) : undefined)
    || getRestaurantBySlug('sabor-arte');
  const restaurant = useMemo<Restaurant | undefined>(() => {
    if (!visualRestaurant || !cloudCatalog) return undefined;
    const firstImage = cloudCatalog.products.find(product => product.image)?.image;
    return {
      ...visualRestaurant,
      id: cloudCatalog.tenantId,
      slug: vendorSlug || visualRestaurant.slug,
      name: cloudCatalog.tenantName || 'Deus Proveu',
      category: cloudCatalog.categories.join(' • ') || 'Espetinhos',
      logo: firstImage || visualRestaurant.logo,
      deliveryFee: Number(cloudCatalog.deliveryFee ?? visualRestaurant.deliveryFee),
    };
  }, [cloudCatalog, vendorSlug, visualRestaurant]);

  const rawCategories = useMemo<ProductCategory[]>(() => {
    if (!cloudCatalog) return [];
    const names = [...cloudCatalog.categories];
    for (const product of cloudCatalog.products) {
      const name = product.category?.trim();
      if (name && !names.some(current => current.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) names.push(name);
    }
    return names.map((name, order) => ({
      id: categoryKey(name),
      name,
      order,
    }));
  }, [cloudCatalog]);

  const rawProducts = useMemo<Product[]>(() => {
    if (!cloudCatalog) return [];
    return cloudCatalog.products.map(product => ({
      id: String(product.id),
      name: product.name,
      description: product.description,
      price: Number(product.price) || 0,
      image: product.image,
      categoryId: categoryKey(product.category),
      available: product.trackStock === false || Number(product.stock ?? 0) > 0,
      featured: Boolean(product.tag),
      complementGroups: product.preparationPointEnabled
        ? [{
            id: `preparo-${product.id}`,
            name: 'Ponto de preparo',
            required: true,
            min: 1,
            max: 1,
            selectionType: 'single',
            kind: 'meat_point',
            complements: [
              { id: 'mal-passado', name: 'Mal passado', price: 0 },
              { id: 'ao-ponto', name: 'Ao ponto', price: 0 },
              { id: 'bem-passado', name: 'Bem passado', price: 0 },
            ],
          }]
        : undefined,
    }));
  }, [cloudCatalog]);

  // --- Disponibilidade & promoções (calculadas em memória, mock) ---
  // Categorias visíveis: respeita a janela de horário da categoria.
  const categories = useMemo(
    () => rawCategories.filter(c => isWithinSchedule(c.availability)),
    [rawCategories],
  );
  const activeCategoryIds = useMemo(
    () => new Set(categories.map(c => c.id)),
    [categories],
  );

  // Produtos: filtra por categoria ativa, janela do produto, fulfillment
  // e aplica preço promocional dentro da janela da promo.
  const products = useMemo<Product[]>(() => {
    return rawProducts
      .filter(p => activeCategoryIds.has(p.categoryId))
      .filter(p => isWithinSchedule(p.availability))
      .filter(p => {
        const f = p.fulfillment ?? 'both';
        if (f === 'both') return true;
        return f === deliveryMode;
      })
      .map(p => {
        if (
          typeof p.promoPrice === 'number' &&
          p.promoPrice > 0 &&
          p.promoPrice < p.price &&
          isWithinSchedule(p.promoSchedule)
        ) {
          return { ...p, originalPrice: p.originalPrice ?? p.price, price: p.promoPrice };
        }
        return p;
      });
  }, [rawProducts, activeCategoryIds, deliveryMode]);

  const featuredProducts = useMemo(
    () => products.filter(p => p.featured),
    [products],
  );


  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | undefined>(undefined);
  const [carouselEnabled, setCarouselEnabled] = useState(true);
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [prevItemCount, setPrevItemCount] = useState(0);
  const [cartBounce, setCartBounce] = useState(false);
  const [offersOpen, setOffersOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const location = useLocation();
  useEffect(() => {
    const state = location.state as { openCart?: boolean } | null;
    if (state?.openCart) {
      setCartOpen(true);
      // Limpa o state para não reabrir ao navegar internamente
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  useEffect(() => {
    if (itemCount > prevItemCount) {
      setCartBounce(true);
      const t = setTimeout(() => setCartBounce(false), 400);
      return () => clearTimeout(t);
    }
    setPrevItemCount(itemCount);
  }, [itemCount, prevItemCount]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (restaurant && cart?.restaurantId === restaurant.id) setDeliveryFee(restaurant.deliveryFee);
  }, [restaurant, cart, setDeliveryFee]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (search) return p.name.toLowerCase().includes(search.toLowerCase());
      if (!activeCategory) return true;
      return p.categoryId === activeCategory;
    });
  }, [products, search, activeCategory]);

  const productsByCategory = useMemo(() => {
    if (!search) return null;
    const grouped: Record<string, Product[]> = {};
    filteredProducts.forEach(p => { if (!grouped[p.categoryId]) grouped[p.categoryId] = []; grouped[p.categoryId].push(p); });
    return grouped;
  }, [filteredProducts, search]);

  const handleAddToCart = (product: Product) => { setEditingCartItem(undefined); setSelectedProduct(product); };
  const handleEditCartItem = (productId: string, cartItem: CartItem) => {
    const product = products.find(p => p.id === productId);
    if (product) { setEditingCartItem(cartItem); setSelectedProduct(product); }
  };

  // Ofertas: produto com originalPrice > price
  const offerProducts = useMemo(
    () => products.filter(p => typeof p.originalPrice === 'number' && p.originalPrice > p.price),
    [products]
  );
  const hasOffers = offerProducts.length > 0;

  const goToOffers = useCallback(() => {
    if (offerProducts.length === 0) return;
    setOffersOpen(true);
  }, [offerProducts]);

  const handleOrdersClick = useCallback(() => {
    if (!restaurant) return;
    if (customerConnected) navigate(`/pedidos/${restaurant.slug}`);
    else setAuthOpen(true);
  }, [customerConnected, navigate, restaurant]);

  const handleProfileClick = useCallback(() => {
    if (customerConnected) setLoyaltyOpen(true);
    else setAuthOpen(true);
  }, [customerConnected]);

  const handleCustomerLogout = useCallback(() => {
    try {
      const access = JSON.parse(localStorage.getItem('cardapio_delivery_access') || 'null') as { phone?: string; token?: string; tenantId?: string } | null;
      if (access?.phone && access.token) localStorage.setItem(deviceTokenKey(access.tenantId, access.phone), access.token);
    } catch { /* a sessão inválida será descartada */ }
    logout();
    localStorage.removeItem('cardapio_delivery_access');
    setDeliveryPhone('');
    setDeliveryName('');
    setDeliveryAddress(null);
    setLoyaltyOpen(false);
  }, [logout, setDeliveryAddress]);

  if (catalogError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-semibold">Cardápio temporariamente indisponível</p>
        <p className="text-sm text-muted-foreground">{catalogError}</p>
        <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
      </div>
    );
  }

  if (!cloudCatalog) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">Carregando produtos da Deus Proveu...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-muted-foreground">Restaurante não encontrado</p>
        <Button onClick={() => navigate('/cardapio/sabor-arte')}>Voltar ao cardápio</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 max-sm:pb-24">
      <MenuTour
        vendorSlug={restaurant.slug}
        setCarouselEnabled={setCarouselEnabled}
        setSearch={setSearch}
        setCartOpen={setCartOpen}
      />
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="container py-3 sm:py-4">
          {/* Mobile */}
          <div className="sm:hidden space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg overflow-hidden">
                  {restaurant.logo.startsWith('http') ? <img src={restaurant.logo} alt={restaurant.name} className="h-full w-full object-cover" /> : <span>{restaurant.logo}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <button onClick={() => setInfoOpen(true)} className="flex items-center gap-1 min-w-0 group text-left w-full">
                    <h1 className="font-bold text-base text-foreground truncate group-hover:underline">{restaurant.name}</h1>
                    <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </button>
                  <p className="text-xs text-muted-foreground truncate">{restaurant.category}</p>
                </div>
              </div>
              <button
                onClick={() => setCartOpen(true)}
                className="relative shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <ShoppingCart className="h-4 w-4" />
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold',
                  restaurant.isOpen
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-destructive/30 bg-destructive/10 text-destructive'
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', restaurant.isOpen ? 'bg-success' : 'bg-destructive')} />
                {restaurant.isOpen ? 'Aberto' : 'Fechado'}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <button onClick={() => setReviewsOpen(true)} className="flex items-center gap-1 hover:text-foreground transition-colors" aria-label="Ver avaliações">
                <Star className="h-3 w-3 fill-warning text-warning" />
                <span className="font-medium text-foreground underline-offset-2 hover:underline">{restaurant.rating.toFixed(1)}</span>
              </button>
              <span className="text-muted-foreground/40">•</span>
              <div className="flex items-center gap-1"><Clock className="h-3 w-3" /><span>{restaurant.deliveryTime}</span></div>
              {restaurant.minOrder > 0 && (<><span className="text-muted-foreground/40">•</span><span>Mín. R$ {restaurant.minOrder.toFixed(0)}</span></>)}
            </div>
          </div>


          {/* Desktop */}
          <div className="hidden sm:block space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-xl overflow-hidden">
                  {restaurant.logo.startsWith('http') ? <img src={restaurant.logo} alt={restaurant.name} className="h-full w-full object-cover" /> : <span>{restaurant.logo}</span>}
                </div>
                <div className="min-w-0">
                  <button onClick={() => setInfoOpen(true)} className="flex items-center gap-1.5 min-w-0 group text-left">
                    <h1 className="font-bold text-xl text-foreground truncate group-hover:underline">{restaurant.name}</h1>
                    <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span
                      className={cn(
                        'ml-1 shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold',
                        restaurant.isOpen
                          ? 'border-success/30 bg-success/10 text-success'
                          : 'border-destructive/30 bg-destructive/10 text-destructive'
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', restaurant.isOpen ? 'bg-success' : 'bg-destructive')} />
                      {restaurant.isOpen ? 'Aberto' : 'Fechado'}
                    </span>
                  </button>
                  <p className="text-sm text-muted-foreground truncate">{restaurant.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasOffers && (
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={goToOffers}>
                    <Tag className="h-3.5 w-3.5 text-primary" /> Ofertas
                  </Button>
                )}
                {isAuthenticated ? (
                  <>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setLoyaltyOpen(true)}>
                      <UserIcon className="h-3.5 w-3.5 text-primary" /> Minha conta
                    </Button>
                    <Link to={`/historico/${restaurant.slug}`}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs"><ClipboardList className="h-3.5 w-3.5" /> Meus Pedidos</Button>
                    </Link>
                  </>
                ) : null}
                <ProfileButton />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs relative"
                  onClick={() => setCartOpen(true)}
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span>Carrinho</span>
                  {itemCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      {itemCount}
                    </span>
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <button onClick={() => setReviewsOpen(true)} className="flex items-center gap-1 hover:text-foreground transition-colors" aria-label="Ver avaliações">
                <Star className="h-3 w-3 fill-warning text-warning" />
                <span className="font-medium text-foreground underline-offset-2 hover:underline">{restaurant.rating.toFixed(1)}</span>
              </button>
              <span className="text-muted-foreground/50">•</span>
              <div className="flex items-center gap-1"><Clock className="h-3 w-3" /><span>{restaurant.deliveryTime}</span></div>
              {restaurant.minOrder > 0 && (<><span className="text-muted-foreground/50">•</span><span>Mín. R$ {restaurant.minOrder.toFixed(0)}</span></>)}
            </div>
          </div>

          {/* Busca + Toggle */}
          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar no cardápio..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
            </div>
            {/* Mobile: ações de fidelidade/perfil migraram para a barra inferior */}
            {!search && (
              <div className="flex items-center gap-2 shrink-0">
                <Switch id="carousel-toggle" checked={carouselEnabled} onCheckedChange={setCarouselEnabled} className="data-[state=checked]:bg-primary" />
                <Label htmlFor="carousel-toggle" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                  <GalleryHorizontal className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Galeria</span>
                </Label>
              </div>
            )}
          </div>

          {!search && categories.length > 0 && (
            <CategoryNav categories={categories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} className="mt-3 -mx-4 px-4" />
          )}
        </div>
      </header>

      <main className="container py-4">
        {!restaurant.isOpen && (
          <div className="mb-4 rounded-lg bg-warning/10 p-4 text-center">
            <p className="text-sm font-medium text-warning">Este restaurante está fechado no momento</p>
          </div>
        )}

        {/* Faixa "Destaques" — só quando não há busca/filtro ativo */}
        {!search && !activeCategory && featuredProducts.length > 0 && (
          <div className="mb-6">
            <ProductCarousel
              categoryName="Destaques"
              products={featuredProducts}
              onAddToCart={handleAddToCart}
              showFeaturedBadge={false}
            />
          </div>
        )}



        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-lg font-semibold">Nenhum produto encontrado</h2>
            <p className="text-sm text-muted-foreground mt-1">Tente buscar por outro termo</p>
          </div>
        ) : search && productsByCategory ? (
          <div className="space-y-6">
            {Object.entries(productsByCategory).map(([categoryId, prods]) => {
              const category = categories.find(c => c.id === categoryId);
              return (
                <div key={categoryId}>
                  <h2 className="text-lg font-semibold mb-3">{category?.name || 'Outros'}</h2>
                  <div className="space-y-3">{prods.map(product => <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />)}</div>
                </div>
              );
            })}
          </div>
        ) : carouselEnabled ? (
          <motion.div key="carousel-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {(() => {
              type Block =
                | { type: 'carousel'; key: string; categoryName: string; products: Product[] }
                | { type: 'grid'; key: string; items: { categoryId: string; categoryName: string; product: Product }[] };
              const blocks: Block[] = [];
              let buffer: { categoryId: string; categoryName: string; product: Product }[] = [];
              const flush = () => {
                if (buffer.length) {
                  blocks.push({ type: 'grid', key: `grid-${buffer[0].categoryId}`, items: buffer });
                  buffer = [];
                }
              };
              categories.forEach(category => {
                const categoryProducts = filteredProducts.filter(p => p.categoryId === category.id);
                if (categoryProducts.length === 0) return;
                if (categoryProducts.length === 1) {
                  buffer.push({ categoryId: category.id, categoryName: category.name, product: categoryProducts[0] });
                } else {
                  flush();
                  blocks.push({ type: 'carousel', key: category.id, categoryName: category.name, products: categoryProducts });
                }
              });
              flush();
              return blocks.map(block => {
                if (block.type === 'carousel') {
                  return <ProductCarousel key={block.key} categoryName={block.categoryName} products={block.products} onAddToCart={handleAddToCart} />;
                }
                return (
                  <section
                    key={block.key}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                  >
                    {block.items.map(item => (
                      <div key={item.categoryId} className="min-w-0">
                        <h2 className="text-lg font-bold text-foreground mb-3">{item.categoryName}</h2>
                        <ProductCarouselCard product={item.product} onAddToCart={handleAddToCart} />
                      </div>
                    ))}
                  </section>
                );
              });
            })()}
          </motion.div>
        ) : (
          <motion.div key={`list-${activeCategory || 'all'}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {categories.map(category => {
              const items = filteredProducts.filter(p => p.categoryId === category.id);
              if (items.length === 0) return null;
              return (
                <section key={category.id}>
                  <h2 className="text-lg font-bold text-foreground mb-3">{category.name}</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                    {items.map((product, i) => (
                      <motion.div
                        key={product.id}
                        data-product-id={product.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="min-w-0"
                      >
                        <ProductCard product={product} onAddToCart={handleAddToCart} />
                      </motion.div>
                    ))}
                  </div>
                </section>
              );
            })}
          </motion.div>
        )}
      </main>

      {/* FABs flutuantes */}
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-center gap-3">
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              key="scroll-top"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              onClick={scrollToTop}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground shadow-lg hover:bg-muted/80 transition-colors"
            >
              <ArrowUp className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {itemCount > 0 && (
            <motion.button
              key="cart-fab"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: cartBounce ? 1.15 : 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              onClick={() => setCartOpen(true)}
              className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl hover:bg-primary/90 transition-colors"
            >
              <ShoppingCart className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold shadow">
                {itemCount}
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* CartDrawer controlado pelo FAB */}
      <CartDrawer
        onEditItem={handleEditCartItem}
        onAddSuggestion={handleAddToCart}
        allProducts={products}
        externalOpen={cartOpen}
        onExternalClose={() => setCartOpen(false)}
      />

      {selectedProduct && restaurant && (
        <ComplementsModal product={selectedProduct} restaurantId={restaurant.id} restaurantName={restaurant.name} restaurantSlug={restaurant.slug} restaurantAddress={restaurant.address} open={!!selectedProduct} onClose={() => { setSelectedProduct(null); setEditingCartItem(undefined); }} editingItem={editingCartItem} />
      )}

      <LoyaltyModal
        open={loyaltyOpen}
        onClose={() => setLoyaltyOpen(false)}
        name={deliveryName || user?.name || 'Cliente'}
        phone={formatIdentifier(deliveryPhone || user?.phone || '')}
        onLogout={handleCustomerLogout}
      />

      {/* Barra inferior fixa (mobile) */}
      <MobileBottomNav
        items={[
          { key: 'menu', label: 'Cardápio', icon: UtensilsCrossed, active: true, onClick: () => { setActiveCategory(''); setSearch(''); scrollToTop(); } },
          { key: 'offers', label: 'Ofertas', icon: Tag, hidden: !hasOffers, onClick: goToOffers },
          { key: 'orders', label: 'Pedidos', icon: ClipboardList, hidden: !customerConnected, onClick: handleOrdersClick },
          { key: 'profile', label: customerConnected ? customerFirstName : 'Entrar', icon: customerConnected ? UserIcon : LogIn, onClick: handleProfileClick },
        ] as BottomNavItem[]}
      />

      {/* Auth Dialog — fluxo: identificação → escolha → OTP/Senha */}
      <Dialog open={authOpen} onOpenChange={(o) => { setAuthOpen(o); if (!o) resetAuth(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {authStep === 'identify' && (<><UserIcon className="h-5 w-5 text-primary" /> Entrar</>)}
              {authStep === 'register' && (<><MapPin className="h-5 w-5 text-primary" /> Complete seu cadastro</>)}
            </DialogTitle>
          </DialogHeader>

          {authStep === 'identify' && (
            <form onSubmit={handleIdentify} className="space-y-3">
              <div>
                <Label htmlFor="auth-id" className="text-xs">Telefone</Label>
                <Input
                  id="auth-id"
                  inputMode="numeric"
                  required
                  value={authIdentifier}
                  onChange={e => setAuthIdentifier(formatIdentifier(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="mt-1"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground mt-1">Seu telefone identifica seu cadastro. Não precisa de senha.</p>
              </div>
              {authErr && <p className="text-xs text-destructive">{authErr}</p>}
              <Button type="submit" className="w-full gap-2" disabled={authLoading}>
                {authLoading ? 'Verificando...' : <>Continuar <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>
          )}

          {authStep === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <p className="text-xs text-muted-foreground">Este telefone ainda não possui cadastro neste aparelho. Informe seus dados para continuar.</p>
              <div><Label htmlFor="register-name" className="text-xs">Nome completo</Label><Input id="register-name" required value={registerName} onChange={e => setRegisterName(e.target.value)} placeholder="Seu nome" className="mt-1" autoFocus /></div>
              <div className="grid grid-cols-[1fr_90px] gap-2">
                <div><Label htmlFor="register-street" className="text-xs">Rua</Label><Input id="register-street" required value={registerStreet} onChange={e => setRegisterStreet(e.target.value)} placeholder="Nome da rua" className="mt-1" /></div>
                <div><Label htmlFor="register-number" className="text-xs">Número</Label><Input id="register-number" required value={registerNumber} onChange={e => setRegisterNumber(e.target.value)} placeholder="Nº" className="mt-1" /></div>
              </div>
              <div><Label htmlFor="register-neighborhood" className="text-xs">Bairro</Label><Input id="register-neighborhood" required value={registerNeighborhood} onChange={e => setRegisterNeighborhood(e.target.value)} placeholder="Seu bairro" className="mt-1" /></div>
              <div className="grid grid-cols-[1fr_80px] gap-2">
                <div><Label htmlFor="register-city" className="text-xs">Cidade</Label><Input id="register-city" value={registerCity} onChange={e => setRegisterCity(e.target.value)} placeholder="Cidade" className="mt-1" /></div>
                <div><Label htmlFor="register-state" className="text-xs">UF</Label><Input id="register-state" maxLength={2} value={registerState} onChange={e => setRegisterState(e.target.value.toUpperCase())} placeholder="UF" className="mt-1" /></div>
              </div>
              {authErr && <p className="text-xs text-destructive">{authErr}</p>}
              <Button type="submit" className="w-full">CADASTRAR E ENTRAR</Button>
              <button type="button" onClick={resetAuth} className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground">Usar outro telefone</button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <OffersModal
        open={offersOpen}
        onClose={() => setOffersOpen(false)}
        products={offerProducts}
        onPick={(p) => handleAddToCart(p)}
      />

      <RestaurantInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} restaurant={restaurant} />
      <RestaurantReviewsModal open={reviewsOpen} onClose={() => setReviewsOpen(false)} restaurantName={restaurant.name} rating={restaurant.rating} ownerKey={restaurant.slug} isActive={restaurant.isOpen} />

    </div>
  );
}
