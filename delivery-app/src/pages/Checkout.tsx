import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Plus, Edit2, Trash2, X, Banknote,
  ShieldCheck, Clock, Lock, Tag, ChevronDown, User, CreditCard, FileText, CheckCircle2, Navigation, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { PaymentSelector } from '@/components/client/PaymentSelector';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getRestaurantBySlug } from '@/data/restaurants';
import { PaymentMethod, Address } from '@/types';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AddressFormData {
  label: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

const emptyAddressForm: AddressFormData = {
  label: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '',
};

const phoneDigits = (value: string) => value.replace(/\D/g, '').slice(0, 11);

const formatPhone = (value: string) => {
  const digits = phoneDigits(value);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return digits.replace(/^(\d{2})(\d+)/, '($1) $2');
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
  return digits.replace(/^(\d{2})(\d{5})(\d{1,4})$/, '($1) $2-$3');
};

const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

function AddressFormDialog({ open, onClose, onSave, initialData, title }: {
  open: boolean; onClose: () => void; onSave: (data: AddressFormData) => void; initialData: AddressFormData; title: string;
}) {
  const [form, setForm] = useState<AddressFormData>(initialData);
  if (!open) return null;
  const update = (field: keyof AddressFormData, value: string) => setForm(prev => ({ ...prev, [field]: value }));
  const canSave = form.label && form.street && form.number && form.neighborhood && form.city && form.state;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
      <div className="relative bg-background w-full max-w-md rounded-t-2xl sm:rounded-2xl border shadow-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
          <h3 className="font-semibold">{title}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-4 space-y-3">
          <div className="space-y-1.5"><Label className="text-xs">Nome do endereço *</Label><Input placeholder="Ex: Casa, Trabalho..." value={form.label} onChange={e => update('label', e.target.value)} className="h-9 text-sm" /></div>
          <div className="space-y-1.5"><Label className="text-xs">CEP</Label><Input placeholder="00000-000" value={form.zipCode} onChange={e => update('zipCode', e.target.value)} className="h-9 text-sm" /></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1.5"><Label className="text-xs">Rua / Avenida *</Label><Input value={form.street} onChange={e => update('street', e.target.value)} className="h-9 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Nº *</Label><Input value={form.number} onChange={e => update('number', e.target.value)} className="h-9 text-sm" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Complemento</Label><Input placeholder="Apto, Bloco, Casa..." value={form.complement} onChange={e => update('complement', e.target.value)} className="h-9 text-sm" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Bairro *</Label><Input value={form.neighborhood} onChange={e => update('neighborhood', e.target.value)} className="h-9 text-sm" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label className="text-xs">Cidade *</Label><Input value={form.city} onChange={e => update('city', e.target.value)} className="h-9 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Estado *</Label><Input value={form.state} onChange={e => update('state', e.target.value)} className="h-9 text-sm" /></div>
          </div>
          <Button className="w-full mt-2" disabled={!canSave} onClick={() => onSave(form)}>Salvar endereço</Button>
        </div>
      </div>
    </div>
  );
}

// Cupons mock
const MOCK_COUPONS: Record<string, { discount: number; type: 'percent' | 'fixed'; label: string }> = {
  BEMVINDO10: { discount: 10, type: 'percent', label: '10% off' },
  FRETEGRATIS: { discount: 0, type: 'fixed', label: 'Frete grátis' },
  USELIVRE15: { discount: 15, type: 'percent', label: '15% off' },
};

// Section header padronizada
const STEP_ACCENTS: Record<number, string> = {
  1: 'bg-info/10 text-info',
  2: 'bg-primary/10 text-primary',
  3: 'bg-success/10 text-success',
  4: 'bg-warning/10 text-warning',
};
function SectionHeader({ icon: Icon, step, title, hint }: { icon: React.ElementType; step: number; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold shadow-sm', STEP_ACCENTS[step] ?? 'bg-primary/10 text-primary')}>
        {step}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" />{title}</h2>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

export default function Checkout() {
  const { vendorSlug } = useParams<{ vendorSlug: string }>();
  const navigate = useNavigate();
  const { cart, clearCart, deliveryMode } = useCart();
  const { user, addresses, getDefaultAddress } = useAuth();
  const restaurant = (vendorSlug ? getRestaurantBySlug(vendorSlug) : undefined)
    || getRestaurantBySlug('sabor-arte');

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [cpf, setCpf] = useState('');
  const [checkoutAddressList, setCheckoutAddressList] = useState<Address[]>(user ? addresses : []);
  const [selectedAddress, setSelectedAddress] = useState<Address | undefined>(user ? getDefaultAddress() : undefined);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [changeAmount, setChangeAmount] = useState<number | undefined>();
  const [observation, setObservation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [customerLookupMessage, setCustomerLookupMessage] = useState('');
  const [lookupAddress, setLookupAddress] = useState<Address | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const lookupRequest = useRef(0);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredAccess = useRef(false);
  const orderRequestId = useRef(crypto.randomUUID());
  const activePhoneDigits = useRef('');

  useEffect(() => {
    let active = true;
    void (supabase as any).rpc('get_public_menu', { p_slug: vendorSlug }).then(({ data }: { data: { tenantId?: string } | null }) => {
      if (active && data?.tenantId) setTenantId(data.tenantId);
    });
    return () => {
      active = false;
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
    };
  }, [vendorSlug]);

  const saveCustomerProfileOnDevice = (address: Address, phoneValue = phone, nameValue = name) => {
    const digits = phoneDigits(phoneValue);
    if (digits.length < 10) return;
    localStorage.setItem(`cardapio_delivery_profile_${digits}`, JSON.stringify({
      name: nameValue.trim(),
      phone: digits,
      address,
      updatedAt: Date.now(),
    }));
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    const digits = phoneDigits(value);
    const requestId = ++lookupRequest.current;
    let currentToken = '';
    if (activePhoneDigits.current && activePhoneDigits.current !== digits) {
      setName('');
      setSelectedAddress(undefined);
      setLookupAddress(null);
    }
    activePhoneDigits.current = digits;
    setPhone(formatted);
    setCustomerLookupMessage('');
    setLookupAddress(null);
    if (digits.length >= 10) {
      try {
        const currentAccess = JSON.parse(localStorage.getItem('cardapio_delivery_access') || 'null') as { phone?: string; token?: string } | null;
        if (currentAccess?.phone === digits) currentToken = currentAccess.token || '';
      } catch { /* armazenamento inválido será substituído */ }
      localStorage.setItem('cardapio_delivery_access', JSON.stringify({
        phone: digits,
        token: currentToken,
        updatedAt: Date.now(),
      }));
      try {
        const localProfile = JSON.parse(localStorage.getItem(`cardapio_delivery_profile_${digits}`) || 'null') as {
          name?: string;
          address?: Address;
        } | null;
        if (localProfile?.name) setName(localProfile.name);
        if (localProfile?.address) {
          setLookupAddress(localProfile.address);
          setSelectedAddress(localProfile.address);
          setCustomerLookupMessage('Endereço salvo neste aparelho preenchido automaticamente.');
        }
      } catch {
        localStorage.removeItem(`cardapio_delivery_profile_${digits}`);
      }
    }
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    if (digits.length < 10 || !tenantId) return;

    setCustomerLookupMessage('Buscando seu cadastro...');
    lookupTimer.current = setTimeout(() => {
      void (supabase as any).rpc('get_public_customer', {
        p_tenant_id: tenantId,
        p_phone: digits,
        p_access_token: currentToken,
      }).then(({ data, error }: { data: any; error: { message?: string } | null }) => {
        if (requestId !== lookupRequest.current) return;
        if (error || !data) {
          setCustomerLookupMessage('Telefone não cadastrado. Preencha seus dados para continuar.');
          setSelectedAddress(undefined);
          return;
        }

        setName(data.name || '');
        const savedAddress: Address = {
          id: `customer-${digits}`,
          label: 'Endereço cadastrado',
          street: data.street || '',
          number: data.number || '',
          complement: data.reference || '',
          neighborhood: data.neighborhood || '',
          city: '',
          state: '',
          zipCode: '',
          isDefault: true,
        };
        setLookupAddress(savedAddress);
        setSelectedAddress(savedAddress);
        saveCustomerProfileOnDevice(savedAddress, formatted, data.name || '');
        setCustomerLookupMessage('Cadastro encontrado. Seus dados foram preenchidos automaticamente.');
      });
    }, 120);
  };

  useEffect(() => {
    if (!tenantId || restoredAccess.current) return;
    restoredAccess.current = true;
    try {
      const access = JSON.parse(localStorage.getItem('cardapio_delivery_access') || 'null') as {
        phone?: string;
        token?: string;
      } | null;
      const digits = phoneDigits(access?.phone || '');
      if (digits.length >= 10) {
        handlePhoneChange(digits);
        setCustomerLookupMessage('Você continua conectado. Atualizando seus dados...');
      }
    } catch {
      localStorage.removeItem('cardapio_delivery_access');
    }
  }, [tenantId]);

  const checkoutAddresses = lookupAddress ? [lookupAddress] : checkoutAddressList;

  const subtotal = cart?.subtotal || 0;
  const isDelivery = deliveryMode !== 'pickup';
  const deliveryFee = !isDelivery || appliedCoupon?.code === 'FRETEGRATIS' ? 0 : (cart?.deliveryFee || 0);
  const discount = appliedCoupon
    ? appliedCoupon.code === 'FRETEGRATIS'
      ? (cart?.deliveryFee || 0)
      : (subtotal * appliedCoupon.discount) / 100
    : 0;
  const total = Math.max(0, subtotal + deliveryFee - (appliedCoupon?.code === 'FRETEGRATIS' ? 0 : discount));

  const isValid = name.trim() && phone.trim() && (!isDelivery || selectedAddress) && cart && cart.items.length > 0;
  const changeNeeded = paymentMethod === 'cash' && changeAmount ? changeAmount - total : null;

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    const found = MOCK_COUPONS[code];
    if (!found) {
      toast({ title: 'Cupom inválido', description: 'Verifique o código e tente novamente.', variant: 'destructive' });
      return;
    }
    setAppliedCoupon({ code, discount: found.discount, label: found.label });
    toast({ title: 'Cupom aplicado!', description: found.label });
    setCouponInput('');
  };

  const handleAddNew = () => { setEditingAddress(null); setAddressDialogOpen(true); };
  const useCurrentLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Este aparelho não oferece localização automática. Digite o endereço manualmente.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${coords.latitude}&lon=${coords.longitude}`, {
          headers: { 'Accept-Language': 'pt-BR' },
        });
        if (!response.ok) throw new Error('reverse-geocode');
        const result = await response.json() as {
          display_name?: string;
          address?: { road?: string; pedestrian?: string; house_number?: string; suburb?: string; neighbourhood?: string; quarter?: string; city?: string; town?: string; village?: string; municipality?: string; state?: string; postcode?: string };
        };
        const found = result.address || {};
        const located: Address = {
          id: `gps-${Date.now()}`, label: 'Localização atual',
          street: found.road || found.pedestrian || result.display_name || 'Localização via GPS',
          number: found.house_number || 'S/N',
          neighborhood: found.suburb || found.neighbourhood || found.quarter || '',
          city: found.city || found.town || found.village || found.municipality || '',
          state: found.state || '', zipCode: found.postcode || '', isDefault: true,
          lat: coords.latitude, lng: coords.longitude,
        };
        setLookupAddress(located);
        setSelectedAddress(located);
        saveCustomerProfileOnDevice(located);
        toast({ title: 'Localização encontrada!', description: 'Confira o endereço antes de confirmar o pedido.' });
      } catch {
        setLocationError('Localização encontrada, mas não foi possível identificar o endereço. Cadastre-o manualmente.');
      } finally {
        setLocating(false);
      }
    }, (error) => {
      setLocating(false);
      setLocationError(error.code === error.PERMISSION_DENIED
        ? 'Permissão de localização negada. Autorize o GPS no navegador ou digite o endereço manualmente.'
        : 'Não foi possível identificar sua localização. Tente novamente.');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  };
  const handleEdit = (addr: Address) => { setEditingAddress(addr); setAddressDialogOpen(true); };
  const handleDelete = (addr: Address) => {
    const remaining = checkoutAddressList.filter(item => item.id !== addr.id);
    setCheckoutAddressList(remaining);
    if (lookupAddress?.id === addr.id) setLookupAddress(null);
    if (selectedAddress?.id === addr.id) setSelectedAddress(remaining[0]);
    toast({ title: 'Endereço removido' });
  };

  const handleSaveAddress = (data: AddressFormData) => {
    if (editingAddress) {
      const updated = { ...editingAddress, ...data };
      setCheckoutAddressList(current => current.map(item => item.id === editingAddress.id ? updated : item));
      setLookupAddress(current => current?.id === editingAddress.id ? updated : current);
      setSelectedAddress(updated);
      saveCustomerProfileOnDevice(updated);
      toast({ title: 'Endereço atualizado!' });
    } else {
      const created: Address = { ...data, id: `address-${Date.now()}`, isDefault: checkoutAddressList.length === 0 };
      setCheckoutAddressList(current => [...current, created]);
      setSelectedAddress(created);
      saveCustomerProfileOnDevice(created);
      toast({ title: 'Endereço adicionado!' });
    }
    setAddressDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!isValid || !cart || !restaurant) return;
    setIsSubmitting(true);
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    const orderItems = cart.items.map(i => ({
      productName: i.productName,
      productImage: i.productImage,
      quantity: i.quantity,
      totalPrice: i.totalPrice,
      complements: i.complements.map(c => c.complementName),
      removedIngredients: i.removedIngredients || [],
    }));
    const { data: publicMenu, error: menuError } = await (supabase as any).rpc('get_public_menu', {
      p_slug: vendorSlug,
    });
    const tenantId = publicMenu?.tenantId;
    const tenantName = publicMenu?.tenantName;
    if (menuError || !tenantId) {
      toast({ title: 'Não foi possível enviar o pedido', description: 'A loja não está disponível no momento.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }
    const commandItems = cart.items.map(item => ({
      productId: item.productId,
      name: item.productName,
      qty: item.quantity,
      price: item.unitPrice,
      detail: [
        ...item.complements.map(complement => complement.complementName),
        ...(item.removedIngredients || []).map(ingredient => `Sem ${ingredient}`),
        item.observation || '',
      ].filter(Boolean).join(' · '),
      delivered: false,
    }));
    let currentAccessToken = '';
    try {
      const access = JSON.parse(localStorage.getItem('cardapio_delivery_access') || 'null') as { phone?: string; token?: string } | null;
      if (access?.phone === phoneDigits(phone)) currentAccessToken = access.token || '';
    } catch { /* um novo token será emitido após o pedido */ }
    const { data: orderResult, error: orderError } = await (supabase as any).rpc('submit_public_order', {
      p_tenant_id: tenantId,
      p_customer: {
        name: name.trim(),
        phone: phone.replace(/\D/g, ''),
        street: selectedAddress?.street || '',
        number: selectedAddress?.number || '',
        neighborhood: selectedAddress?.neighborhood || '',
        reference: [selectedAddress?.complement, selectedAddress?.city, selectedAddress?.state].filter(Boolean).join(' · '),
        latitude: selectedAddress?.lat ?? null,
        longitude: selectedAddress?.lng ?? null,
        accessToken: currentAccessToken,
      },
      p_order: {
        requestId: orderRequestId.current,
        items: commandItems,
        count: cart.items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
        deliveryFee,
        total,
        fulfillment: deliveryMode,
        payment: paymentMethod,
        coupon: appliedCoupon?.code || '',
        notes: observation.trim(),
      },
    });
    if (orderError) {
      toast({ title: 'Não foi possível enviar o pedido', description: orderError.message, variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }
    const savedOrderId = Number(orderResult?.id);
    const authoritativeTotal = Number(orderResult?.total ?? total);
    const publicOrderNumber = Number.isFinite(savedOrderId)
      ? `ORD-${String(savedOrderId).slice(-6)}`
      : orderNumber;
    const trackingState = {
        vendorSlug: vendorSlug || 'proveu-espeto',
        orderNumber: publicOrderNumber,
        orderId: savedOrderId,
        tenantId,
        customerPhone: phoneDigits(phone),
        createdAt: Date.now(),
        restaurantName: tenantName || restaurant.name,
        total: authoritativeTotal,
        estimatedTime: restaurant.deliveryTime,
        paymentMethod,
        observation: observation.trim() || undefined,
        cpf: cpf.trim() || undefined,
        items: orderItems,
      };
    // Em uma repeticao idempotente (duplo clique ou retry da rede), uma das
    // respostas pode ser `existing` e nao carregar novamente o token secreto.
    // Preserve o token que a primeira resposta acabou de salvar, em vez de
    // desconectar o cliente sobrescrevendo-o com uma string vazia.
    let latestDeviceToken = '';
    try {
      latestDeviceToken = localStorage.getItem(`cardapio_delivery_device_token_${tenantId}_${phoneDigits(phone)}`) || '';
    } catch { /* armazenamento indisponivel; o token da resposta ainda sera usado */ }
    const issuedToken = orderResult?.customerToken || currentAccessToken || latestDeviceToken;
    localStorage.setItem('cardapio_delivery_access', JSON.stringify({
      phone: phoneDigits(phone),
      tenantId,
      vendorSlug: vendorSlug || 'proveu-espeto',
      token: issuedToken,
      updatedAt: Date.now(),
    }));
    if (issuedToken) localStorage.setItem(`cardapio_delivery_device_token_${tenantId}_${phoneDigits(phone)}`, issuedToken);
    if (selectedAddress) saveCustomerProfileOnDevice(selectedAddress);
    clearCart();
    navigate(`/pedido/${savedOrderId}?loja=${encodeURIComponent(vendorSlug || 'proveu-espeto')}`, { state: trackingState });
    toast({ title: 'Pedido enviado!', description: `Seu pedido ${publicOrderNumber} foi recebido.` });
    setIsSubmitting(false);
  };

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-lg text-muted-foreground text-center">Seu carrinho está vazio</p>
        <Button onClick={() => navigate(`/cardapio/${vendorSlug || 'sabor-arte'}`)}>Voltar ao cardápio</Button>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-lg text-muted-foreground text-center">Restaurante não encontrado</p>
        <Button onClick={() => navigate(`/cardapio/${vendorSlug || 'sabor-arte'}`)}>Voltar ao cardápio</Button>
      </div>
    );
  }

  // ===== Summary card reutilizável =====
  const SummaryCard = (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background border text-xl overflow-hidden shrink-0">
          {restaurant.logo.startsWith('http')
            ? <img src={restaurant.logo} alt={restaurant.name} className="h-full w-full object-cover" />
            : restaurant.logo}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{restaurant.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Pronto em ~{restaurant.deliveryTime}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
        {cart.items.map(item => (
          <div key={item.id} className="flex items-start gap-3 text-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-base overflow-hidden">
              {item.productImage?.startsWith('http')
                ? <img src={item.productImage} alt={item.productName} className="h-full w-full object-cover" />
                : (item.productImage || '🍽️')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                <span className="text-muted-foreground mr-1">{item.quantity}×</span>{item.productName}
              </p>
              {item.complements.length > 0 && (
                <p className="text-xs text-muted-foreground truncate">
                  {item.complements.map(c => c.complementName).join(', ')}
                </p>
              )}
              {item.removedIngredients && item.removedIngredients.length > 0 && (
                <p className="text-xs text-destructive truncate">
                  Sem {item.removedIngredients.join(', ')}
                </p>
              )}
            </div>
            <span className="font-medium whitespace-nowrap">{brl(item.totalPrice)}</span>
          </div>
        ))}
      </div>

      <Separator />

      <div className="p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{brl(subtotal)}</span>
        </div>
        {isDelivery && <div className="flex justify-between">
          <span className="text-muted-foreground">Taxa de entrega</span>
          <span>{deliveryFee === 0 ? <span className="text-success font-medium">Grátis</span> : brl(deliveryFee)}</span>
        </div>}
        {appliedCoupon && appliedCoupon.code !== 'FRETEGRATIS' && (
          <div className="flex justify-between text-success">
            <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> {appliedCoupon.code}</span>
            <span>−{brl(discount)}</span>
          </div>
        )}
        <Separator className="my-2" />
        <div className="flex justify-between items-baseline">
          <span className="font-semibold">Total</span>
          <span className="text-xl font-bold tracking-tight">{brl(total)}</span>
        </div>
      </div>

      {/* Trust signals dentro do summary */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-2 pt-3 border-t">
          <div className="flex flex-col items-center text-center gap-1">
            <ShieldCheck className="h-4 w-4 text-success" />
            <span className="text-[10px] text-muted-foreground leading-tight">Pagamento<br />seguro</span>
          </div>
          <div className="flex flex-col items-center text-center gap-1">
            <Clock className="h-4 w-4 text-info" />
            <span className="text-[10px] text-muted-foreground leading-tight">Entrega<br />estimada</span>
          </div>
          <div className="flex flex-col items-center text-center gap-1">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground leading-tight">Dados<br />protegidos</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/20 pb-32 lg:pb-12">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="container flex items-center gap-3 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold leading-tight">Finalizar pedido</h1>
            <p className="text-xs text-muted-foreground truncate">{restaurant.name}</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Checkout seguro
          </div>
        </div>
      </header>

      {/* Mobile summary collapse */}
      <div className="lg:hidden sticky top-[65px] z-10 border-b bg-background">
        <button
          onClick={() => setMobileSummaryOpen(v => !v)}
          className="w-full container flex items-center justify-between py-3 text-sm"
        >
          <span className="flex items-center gap-2">
            <span className="font-medium">{cart.items.reduce((s, i) => s + i.quantity, 0)} itens</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-semibold">{brl(total)}</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {mobileSummaryOpen ? 'Ocultar' : 'Ver resumo'}
            <ChevronDown className={cn('h-4 w-4 transition-transform', mobileSummaryOpen && 'rotate-180')} />
          </span>
        </button>
        {mobileSummaryOpen && (
          <div className="container pb-4">{SummaryCard}</div>
        )}
      </div>

      <main className="container py-6 lg:py-8">
        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* COLUNA PRINCIPAL */}
          <div className="space-y-4">
            {/* 1. Dados */}
            <section className="rounded-2xl border bg-card p-5 lg:p-6">
              <SectionHeader icon={User} step={1} title="Seus dados" hint="Para identificar seu pedido" />
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" value={phone} onChange={e => handlePhoneChange(e.target.value)} />
                  {customerLookupMessage && <p className="text-xs text-muted-foreground">{customerLookupMessage}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input id="name" autoComplete="name" placeholder="Seu nome completo" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF (opcional)</Label>
                    <Input id="cpf" placeholder="000.000.000-00" value={cpf} onChange={e => setCpf(e.target.value)} />
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Endereço */}
            {isDelivery && <section className="rounded-2xl border bg-card p-5 lg:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold shadow-sm">2</div>
                  <div>
                    <h2 className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />Endereço de entrega</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Onde devemos entregar?</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="gap-1" onClick={handleAddNew}>
                  <Plus className="h-4 w-4" /> Novo
                </Button>
              </div>

              {checkoutAddresses.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed p-8 text-center">
                  <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={handleAddNew}>Adicionar endereço</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {checkoutAddresses.map(addr => {
                    const selected = selectedAddress?.id === addr.id;
                    return (
                      <button
                        key={addr.id}
                        onClick={() => setSelectedAddress(addr)}
                        className={cn(
                          'w-full rounded-xl border-2 p-4 text-left transition-all',
                          selected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm">{addr.label}</p>
                              {selected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{addr.street}, {addr.number}{addr.complement && ` - ${addr.complement}`}</p>
                            {(addr.neighborhood || addr.city || addr.state) && <p className="text-xs text-muted-foreground">
                              {[addr.neighborhood, [addr.city, addr.state].filter(Boolean).join('/')].filter(Boolean).join(' · ')}
                            </p>}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); handleEdit(addr); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); handleDelete(addr); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <Button type="button" variant="outline" className="mt-3 w-full gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary" onClick={useCurrentLocation} disabled={locating}>
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                {locating ? 'Buscando sua localização...' : 'Usar minha localização pelo GPS'}
              </Button>
              {locationError && <p className="mt-2 text-xs text-destructive">{locationError}</p>}
            </section>}

            {/* 3. Pagamento + Cupom */}
            <section className="rounded-2xl border bg-card p-5 lg:p-6">
              <SectionHeader icon={CreditCard} step={3} title="Forma de pagamento" hint="Pagamento na entrega" />
              <PaymentSelector
                value={paymentMethod}
                onChange={setPaymentMethod}
                change={changeAmount}
                onChangeAmountChange={setChangeAmount}
              />
              {paymentMethod === 'cash' && changeAmount && (
                <div className="mt-3 rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Troco:</span>
                    {changeNeeded !== null && changeNeeded >= 0 ? (
                      <span className="font-semibold text-success">{brl(changeNeeded)}</span>
                    ) : (
                      <span className="font-semibold text-destructive">Valor menor que o total</span>
                    )}
                  </div>
                </div>
              )}

              {/* Cupom */}
              <div className="mt-5 pt-5 border-t">
                <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-muted-foreground" /> Cupom de desconto
                </Label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-lg border-2 border-success/30 bg-success/5 p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <div>
                        <p className="text-sm font-semibold">{appliedCoupon.code}</p>
                        <p className="text-xs text-muted-foreground">{appliedCoupon.label}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setAppliedCoupon(null)}>Remover</Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite o código"
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value.toUpperCase())}
                      className="uppercase"
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
                    />
                    <Button variant="outline" onClick={handleApplyCoupon} disabled={!couponInput.trim()}>
                      Aplicar
                    </Button>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground mt-2">Experimente: <span className="font-mono">BEMVINDO10</span> · <span className="font-mono">FRETEGRATIS</span></p>
              </div>
            </section>

            {/* 4. Observações */}
            <section className="rounded-2xl border bg-card p-5 lg:p-6">
              <SectionHeader icon={FileText} step={4} title="Observações" hint="Algo especial para o restaurante?" />
              <Textarea
                id="observation"
                placeholder="Ex: sem cebola, caprichar no molho, tocar a campainha…"
                value={observation}
                onChange={e => setObservation(e.target.value)}
                rows={3}
              />
            </section>

            {/* Trust strip (mobile) */}
            <div className="lg:hidden flex items-center justify-around rounded-2xl border bg-card px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-success" /> Pagamento seguro</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-4 w-4" /> Dados protegidos</div>
            </div>
          </div>

          {/* SIDEBAR STICKY (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              {SummaryCard}
              <Button
                className="w-full h-12 text-base font-semibold"
                size="lg"
                disabled={!isValid || isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? 'Enviando…' : `Confirmar pedido · ${brl(total)}`}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground px-4">
                Ao confirmar, você concorda com os termos da loja e da plataforma.
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer fixo (mobile) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-20 shadow-[0_-4px_20px_-8px_hsl(var(--foreground)/0.15)]">
        <div className="container p-0">
          <Button
            className="w-full h-12 text-base font-semibold"
            size="lg"
            disabled={!isValid || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Enviando…' : `Confirmar · ${brl(total)}`}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            Ao confirmar, você concorda com os termos da loja e da plataforma.
          </p>
        </div>
      </div>

      <AddressFormDialog
        open={addressDialogOpen}
        onClose={() => setAddressDialogOpen(false)}
        onSave={handleSaveAddress}
        initialData={editingAddress
          ? { label: editingAddress.label, street: editingAddress.street, number: editingAddress.number, complement: editingAddress.complement || '', neighborhood: editingAddress.neighborhood, city: editingAddress.city, state: editingAddress.state, zipCode: editingAddress.zipCode }
          : emptyAddressForm}
        title={editingAddress ? 'Editar endereço' : 'Novo endereço'}
      />
    </div>
  );
}
