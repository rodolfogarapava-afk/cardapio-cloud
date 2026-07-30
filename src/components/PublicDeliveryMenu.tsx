import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock3,
  CreditCard,
  Loader2,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Smartphone,
  Store,
  Trash2,
  Truck,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/routes/index";
import "./public-delivery-menu.css";

type PublicCatalog = {
  tenantId: string;
  tenantName: string;
  products: Product[];
  categories: string[];
};

type CartDetail = { point?: string; note?: string };
type CheckoutData = {
  name: string;
  phone: string;
  street: string;
  number: string;
  neighborhood: string;
  reference: string;
  latitude: number | null;
  longitude: number | null;
  payment: string;
  coupon: string;
  notes: string;
};
type SavedCustomerProfile = Pick<CheckoutData, "name" | "phone" | "street" | "number" | "neighborhood" | "reference" | "latitude" | "longitude">;

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const preparationOptions = ["Mal passado", "Ao ponto", "Bem passado"];
const customerProfilesKey = "cardapio_cloud_customer_profiles";
const lastCustomerKey = "cardapio_cloud_last_customer";

const phoneDigits = (value: string) => value.replace(/\D/g, "").slice(0, 11);
const formatPhone = (value: string) => {
  const digits = phoneDigits(value);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 7) return digits.replace(/^(\d{2})(\d+)/, "($1) $2");
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  return digits.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
};

function productImage(product: Product) {
  return product.image?.trim() || "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=900&q=82";
}

export default function PublicDeliveryMenu({ catalog }: { catalog: PublicCatalog }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(catalog.categories[0] || "");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [details, setDetails] = useState<Record<number, CartDetail>>({});
  const [screen, setScreen] = useState<"menu" | "cart" | "checkout" | "success">("menu");
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [point, setPoint] = useState("");
  const [itemNote, setItemNote] = useState("");
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [detailPoint, setDetailPoint] = useState("");
  const [detailNote, setDetailNote] = useState("");
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "success" | "error">("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const [rememberCustomer, setRememberCustomer] = useState(true);
  const [customerLookupMessage, setCustomerLookupMessage] = useState("");
  const [productSlide, setProductSlide] = useState(0);
  const productCarouselRef = useRef<HTMLDivElement>(null);
  const [checkout, setCheckout] = useState<CheckoutData>({
    name: "", phone: "", street: "", number: "", neighborhood: "",
    reference: "", latitude: null, longitude: null, payment: "", coupon: "", notes: "",
  });

  useEffect(() => {
    try {
      const cookieValue = document.cookie.split("; ").find((item) => item.startsWith(`${lastCustomerKey}=`))?.split("=").slice(1).join("=");
      const saved = localStorage.getItem(lastCustomerKey) || (cookieValue ? decodeURIComponent(cookieValue) : "");
      if (!saved) return;
      const customer = JSON.parse(saved) as Partial<SavedCustomerProfile>;
      if (customer.name && customer.phone) {
        setCheckout((current) => ({
          ...current,
          name: customer.name || "",
          phone: formatPhone(customer.phone || ""),
          street: customer.street || current.street,
          number: customer.number || current.number,
          neighborhood: customer.neighborhood || current.neighborhood,
          reference: customer.reference || current.reference,
          latitude: customer.latitude ?? current.latitude,
          longitude: customer.longitude ?? current.longitude,
        }));
        setCustomerLookupMessage(customer.street
          ? "Nome e endereço foram preenchidos automaticamente."
          : "Seus dados foram preenchidos automaticamente.");
      }
    } catch {
      // O cadastro local é opcional; o checkout continua funcionando sem ele.
    }
  }, []);

  const products = useMemo(() => catalog.products.filter((product) => {
    const matchesCategory = !activeCategory || product.category === activeCategory;
    const term = query.trim().toLowerCase();
    return matchesCategory && (!term || `${product.name} ${product.description}`.toLowerCase().includes(term));
  }), [catalog.products, activeCategory, query]);
  const cartProducts = useMemo(() => Object.entries(cart).flatMap(([id, quantity]) => {
    const product = catalog.products.find((item) => item.id === Number(id));
    return product && quantity ? [{ product, quantity }] : [];
  }), [cart, catalog.products]);
  const count = cartProducts.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cartProducts.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const deliveryFee = fulfillment === "delivery" ? 3.9 : 0;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    setProductSlide(0);
    productCarouselRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [activeCategory, query]);

  const updateProductSlide = () => {
    const carousel = productCarouselRef.current;
    if (!carousel) return;
    const cards = Array.from(carousel.children) as HTMLElement[];
    if (!cards.length) return;
    let nearest = 0;
    let distance = Number.POSITIVE_INFINITY;
    cards.forEach((card, index) => {
      const nextDistance = Math.abs(card.offsetLeft - carousel.scrollLeft);
      if (nextDistance < distance) {
        distance = nextDistance;
        nearest = index;
      }
    });
    setProductSlide(nearest);
  };
  const goToProductSlide = (index: number) => {
    const carousel = productCarouselRef.current;
    const card = carousel?.children[index] as HTMLElement | undefined;
    if (!carousel || !card) return;
    carousel.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
    setProductSlide(index);
  };
  useEffect(() => {
    if (products.length <= 1 || screen !== "menu" || detailProduct) return;
    const interval = window.setInterval(() => {
      setProductSlide((current) => {
        const next = (current + 1) % products.length;
        const carousel = productCarouselRef.current;
        const card = carousel?.children[next] as HTMLElement | undefined;
        if (carousel && card) carousel.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
        return next;
      });
    }, 3000);
    return () => window.clearInterval(interval);
  }, [products.length, screen, detailProduct]);

  const changeQuantity = (product: Product, amount: number) => {
    setCart((current) => {
      const maximum = product.trackStock ? Number(product.stock || 0) : Number.POSITIVE_INFINITY;
      const next = Math.min(maximum, Math.max(0, (current[product.id] || 0) + amount));
      const updated = { ...current };
      if (next) updated[product.id] = next;
      else delete updated[product.id];
      return updated;
    });
  };
  const requestAdd = (product: Product) => {
    if (product.trackStock && Number(product.stock || 0) <= 0) return;
    if (product.preparationPointEnabled ?? product.category === "Espetinhos") {
      setPendingProduct(product);
      setPoint(details[product.id]?.point || "");
      setItemNote(details[product.id]?.note || "");
      return;
    }
    changeQuantity(product, 1);
  };
  const confirmPreparation = () => {
    if (!pendingProduct || !point) return;
    setDetails((current) => ({ ...current, [pendingProduct.id]: { point, note: itemNote.trim() } }));
    changeQuantity(pendingProduct, 1);
    setPendingProduct(null);
    setPoint("");
    setItemNote("");
  };
  const openProductDetails = (product: Product) => {
    setDetailProduct(product);
    setDetailQuantity(1);
    setDetailPoint(details[product.id]?.point || "");
    setDetailNote(details[product.id]?.note || "");
  };
  const closeProductDetails = () => {
    setDetailProduct(null);
    setDetailQuantity(1);
    setDetailPoint("");
    setDetailNote("");
  };
  const addDetailedProduct = () => {
    if (!detailProduct) return;
    const needsPoint = detailProduct.preparationPointEnabled ?? detailProduct.category === "Espetinhos";
    if (needsPoint && !detailPoint) return;
    setDetails((current) => ({
      ...current,
      [detailProduct.id]: { point: needsPoint ? detailPoint : undefined, note: detailNote.trim() },
    }));
    changeQuantity(detailProduct, detailQuantity);
    closeProductDetails();
  };
  const updateCheckout = (field: keyof CheckoutData, value: string) =>
    setCheckout((current) => ({ ...current, [field]: value }));
  const updateCustomerPhone = (value: string) => {
    const formatted = formatPhone(value);
    const digits = phoneDigits(value);
    setCheckout((current) => ({ ...current, phone: formatted }));
    setCustomerLookupMessage("");
    if (digits.length < 10) return;
    try {
      const profiles = JSON.parse(localStorage.getItem(customerProfilesKey) || "{}") as Record<string, SavedCustomerProfile>;
      const knownCustomer = profiles[digits];
      if (knownCustomer?.name) {
        setCheckout((current) => ({
          ...current,
          phone: formatted,
          name: knownCustomer.name,
          street: knownCustomer.street || current.street,
          number: knownCustomer.number || current.number,
          neighborhood: knownCustomer.neighborhood || current.neighborhood,
          reference: knownCustomer.reference || current.reference,
          latitude: knownCustomer.latitude ?? current.latitude,
          longitude: knownCustomer.longitude ?? current.longitude,
        }));
        setCustomerLookupMessage(knownCustomer.street
          ? "Cadastro encontrado: nome e endereço preenchidos."
          : "Cadastro encontrado pelo telefone.");
      }
    } catch {
      // Mantém o preenchimento manual quando o armazenamento local não está disponível.
    }
  };
  const saveCustomerProfile = () => {
    if (!rememberCustomer) return;
    const digits = phoneDigits(checkout.phone);
    const customer: SavedCustomerProfile = {
      name: checkout.name.trim(),
      phone: digits,
      street: checkout.street.trim(),
      number: checkout.number.trim(),
      neighborhood: checkout.neighborhood.trim(),
      reference: checkout.reference.trim(),
      latitude: checkout.latitude,
      longitude: checkout.longitude,
    };
    if (!customer.name || digits.length < 10) return;
    try {
      const profiles = JSON.parse(localStorage.getItem(customerProfilesKey) || "{}") as Record<string, SavedCustomerProfile>;
      profiles[digits] = customer;
      localStorage.setItem(customerProfilesKey, JSON.stringify(profiles));
      localStorage.setItem(lastCustomerKey, JSON.stringify(customer));
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${lastCustomerKey}=${encodeURIComponent(JSON.stringify({ name: customer.name, phone: customer.phone }))}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
    } catch {
      // O pedido pode continuar mesmo se o navegador bloquear cookies ou armazenamento.
    }
  };
  const finishOrder = () => {
    saveCustomerProfile();
    setScreen("success");
  };
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationMessage("Este aparelho não oferece localização automática.");
      return;
    }
    setLocationStatus("requesting");
    setLocationMessage("Confirme a permissão de localização no navegador.");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const latitude = coords.latitude;
      const longitude = coords.longitude;
      setCheckout((current) => ({ ...current, latitude, longitude }));
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${latitude}&lon=${longitude}`, {
          headers: { "Accept-Language": "pt-BR" },
        });
        if (!response.ok) throw new Error("reverse-geocode");
        const result = await response.json() as {
          display_name?: string;
          address?: { road?: string; pedestrian?: string; house_number?: string; suburb?: string; neighbourhood?: string; quarter?: string };
        };
        const address = result.address || {};
        setCheckout((current) => ({
          ...current,
          street: address.road || address.pedestrian || current.street,
          number: address.house_number || current.number,
          neighborhood: address.suburb || address.neighbourhood || address.quarter || current.neighborhood,
          reference: current.reference || result.display_name || "",
          latitude,
          longitude,
        }));
        setLocationMessage("Localização encontrada. Confira o número e os dados do endereço.");
      } catch {
        setLocationMessage("Localização encontrada. Complete os dados do endereço abaixo.");
      }
      setLocationStatus("success");
    }, (error) => {
      setLocationStatus("error");
      setLocationMessage(error.code === error.PERMISSION_DENIED
        ? "Permissão negada. Ative a localização do navegador ou preencha o endereço."
        : "Não conseguimos identificar sua localização. Digite o endereço manualmente.");
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  };
  const checkoutReady = checkout.name.trim() && phoneDigits(checkout.phone).length >= 10 && checkout.payment &&
    (fulfillment === "pickup" || (checkout.street.trim() && checkout.number.trim() && checkout.neighborhood.trim()));

  if (screen === "success") {
    return <main className="delivery-success">
      <span><Check /></span>
      <p>PEDIDO REVISADO</p>
      <h1>Seu pedido está pronto para ser enviado.</h1>
      <small>Na próxima etapa, esta confirmação será conectada às comandas e à impressão automática da loja.</small>
      <button onClick={() => setScreen("menu")}>VOLTAR AO CARDÁPIO</button>
    </main>;
  }

  if (screen === "checkout") {
    return <main className="delivery-checkout">
      <header className="delivery-flow-header">
        <button onClick={() => setScreen("cart")} aria-label="Voltar ao carrinho"><ArrowLeft /></button>
        <div><h1>Finalizar pedido</h1><span>{catalog.tenantName}</span></div>
      </header>
      <button className="checkout-summary" onClick={() => setScreen("cart")}>
        <span>{count} {count === 1 ? "item" : "itens"} <b>· {money(total)}</b></span>
        <small>Ver resumo <ChevronDown /></small>
      </button>
      <div className="checkout-sections">
        <section className="checkout-card">
          <div className="checkout-card-title"><b>1</b><span><strong><UserRound /> Seus dados</strong><small>Para identificar seu pedido</small></span></div>
          <label>Nome*<input value={checkout.name} onChange={(event) => updateCheckout("name", event.target.value)} placeholder="Seu nome completo" /></label>
          <label>Telefone*<input value={checkout.phone} onChange={(event) => updateCustomerPhone(event.target.value)} placeholder="(00) 00000-0000" inputMode="tel" autoComplete="tel" /></label>
          {!!customerLookupMessage && <p className="customer-lookup-message">{customerLookupMessage}</p>}
          <label className="remember-customer"><input type="checkbox" checked={rememberCustomer} onChange={(event) => setRememberCustomer(event.target.checked)} /><span><b>Salvar meus dados neste aparelho</b><small>Na próxima compra, nome, telefone e endereço serão preenchidos automaticamente.</small></span></label>
        </section>

        <section className="checkout-card">
          <div className="checkout-card-title"><b>2</b><span><strong><MapPin /> {fulfillment === "delivery" ? "Endereço de entrega" : "Retirada no local"}</strong><small>{fulfillment === "delivery" ? "Onde devemos entregar?" : "Retire seu pedido no estabelecimento"}</small></span></div>
          {fulfillment === "delivery" ? <>
            <div className={`checkout-location-box ${locationStatus}`}>
              <div><LocateFixed /><span><strong>Não sabe o endereço?</strong><small>Use a localização do aparelho para preencher automaticamente.</small></span></div>
              <button type="button" disabled={locationStatus === "requesting"} onClick={useCurrentLocation}>
                {locationStatus === "requesting" ? <><Loader2 className="spin" /> LOCALIZANDO</> : <><LocateFixed /> USAR MINHA LOCALIZAÇÃO</>}
              </button>
              {!!locationMessage && <p>{locationMessage}</p>}
              {locationStatus === "success" && checkout.latitude !== null && checkout.longitude !== null && <a href={`https://www.google.com/maps?q=${checkout.latitude},${checkout.longitude}`} target="_blank" rel="noreferrer">Conferir ponto no Google Maps</a>}
            </div>
            <label>Rua/Avenida*<input value={checkout.street} onChange={(event) => updateCheckout("street", event.target.value)} placeholder="Rua das Flores" /></label>
            <div className="checkout-row address-row">
              <label>Número*<input value={checkout.number} onChange={(event) => updateCheckout("number", event.target.value)} placeholder="123" inputMode="numeric" /></label>
              <label>Bairro*<input value={checkout.neighborhood} onChange={(event) => updateCheckout("neighborhood", event.target.value)} placeholder="Centro" /></label>
            </div>
            <label>Complemento ou referência<input value={checkout.reference} onChange={(event) => updateCheckout("reference", event.target.value)} placeholder="Apartamento, bloco ou ponto de referência" /></label>
          </> : <div className="pickup-address"><Store /><span><strong>{catalog.tenantName}</strong><small>O endereço e o horário de retirada serão confirmados após o pedido.</small></span></div>}
        </section>

        <section className="checkout-card">
          <div className="checkout-card-title mint"><b>3</b><span><strong><CreditCard /> Forma de pagamento</strong><small>Pagamento na entrega ou retirada</small></span></div>
          <div className="payment-grid">
            {[["PIX", Smartphone], ["Cartão de Crédito", CreditCard], ["Cartão de Débito", WalletCards], ["Dinheiro", WalletCards]].map(([label, Icon]) =>
              <button key={String(label)} className={checkout.payment === label ? "active" : ""} onClick={() => updateCheckout("payment", String(label))}><Icon />{String(label)}</button>
            )}
          </div>
          <label className="coupon-field">Cupom de desconto<div><input value={checkout.coupon} onChange={(event) => updateCheckout("coupon", event.target.value.toUpperCase())} placeholder="DIGITE O CÓDIGO" /><button>APLICAR</button></div></label>
        </section>

        <section className="checkout-card">
          <div className="checkout-card-title orange"><b>4</b><span><strong>Observações</strong><small>Algo especial para o restaurante?</small></span></div>
          <textarea value={checkout.notes} onChange={(event) => updateCheckout("notes", event.target.value)} placeholder="Ex.: sem cebola, caprichar no molho..." rows={4} />
        </section>
      </div>
      <footer className="checkout-footer">
        <button disabled={!checkoutReady} onClick={finishOrder}>CONFIRMAR · {money(total)}</button>
        <small>Ao confirmar, você concorda com os termos da loja e da plataforma.</small>
      </footer>
    </main>;
  }

  if (screen === "cart") {
    return <main className="delivery-cart-page">
      <header className="cart-page-header">
        <div>
          <h1>Resumo do pedido</h1>
          <span>{catalog.tenantName}</span>
        </div>
        <div className="cart-header-actions">
          {!!count && <button className="clear-cart" onClick={() => setCart({})}>Limpar tudo</button>}
          <button className="close-cart" onClick={() => setScreen("menu")} aria-label="Fechar carrinho"><X /></button>
        </div>
      </header>
      <section className="fulfillment-section">
        <p>Como você quer receber?</p>
        <div>
          <button className={fulfillment === "delivery" ? "active" : ""} onClick={() => setFulfillment("delivery")}><Truck /><span><b>Entrega</b><small>A gente leva até você</small></span></button>
          <button className={fulfillment === "pickup" ? "active" : ""} onClick={() => setFulfillment("pickup")}><Store /><span><b>Retirada</b><small>Você retira na loja</small></span></button>
        </div>
      </section>
      <section className="delivery-cart-items">
        {cartProducts.map(({ product, quantity }) => <article key={product.id}>
          <img src={productImage(product)} alt={product.name} />
          <div className="cart-item-copy"><h2>{product.name}</h2><p>{details[product.id]?.point}{details[product.id]?.note ? ` · ${details[product.id]?.note}` : ""}</p>
            <div className="cart-item-stepper"><button onClick={() => changeQuantity(product, -1)}><Minus /></button><b>{quantity}</b><button onClick={() => changeQuantity(product, 1)}><Plus /></button></div>
          </div>
          <div className="cart-item-price"><strong>{money(product.price * quantity)}</strong>{quantity > 1 && <small>{money(product.price)} cada</small>}</div>
          <button className="remove-cart-item" onClick={() => changeQuantity(product, -quantity)} aria-label={`Remover ${product.name}`}><Trash2 /></button>
        </article>)}
        {!cartProducts.length && <div className="empty-public-cart"><ShoppingBag /><h2>Seu carrinho está vazio</h2><button onClick={() => setScreen("menu")}>ESCOLHER PRODUTOS</button></div>}
      </section>
      {!!cartProducts.length && <section className="cart-suggestions">
        <div className="suggestion-heading"><span>+</span><div><b>Que tal completar?</b><small>Adicione algo ao seu pedido</small></div></div>
        <div>{catalog.products.filter((product) => !cart[product.id]).slice(0, 5).map((product) => <button key={product.id} onClick={() => requestAdd(product)}><img src={productImage(product)} alt="" /><span>{product.name}</span><small>{money(product.price)}</small></button>)}</div>
      </section>}
      {!!cartProducts.length && <footer className="cart-totals">
        <div className="cart-total-title"><span>Resumo de valores</span><small>{count} {count === 1 ? "item selecionado" : "itens selecionados"}</small></div>
        <p><span>Subtotal</span><b>{money(subtotal)}</b></p>
        <p><span>Taxa de entrega</span><b>{fulfillment === "delivery" ? money(deliveryFee) : "Grátis"}</b></p>
        <p className="total"><span>Total</span><b>{money(total)}</b></p>
        <button onClick={() => setScreen("checkout")}><span>CONTINUAR</span><b>{money(total)}</b></button>
        <small className="cart-secure-note">Você poderá revisar os dados antes de confirmar</small>
      </footer>}
    </main>;
  }

  return <main className="public-delivery">
    <header className="public-store-header">
      <div className="store-identity">
        <span className="store-avatar"><Store /></span>
        <div><h1>{catalog.tenantName}</h1><small>Cardápio digital</small></div>
      </div>
      <button className="header-cart" onClick={() => setScreen("cart")} aria-label="Abrir carrinho"><ShoppingBag />{!!count && <b>{count}</b>}</button>
      <div className="store-meta"><span className="open"><i /> Aberto</span><span>★ 4,8</span><span><Clock3 /> 30–50 min</span><span>Pedido mín. {money(10)}</span></div>
      <div className="public-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar no cardápio..." /></div>
      <nav className="public-categories">{catalog.categories.map((category) => <button key={category} className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)}>{category}{activeCategory === category && <X />}</button>)}</nav>
    </header>
    <section className="public-menu-content">
      <div className="public-section-title"><i /><h2>{activeCategory || "Produtos"}</h2></div>
      <div className="public-product-grid" ref={productCarouselRef} onScroll={updateProductSlide}>
        {products.map((product) => <article className="public-product-card" key={product.id}>
          <div className="public-product-photo"><img src={productImage(product)} alt={product.name} onClick={() => openProductDetails(product)} />{product.tag && <span>{product.tag}</span>}<strong>{money(product.price)}</strong><button disabled={product.trackStock && Number(product.stock || 0) <= 0} onClick={() => requestAdd(product)} aria-label={`Adicionar ${product.name}`}><Plus /></button></div>
          <div className="public-product-copy" role="button" tabIndex={0} onClick={() => openProductDetails(product)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openProductDetails(product); }}><h3>{product.name}</h3><p>{product.description}</p>{product.trackStock && <small className={Number(product.stock || 0) <= 0 ? "out" : ""}>{Number(product.stock || 0) <= 0 ? "Esgotado" : "Disponível"}</small>}</div>
        </article>)}
      </div>
      {products.length > 1 && <div className="public-product-dots" aria-label="Navegação dos produtos">
        {products.map((product, index) => <button key={product.id} className={productSlide === index ? "active" : ""} onClick={() => goToProductSlide(index)} aria-label={`Ver ${product.name}`} />)}
      </div>}
      {!products.length && <div className="public-no-results"><Search /><p>Nenhum produto encontrado.</p></div>}
    </section>
    <nav className="public-bottom-nav"><button className="active"><Store />Cardápio</button><button onClick={() => setScreen("cart")}><ShoppingBag />Pedido{!!count && <b>{count}</b>}</button></nav>
    {!!count && <button className="public-floating-cart" onClick={() => setScreen("cart")}><span><ShoppingBag />{count} {count === 1 ? "item" : "itens"}</span><strong>VER PEDIDO · {money(subtotal)}</strong></button>}

    {detailProduct && <div className="public-product-detail-backdrop" onMouseDown={closeProductDetails}>
      <section className="public-product-detail" onMouseDown={(event) => event.stopPropagation()}>
        <header><button onClick={closeProductDetails} aria-label="Voltar ao cardápio"><ArrowLeft /></button><h2>{detailProduct.name}</h2></header>
        <div className="product-detail-scroll">
          <img className="product-detail-image" src={productImage(detailProduct)} alt={detailProduct.name} />
          <section className="product-detail-copy">
            <h1>{detailProduct.name}</h1>
            <strong>{money(detailProduct.price)}</strong>
            <p>{detailProduct.description || "Produto preparado especialmente para você."}</p>
            {detailProduct.tag && <span>{detailProduct.tag}</span>}
          </section>
          {(detailProduct.preparationPointEnabled ?? detailProduct.category === "Espetinhos") && <section className="product-detail-section">
            <h3>Como você prefere o preparo?</h3>
            <div className="product-detail-points">{preparationOptions.map((option) => <button key={option} className={detailPoint === option ? "active" : ""} onClick={() => setDetailPoint(option)}>{option}</button>)}</div>
          </section>}
          <section className="product-detail-section">
            <h3>Alguma observação?</h3>
            <textarea value={detailNote} onChange={(event) => setDetailNote(event.target.value)} placeholder="Ex.: sem cebola, ponto da carne..." />
          </section>
        </div>
        <footer>
          <div className="product-detail-stepper"><button onClick={() => setDetailQuantity((value) => Math.max(1, value - 1))}><Minus /></button><b>{detailQuantity}</b><button onClick={() => setDetailQuantity((value) => Math.min(detailProduct.trackStock ? Number(detailProduct.stock || 1) : 99, value + 1))}><Plus /></button></div>
          <button className="product-detail-add" disabled={(detailProduct.trackStock && Number(detailProduct.stock || 0) <= 0) || ((detailProduct.preparationPointEnabled ?? detailProduct.category === "Espetinhos") && !detailPoint)} onClick={addDetailedProduct}>Adicionar · {money(detailProduct.price * detailQuantity)}</button>
        </footer>
      </section>
    </div>}

    {pendingProduct && <div className="public-modal-backdrop" onMouseDown={() => setPendingProduct(null)}><section className="public-preparation-modal" onMouseDown={(event) => event.stopPropagation()}>
      <button className="close" onClick={() => setPendingProduct(null)}><X /></button>
      <span>PONTO DE PREPARO</span><h2>{pendingProduct.name}</h2><p>Como você prefere o preparo?</p>
      <div className="public-point-options">{preparationOptions.map((option) => <button key={option} className={point === option ? "active" : ""} onClick={() => setPoint(option)}>{option}</button>)}</div>
      <label>Observação (opcional)<textarea value={itemNote} onChange={(event) => setItemNote(event.target.value)} placeholder="Ex.: sem sal, sem farofa..." /></label>
      <button className="confirm" disabled={!point} onClick={confirmPreparation}>ADICIONAR AO PEDIDO</button>
    </section></div>}
  </main>;
}
