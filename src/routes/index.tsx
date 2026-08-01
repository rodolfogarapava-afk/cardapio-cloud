import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  
  BarChart3,
  Banknote,
  Check,
  CircleUserRound,
  Info,
  LayoutDashboard,
  Menu,
  MessageSquareHeart,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Store,
  Tags,
  Star,
  Utensils,
  Wine,
  X,
  ChevronDown,
  CreditCard,
  Printer,
  LogOut,
  Cloud,
  CloudOff,
  Trash2,
  MapPin,
  Phone,
  Truck,
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { sendOrderTicketToPrinter, sendOrderUpdateToPrinter, sendReceiptToPrinter, type OrderChange } from "@/lib/printReceipt";
import { queueCustomerReceipt, queueKitchenOrder, queueOrderUpdate } from "@/lib/printQueue";
import { generateReportPdf } from "@/lib/reportPdf";
import { initAudioContext, playNotificationSound } from "@/lib/sounds";
import { useTenantNavigation } from "@/components/SaaSPlatform";
import { useOperationsSync } from "@/lib/operationsSync";
import { useCatalogSync } from "@/lib/catalogSync";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/cliente" });
  },
  head: () => ({
    meta: [
      { title: "Burguer House — Cardápio digital" },
      { name: "description", content: "Cardápio digital da Burguer House com comandas, PDV, controle de estoque, caixa e relatórios." },
      { property: "og:title", content: "Burguer House — Cardápio digital" },
      { property: "og:description", content: "Cardápio digital da Burguer House com comandas, PDV, controle de estoque, caixa e relatórios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});


export type Product = {
  id: number;
  category: string;
  name: string;
  price: number;
  image: string;
  description: string;
  tag?: string;
  stock?: number;
  minStock?: number;
  trackStock?: boolean;
  preparationPointEnabled?: boolean;
};

const usesPreparationPoint=(product:Product)=>
  product.preparationPointEnabled ?? product.category==="Espetinhos";

const stockFallbackImages:Record<string,string>={
  Espetinhos:"https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=600&q=82",
  Acompanhamentos:"https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=82",
  Bebidas:"https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=82",
};
const FALLBACK_IMG="data:image/svg+xml;utf8,"+encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><rect width='120' height='120' fill='%231a1a1a'/><text x='60' y='66' font-family='Arial' font-size='42' text-anchor='middle' fill='%23f5c518'>🍢</text></svg>`);

const ProductImage=memo(function ProductImage({product,className="",priority=false}:{product:Product;className?:string;priority?:boolean}){
  const fallback=stockFallbackImages[product.category]||FALLBACK_IMG;
  const src=product.image?.trim()||fallback;
  return <img className={className} src={src} alt={product.name} loading={priority?"eager":"lazy"} decoding="async" fetchPriority={priority?"high":"low"} width={600} height={600} onError={(event)=>{const image=event.currentTarget;if(image.src!==FALLBACK_IMG)image.src=FALLBACK_IMG}}/>;
});

const initialProducts: Product[] = [
  { id: 9,  category: "Espetinhos", name: "Carne",             price: 10, image: "/products/generated/espeto-carne.webp",        description: "Espetinho de carne preparado na brasa e servido no ponto escolhido.", stock: 30, minStock: 8, trackStock: true },
  { id: 12, category: "Espetinhos", name: "Linguiça",          price: 10, image: "/products/generated/espeto-linguica.webp",     description: "Espetinho de linguiça assada na brasa, dourada e suculenta.",         stock: 30, minStock: 8, trackStock: true },
  { id: 11, category: "Espetinhos", name: "Frango com Bacon",  price: 12, image: "/products/generated/espeto-frango-bacon.webp", description: "Cubos de frango com bacon, grelhados até ficarem dourados e suculentos.", stock: 30, minStock: 8, trackStock: true },
  { id: 10, category: "Espetinhos", name: "Carne com Bacon",   price: 14, tag: "DESTAQUE", image: "/products/generated/espeto-carne-bacon.webp", description: "Espetinho de carne intercalada com bacon, assado na brasa.",       stock: 30, minStock: 8, trackStock: true },

  { id: 20, category: "Acompanhamentos", name: "Farofa",       price: 3, image: "", description: "Farofa crocante da casa.",           stock: 40, minStock: 10, trackStock: true },
  { id: 21, category: "Acompanhamentos", name: "Molho Verde",  price: 3, image: "", description: "Molho verde fresco da casa.",        stock: 40, minStock: 10, trackStock: true },
  { id: 22, category: "Acompanhamentos", name: "Vinagrete",    price: 5, image: "", description: "Vinagrete tradicional bem temperado.", stock: 40, minStock: 10, trackStock: true },
  { id: 23, category: "Acompanhamentos", name: "Arroz",        price: 5, image: "", description: "Porção de arroz soltinho.",           stock: 40, minStock: 10, trackStock: true },

  { id: 14, category: "Bebidas", name: "Água s/ Gás",     price: 3,  image: "/products/generated/agua-sem-gas.webp",  description: "Água mineral sem gás, gelada.",                stock: 30, minStock: 8, trackStock: true },
  { id: 13, category: "Bebidas", name: "Água c/ Gás",     price: 4,  image: "/products/generated/agua-com-gas.webp",  description: "Água mineral com gás, gelada.",                stock: 30, minStock: 8, trackStock: true },
  { id: 18, category: "Bebidas", name: "Fanta Lata",      price: 6,  image: "/products/generated/fanta-lata.webp",    description: "Refrigerante Fanta em lata, servido gelado.",  stock: 30, minStock: 8, trackStock: true },
  { id: 19, category: "Bebidas", name: "Guaraná Lata",    price: 6,  image: "/products/generated/guarana-lata.webp",  description: "Refrigerante Guaraná em lata, servido gelado.",stock: 30, minStock: 8, trackStock: true },
  { id: 17, category: "Bebidas", name: "Coca Cola Lata",  price: 6,  image: "/products/generated/coca-cola-lata.webp",description: "Refrigerante Coca-Cola em lata, servido gelado.",stock: 30, minStock: 8, trackStock: true },
  { id: 16, category: "Bebidas", name: "Coca Cola 1L",    price: 10, image: "/products/generated/coca-cola-1l.webp",  description: "Refrigerante Coca-Cola 1 litro, servido gelado.",stock: 20, minStock: 5, trackStock: true },
  { id: 15, category: "Bebidas", name: "Coca Cola 1,5L",  price: 12, image: "/products/generated/coca-cola-15l.webp", description: "Refrigerante Coca-Cola 1,5 litro, servido gelado.",stock: 20, minStock: 5, trackStock: true },
];

const nav = [
  { label: "Espetinhos", icon: Utensils },
  { label: "Acompanhamentos", icon: ShoppingBag },
  { label: "Bebidas", icon: Wine },
];

export function RestaurantApp({ publicMenu = false, publicCatalog }: {
  publicMenu?: boolean;
  publicCatalog?: { tenantId: string; tenantName: string; products: Product[]; categories: string[] };
}) {
  const tenantNavigation = useTenantNavigation();
  const effectiveTenantId = publicCatalog?.tenantId || tenantNavigation?.tenantId;
  const effectiveTenantName = publicCatalog?.tenantName || tenantNavigation?.tenantName;
  const isOriginalStore = !effectiveTenantName || effectiveTenantName.trim().toLowerCase() === "deus proveu espetinhos";
  const tenantStoragePrefix = isOriginalStore ? "burguer-house" : `cardapio-cloud-${effectiveTenantId}`;
  const tenantInitialProducts = publicCatalog?.products || (isOriginalStore ? initialProducts : []);
  const tenantInitialCategories = publicCatalog?.categories || (isOriginalStore ? nav.map((item) => item.label) : []);
  const tenantBrand = useMemo(() => {
    const words = (effectiveTenantName || "Deus Proveu Espetinhos").trim().split(/\s+/);
    if (words.length === 1) return { main: words[0], detail: "CARDÁPIO DIGITAL" };
    return { main: words.slice(0, -1).join(" "), detail: words.at(-1) || "CARDÁPIO DIGITAL" };
  }, [effectiveTenantName]);
  const [products, setProducts] = useState<Product[]>(tenantInitialProducts);
  const [categories, setCategories] = useState<string[]>(tenantInitialCategories);
  const [activeMain, setActiveMain] = useState(tenantInitialCategories[0] || "");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [modal, setModal] = useState<"review" | "cart" | "about" | "commands" | "payment" | "doneness" | null>(null);
  const [visibleCommandCount, setVisibleCommandCount] = useState(5);
  const [pendingMeatId, setPendingMeatId] = useState<number | null>(null);
  const [doneness, setDoneness] = useState("");
  const [meatNote, setMeatNote] = useState("");
  const [cartDetails, setCartDetails] = useState<Record<number, { doneness: string; note: string }>>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [compactMenu, setCompactMenu] = useState(true);
  const [stars, setStars] = useState(0);
  const [sent, setSent] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [waiterName, setWaiterName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [cashReceived, setCashReceived] = useState("");
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [paymentItems, setPaymentItems] = useState<{name:string;qty:number;price:number;detail?:string}[]>([]);
  const [paymentCommandId, setPaymentCommandId] = useState<number | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentCommandBackup, setPaymentCommandBackup] = useState<IntegratedCommand|null>(null);
  const [systemView, setSystemView] = useState<"products" | "stock" | "commands" | "cash" | "reports" | null>(null);
  const [savedCommands, setSavedCommands] = useState<IntegratedCommand[]>([]);
  const [salesHistory, setSalesHistory] = useState<{id:number;name:string;total:number;method:string;createdAt:number;items:{name:string;qty:number;price:number;detail?:string}[]}[]>([]);
  const [expenses, setExpenses] = useState<{id:number;description:string;amount:number;createdAt:number}[]>([]);
  const [printStatuses, setPrintStatuses] = useState<Record<number,"sending"|"pending"|"processing"|"printed"|"failed">>({});
  const [storageReady, setStorageReady] = useState(false);
  const knownCommandIds = useRef<Set<number>>(new Set());
  const commandNotificationsReady = useRef(false);

  useEffect(() => {
    if (publicCatalog) return;
    setWaiterName(window.localStorage.getItem(`${tenantStoragePrefix}-waiter-name`) || "");
    setCompactMenu(window.localStorage.getItem(`${tenantStoragePrefix}-menu-layout`) !== "large");
  }, [publicCatalog, tenantStoragePrefix]);

  useEffect(() => {
    initAudioContext();
    if(publicCatalog){setStorageReady(true);return}
    const saved = window.localStorage.getItem(`${tenantStoragePrefix}-products`);
    if (saved) {
      try { setProducts(JSON.parse(saved)); } catch {}
      const savedCategories = window.localStorage.getItem(`${tenantStoragePrefix}-categories`);
      if (savedCategories) { try { const parsed=JSON.parse(savedCategories);setCategories(parsed);setActiveMain(parsed[0]||""); } catch {} }
    }
    try {
      const commands=window.localStorage.getItem(`${tenantStoragePrefix}-commands`);
      const sales=window.localStorage.getItem(`${tenantStoragePrefix}-sales`);
      const savedExpenses=window.localStorage.getItem(`${tenantStoragePrefix}-expenses`);
      if(commands)setSavedCommands(mergeOpenCommands(JSON.parse(commands)));
      if(sales)setSalesHistory(JSON.parse(sales));
      if(savedExpenses)setExpenses(JSON.parse(savedExpenses));
    } catch {}
    setStorageReady(true);
  }, [publicCatalog,tenantStoragePrefix]);
  useCatalogSync({
    tenantId: publicCatalog ? null : tenantNavigation?.tenantId,
    products,
    categories,
    setProducts,
    setCategories,
    ready: storageReady && !publicCatalog,
    legacyStoragePrefix: tenantStoragePrefix,
  });
  const operationsSync = useOperationsSync({
    tenantId: publicCatalog ? null : tenantNavigation?.tenantId,
    commands: savedCommands,
    sales: salesHistory,
    expenses,
    setCommands: setSavedCommands,
    setSales: setSalesHistory,
    setExpenses,
    localReady: storageReady && !publicCatalog,
    legacyStoragePrefix: tenantStoragePrefix,
  });
  useEffect(()=>{
    if(!supabase||!tenantNavigation?.tenantId||!savedCommands.length)return;
    let active=true;
    const refresh=async()=>{
      const {data,error}=await supabase.from("print_jobs")
        .select("command_id,status,created_at")
        .eq("tenant_id",tenantNavigation.tenantId)
        .in("command_id",savedCommands.map((command)=>command.id))
        .order("created_at",{ascending:true});
      if(error||!active)return;
      setPrintStatuses((current)=>{
        const next={...current};
        for(const job of data||[])next[Number(job.command_id)]=job.status as "pending"|"processing"|"printed"|"failed";
        return next;
      });
    };
    refresh();
    const timer=window.setInterval(refresh,2000);
    return()=>{active=false;window.clearInterval(timer)};
  },[tenantNavigation?.tenantId,savedCommands]);
  useEffect(() => {
    if (!categories.length) {
      setActiveMain("");
    } else if (!categories.includes(activeMain)) {
      setActiveMain(categories[0]);
    }
  }, [categories, activeMain]);
  useEffect(()=>{
    if(!storageReady)return;
    const merged=mergeOpenCommands(savedCommands);
    if(JSON.stringify(merged)!==JSON.stringify(savedCommands))setSavedCommands(merged);
  },[savedCommands,storageReady]);
  useEffect(()=>{
    if(modal==="commands")setVisibleCommandCount(5);
  },[modal]);
  useEffect(()=>{
    if(!storageReady)return;
    const currentIds=new Set(savedCommands.map((command)=>command.id));
    if(!commandNotificationsReady.current){
      knownCommandIds.current=currentIds;
      commandNotificationsReady.current=true;
      return;
    }
    const incoming=savedCommands.filter((command)=>!knownCommandIds.current.has(command.id));
    knownCommandIds.current=currentIds;
    if(!incoming.length)return;
    playNotificationSound("alert");
    if(document.visibilityState!=="visible"&&"Notification" in window&&Notification.permission==="granted"){
      const newest=incoming.at(-1)!;
      new Notification("Nova comanda recebida",{body:`${newest.name} · ${newest.count} ${newest.count===1?"item":"itens"}`});
    }
  },[savedCommands,storageReady]);
  const persistProducts = (next: Product[]) => {
    setProducts(next);
  };
  const adjustStock = (deltas: { name: string; qty: number }[]) => {
    setProducts((prev) => {
      const next = prev.map((p) => {
        if (!p.trackStock) return p;
        const delta = deltas.filter((d) => d.name === p.name).reduce((sum, d) => sum + d.qty, 0);
        if (!delta) return p;
        return { ...p, stock: Math.max(0, Number(p.stock || 0) + delta) };
      });
      return next;
    });
  };
  const persistCategories = (next: string[]) => {
    setCategories(next);
  };
  const renameCategory = (oldName:string,newName:string) => {
    const clean=newName.trim();
    if(!clean||categories.some((name)=>name.toLowerCase()===clean.toLowerCase()&&name!==oldName))return;
    persistCategories(categories.map((name)=>name===oldName?clean:name));
    persistProducts(products.map((product)=>product.category===oldName?{...product,category:clean}:product));
    if(activeMain===oldName)setActiveMain(clean);
  };

  const count = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const total = Object.entries(cart).reduce((sum, [id, qty]) => {
    const product = products.find((item) => item.id === Number(id));
    return sum + (product?.price ?? 0) * qty;
  }, 0);
  const filtered = useMemo(
    () =>
      products.filter(
        (product) =>
          product.category === activeMain &&
          product.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, activeMain, products],
  );
  const currentCartItems = Object.entries(cart).flatMap(([id, qty]) => {
    const product = products.find((item) => item.id === Number(id));
    if(!product)return [];
    const detail = cartDetails[Number(id)];
    return [{
      name: product.name,
      qty,
      price: product.price,
      detail: detail ? [detail.doneness && `Ponto: ${detail.doneness}`, detail.note && `Obs.: ${detail.note}`].filter(Boolean).join(" · ") : "",
    }];
  });
  const sectionCopy: Record<string, { title: string; description: string }> = {
    Espetinhos: {
      title: "Espetinhos",
      description: "Preparados na brasa e servidos no ponto escolhido. Acompanham farofa e mandioca.",
    },
    Acompanhamentos: {
      title: "Acompanhamentos",
      description: "Porções para incrementar o seu pedido.",
    },
    Bebidas: {
      title: "Bebidas",
      description: "Bebidas geladas para acompanhar seu pedido.",
    },
  };
  const cashAmount=Number(cashReceived.replace(",","."));
  const cashPaymentValid=paymentMethod!=="Dinheiro"||(Number.isFinite(cashAmount)&&cashAmount>=paymentTotal);
  const cancelPayment=()=>{
    if(paymentCommandBackup)setSavedCommands((all)=>all.some((command)=>command.id===paymentCommandBackup.id)?mergeOpenCommands(all):mergeOpenCommands([...all,paymentCommandBackup]));
    setPaymentCommandId(null);
    setPaymentCommandBackup(null);
    setCashReceived("");
    setModal(null);
  };

  const add = (id: number) => {
    const product=products.find((item)=>item.id===id);
    if(product?.trackStock&&Number(product.stock||0)<=0)return;
    if(product&&usesPreparationPoint(product)&&!cart[id]){
      setPendingMeatId(id);
      setDoneness("");
      setMeatNote("");
      setModal("doneness");
      return;
    }
    setCart((current) => ({ ...current, [id]: (current[id] || 0) + 1 }));
  };
  const change = (id: number, amount: number) =>
    setCart((current) => {
      const product=products.find((item)=>item.id===id);
      const limit=product?.trackStock?Number(product.stock||0):Number.POSITIVE_INFINITY;
      const next = Math.min(limit,Math.max(0, (current[id] || 0) + amount));
      const updated = { ...current, [id]: next };
      if (!next) {
        delete updated[id];
        setCartDetails((details)=>{const copy={...details};delete copy[id];return copy});
      }
      return updated;
    });

  return (
    <main className={`app-shell${publicMenu ? " public-menu-shell" : ""}`}>
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
          <Menu size={22} />
        </button>
        <div className="brand" aria-label={effectiveTenantName || "Deus Proveu Espetinhos"}>
          <span className="brand-mark"><Utensils size={24} /></span>
          <span><b>{tenantBrand.main.toUpperCase()}</b><small>{tenantBrand.detail.toUpperCase()}</small></span>
        </div>
        {(!tenantNavigation||tenantNavigation.page==="operation"&&systemView===null)&&<div className={`search-box ${searchOpen ? "open" : ""}`}>
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no cardápio"
            aria-label="Buscar no cardápio"
          />
        </div>}
        <nav className="top-actions">
          {(!tenantNavigation||tenantNavigation.page==="operation"&&systemView===null)&&<button className="plain search-trigger" onClick={() => setSearchOpen(!searchOpen)}>
            <Search size={19} /> <span>BUSCAR</span>
          </button>}
          {!publicMenu && <button className="plain commands-trigger" onClick={() => setModal("commands")}>
            <ShoppingBag size={18} /><span>COMANDAS</span>
            {!!savedCommands.length && <b className="command-count">{savedCommands.length}</b>}
          </button>}
          <button className="action cart-button" onClick={() => setModal("cart")}>
            <ShoppingBag size={19} />
            <span>CARRINHO<br />DE COMPRAS</span>
            <b className="cart-badge">{count}</b>
          </button>
        </nav>
      </header>

      <div className={`workspace${publicMenu ? " public-menu-workspace" : ""}`}>
        {!publicMenu && menuOpen && <button className="sidebar-backdrop" onClick={() => setMenuOpen(false)} aria-label="Fechar menu e voltar para a tela atual" />}
        {!publicMenu && <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
          <button className="close-menu" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X /></button>
          <div className="nav-list">
            <button
              className={tenantNavigation?.page !== "operation" ? "" : systemView === null ? "active" : ""}
              onClick={() => {
                tenantNavigation?.setPage("operation");
                setSystemView(null);
                setQuery("");
                setSearchOpen(false);
                setMenuOpen(false);
              }}
            >
              <Utensils size={25} strokeWidth={1.7} /><span>Cardápio</span>
            </button>
            <button className={systemView === "commands" ? "active system-nav" : "system-nav"} onClick={() => { tenantNavigation?.setPage("operation"); setSystemView("commands"); setMenuOpen(false); }}>
              <ShoppingBag size={24} /><span>Comandas</span>
            </button>
            <button className={systemView === "products" ? "active system-nav" : "system-nav"} onClick={() => { tenantNavigation?.setPage("operation"); setSystemView("products"); setMenuOpen(false); }}>
              <Tags size={24} /><span>Produtos</span>
            </button>
            <button className={systemView === "stock" ? "active system-nav" : "system-nav"} onClick={() => { tenantNavigation?.setPage("operation"); setSystemView("stock"); setMenuOpen(false); }}>
              <Store size={24} /><span>Estoque</span>
            </button>
            <button className={systemView === "cash" ? "active system-nav" : "system-nav"} onClick={() => { tenantNavigation?.setPage("operation"); setSystemView("cash"); setMenuOpen(false); }}>
              <Banknote size={24} /><span>Caixa</span>
            </button>
            <button className={systemView === "reports" ? "active system-nav" : "system-nav"} onClick={() => { tenantNavigation?.setPage("operation"); setSystemView("reports"); setMenuOpen(false); }}>
              <BarChart3 size={24} /><span>Relatórios</span>
            </button>
            {tenantNavigation && <>
              <div className="platform-nav-divider" />
              <button className={tenantNavigation.page === "billing" ? "active system-nav platform-nav" : "system-nav platform-nav"} onClick={() => { tenantNavigation.setPage("billing"); setSystemView(null); setMenuOpen(false); }}>
                <CreditCard size={24} /><span>Assinatura</span>
              </button>
              <button className={tenantNavigation.page === "printing" ? "active system-nav platform-nav" : "system-nav platform-nav"} onClick={() => { tenantNavigation.setPage("printing"); setSystemView(null); setMenuOpen(false); }}>
                <Printer size={24} /><span>Impressão</span>
              </button>
              <button className="system-nav platform-nav" onClick={tenantNavigation.onExit}>
                <LogOut size={24} /><span>Sair</span>
              </button>
            </>}
          </div>
          <div className="side-bottom">
            <button className="about" onClick={() => { setModal("about"); setMenuOpen(false); }}><Info size={17} /> Sobre</button>
          </div>
        </aside>}

        <section className={`content${!publicMenu && systemView === null && (!tenantNavigation || tenantNavigation.page === "operation") ? ` client-menu-content${compactMenu ? " compact-menu" : ""}` : ""}`}>
          {tenantNavigation && tenantNavigation.page !== "operation" ? tenantNavigation.content :
          systemView === "products" ? <IntegratedProducts tenantId={tenantNavigation?.tenantId} products={products} categories={categories} onChange={persistProducts} onAddCategory={(name)=>persistCategories([...categories,name])} onRenameCategory={renameCategory} onDeleteCategory={(name)=>{const next=categories.filter((c)=>c!==name);persistCategories(next);if(activeMain===name)setActiveMain(next[0]||"")}} /> :
          systemView === "stock" ? <IntegratedStock products={products} onChange={persistProducts} /> :
          systemView === "commands" ? <IntegratedCommands tenantId={tenantNavigation?.tenantId} commands={savedCommands} setCommands={setSavedCommands} products={products} adjustStock={adjustStock} printStatuses={printStatuses} onCharge={(command) => { setCustomerName(command.name); setPaymentTotal(command.total); setPaymentItems(command.items); setPaymentMethod(deliveryPaymentLabel(command.delivery?.payment)); setPaymentCommandId(command.id); setPaymentCommandBackup(command); setPaymentError(""); setModal("payment"); }} /> :
          systemView === "cash" ? <IntegratedCash sales={salesHistory} expenses={expenses} sync={operationsSync} onAddExpense={(description,amount) => setExpenses((all)=>[...all,{id:Date.now(),description,amount,createdAt:Date.now()}])} onDeleteExpense={(id)=>setExpenses((all)=>all.filter(expense=>expense.id!==id))} /> :
          systemView === "reports" ? <IntegratedReports sales={salesHistory} expenses={expenses} commands={savedCommands} sync={operationsSync} /> : <>
          {!categories.length && <div className="integrated-empty new-store-empty"><Store/><h3>{publicMenu ? "Cardápio em preparação" : "Seu cardápio está vazio"}</h3><p>{publicMenu ? "Esta loja ainda não publicou produtos." : "Esta é uma loja nova. Cadastre a primeira categoria e os produtos para começar."}</p>{!publicMenu && <button className="primary" onClick={()=>setSystemView("products")}>CADASTRAR PRODUTOS</button>}</div>}
          {!publicMenu && !!categories.length && <div className="client-menu-toolbar">
            <label className="client-menu-search"><Search size={17}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Buscar no cardápio..." aria-label="Buscar no cardápio" /></label>
            <div className="menu-layout-control">
              <span><b>Imagens grandes</b><small>Alterne o formato dos produtos</small></span>
              <button
                type="button"
                role="switch"
                aria-checked={!compactMenu}
                className="menu-layout-switch"
                onClick={()=>setCompactMenu((current)=>{const next=!current;window.localStorage.setItem(`${tenantStoragePrefix}-menu-layout`,next?"compact":"large");return next})}
                aria-label="Alternar entre cards compactos e imagens grandes"
              ><span /></button>
            </div>
          </div>}
          <div className="category-strip menu-category-strip" aria-label="Categorias do cardápio">
            {categories.map((category) => (
              <button
                key={category}
                className={activeMain === category ? "active" : ""}
                onClick={() => {
                  setActiveMain(category);
                  setQuery("");
                }}
              >
                {category}
              </button>
            ))}
          </div>

          {!!categories.length && <div className="intro">
            <p className="eyebrow">CARDÁPIO · {activeMain.toUpperCase()}</p>
            <h1>{sectionCopy[activeMain]?.title || activeMain}</h1>
            <p>{sectionCopy[activeMain]?.description || `Produtos selecionados da categoria ${activeMain}.`}</p>
          </div>}

          <div className="product-list">
            {filtered.map((product, idx) => (
              <article className="product-card" key={product.id}>
                <div className="photo">
                  {product.tag && <span className="new-badge">{product.tag}</span>}
                  <ProductImage product={product} priority={idx<4} />
                </div>
                <div className="product-info">
                  <div>
                    <h2>{product.name}</h2>
                    {product.trackStock && <span className={`stock-badge ${(product.stock||0)<=0?"out":(product.stock||0)<=(product.minStock||0)?"low":""}`}>{(product.stock||0)<=0?"ESGOTADO":`${product.stock||0} EM ESTOQUE`}</span>}
                    <p>{product.description}</p>
                    <small>{product.category === "Vinhos" ? "*Venda proibida para menores de 18 anos" : "*Consulte nossa equipe sobre alergênicos"}</small>
                  </div>
                  <div className="buy">
                    <div className="price"><span>A partir de</span><strong>R$ {product.price.toFixed(2).replace(".", ",")}</strong></div>
                    {cart[product.id] ? (
                      <div className="stepper">
                        <button onClick={() => change(product.id, -1)} aria-label="Remover um"><Minus /></button>
                        <b>{cart[product.id]}</b>
                        <button onClick={() => change(product.id, 1)} aria-label="Adicionar mais um"><Plus /></button>
                      </div>
                    ) : (
                      <button className="add-button" disabled={product.trackStock&&Number(product.stock||0)<=0} onClick={() => add(product.id)}>
                        <Plus size={17} /> {product.trackStock&&Number(product.stock||0)<=0?"PRODUTO ESGOTADO":"ADICIONAR AO CARRINHO"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {!!categories.length && !filtered.length && <p className="empty">Nenhum item encontrado para “{query}”.</p>}
          </div>
          </>}
        </section>
      </div>

      {count > 0 && (
        <button className="floating-cart" onClick={() => setModal("cart")}>
          <span><ShoppingBag size={18} /> {count} {count === 1 ? "item" : "itens"}</span>
          <strong>Ver pedido · R$ {total.toFixed(2).replace(".", ",")}</strong>
        </button>
      )}

      {modal && (
        <div className="modal-backdrop" onMouseDown={() => { if(modal==="payment")cancelPayment();else setModal(null); }}>
          <section className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { if(modal==="payment")cancelPayment();else setModal(null); }} aria-label="Fechar"><X /></button>
            {modal === "review" && (
              sent ? <Success title="Avaliação enviada!" text="Obrigado por compartilhar sua experiência com a gente." /> :
              <>
                <span className="modal-icon"><MessageSquareHeart /></span>
                <h3>Como foi sua experiência?</h3>
                <p>Sua opinião ajuda a gente a ficar ainda melhor.</p>
                <div className="stars">
                  {[1,2,3,4,5].map((n) => <button key={n} onClick={() => setStars(n)} aria-label={`${n} estrelas`}><Star fill={n <= stars ? "currentColor" : "none"} /></button>)}
                </div>
                <textarea placeholder="Conte mais pra gente (opcional)" />
                <button className="primary" disabled={!stars} onClick={() => { playNotificationSound("success"); setSent(true); }}>ENVIAR AVALIAÇÃO</button>
              </>
            )}
            {modal === "doneness" && pendingMeatId !== null && (
              <>
                <span className="modal-icon"><Utensils /></span>
                <h3>Ponto de preparo</h3>
                <p><b>{products.find((product)=>product.id===pendingMeatId)?.name}</b> — escolha como deseja o preparo.</p>
                <div className="doneness-options">
                  {["Mal passada","Ao ponto","Bem passada"].map((point)=>(
                    <button key={point} className={doneness===point?"active":""} onClick={()=>setDoneness(point)}>{point}</button>
                  ))}
                </div>
                <label className="meat-note">Observação (opcional)
                  <textarea value={meatNote} onChange={(event)=>setMeatNote(event.target.value)} placeholder="Ex.: sem sal, sem farofa..." />
                </label>
                <div className="doneness-actions">
                  <button className="secondary" onClick={()=>setDoneness("Sem ponto")}>SEM PONTO</button>
                  <button className="primary" disabled={!doneness} onClick={()=>{
                    setCart((current)=>({...current,[pendingMeatId]:(current[pendingMeatId]||0)+1}));
                    setCartDetails((current)=>({...current,[pendingMeatId]:{doneness,note:meatNote.trim()}}));
                    setPendingMeatId(null);
                    setModal(null);
                  }}>ADICIONAR</button>
                </div>
              </>
            )}
            {modal === "cart" && (
              <>
                <span className="modal-icon"><ShoppingBag /></span>
                <h3>Seu pedido</h3>
                {!count ? <p>Seu carrinho está vazio. Que tal escolher um smash?</p> :
                  <>
                    <div className="cart-lines">
                      {Object.entries(cart).map(([id, qty]) => {
                        const product = products.find((item) => item.id === Number(id))!;
                        return <div className="cart-line" key={id}>
                          <div><b>{qty}×</b><span>{product.name}{cartDetails[Number(id)] && <small>{[cartDetails[Number(id)].doneness && `Ponto: ${cartDetails[Number(id)].doneness}`,cartDetails[Number(id)].note && `Obs.: ${cartDetails[Number(id)].note}`].filter(Boolean).join(" · ")}</small>}</span></div>
                          <strong>R$ {(product.price * qty).toFixed(2).replace(".", ",")}</strong>
                        </div>;
                      })}
                    </div>
                    <label className="customer-field">Mesa ou cliente
                      <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ex.: Mesa 35" />
                    </label>
                    <label className="customer-field">Garçom responsável
                      <input value={waiterName} onChange={(e) => {
                        const value=e.target.value;
                        setWaiterName(value);
                        window.localStorage.setItem(`${tenantStoragePrefix}-waiter-name`,value);
                      }} placeholder="Nome do garçom" autoComplete="name" />
                    </label>
                    <div className="cart-total"><span>Total</span><strong>R$ {total.toFixed(2).replace(".", ",")}</strong></div>
                    <div className="cart-actions save-command-actions">
                      <button className="primary" disabled={!customerName.trim()||!waiterName.trim()} onClick={() => {
                        const name=customerName.trim();
                        const waiter=waiterName.trim();
                        const newItems=currentCartItems.map((item)=>({...item,delivered:false}));
                        const createdAt=Date.now();
                        const randomPart=crypto.getRandomValues(new Uint16Array(1))[0]%1000;
                        const commandId=createdAt*1000+randomPart;
                        setPrintStatuses((current)=>({...current,[commandId]:"sending"}));
                        setSavedCommands((current)=>mergeOpenCommands([...current,{id:commandId,name,tableLabel:name,waiterName:waiter,source:"waiter",count,total,createdAt,items:newItems}]));
                        adjustStock(newItems.map((item)=>({name:item.name,qty:-item.qty})));
                        if(tenantNavigation?.tenantId)queueKitchenOrder({
                          tenantId:tenantNavigation.tenantId,
                          commandId,
                          customer:name,
                          waiter,
                          items:newItems.map((item)=>({name:item.name,qty:item.qty,unitPrice:item.price,total:item.price*item.qty,notes:item.detail})),
                          total,
                        }).then(()=>setPrintStatuses((current)=>({...current,[commandId]:"pending"})))
                          .catch((error)=>{
                            setPrintStatuses((current)=>({...current,[commandId]:"failed"}));
                            console.error("Comanda salva, mas não foi possível entrar na fila de impressão:",error);
                          });
                        playNotificationSound("sale");
                        setCart({}); setCartDetails({}); setCustomerName(""); setModal("commands");
                      }}>SALVAR COMANDA</button>
                    </div>
                  </>
                }
              </>
            )}
            {modal === "commands" && (
              <>
                <span className="modal-icon"><ShoppingBag /></span>
                <h3>Comandas abertas</h3>
                {!savedCommands.length ? <p>Nenhuma comanda aberta no momento.</p> :
                  <div className="saved-commands">{[...savedCommands].sort((a,b)=>b.createdAt-a.createdAt).slice(0,visibleCommandCount).map((command) => <div key={command.id}>
                    <div><b>{command.name}</b><small>{command.count} {command.count === 1 ? "item" : "itens"}</small>
                      <span className={`command-print-status ${printStatuses[command.id]||"checking"}`}>{
                        printStatuses[command.id]==="printed"?"✓ IMPRESSA COM SUCESSO":
                        printStatuses[command.id]==="failed"?"! FALHA AO IMPRIMIR":
                        printStatuses[command.id]==="processing"?"IMPRIMINDO...":
                        printStatuses[command.id]==="sending"?"ENVIANDO...":
                        printStatuses[command.id]==="pending"?"AGUARDANDO IMPRESSORA":"VERIFICANDO IMPRESSÃO..."
                      }</span>
                      {command.waiterName&&<small>Garçom: {command.waiterName}</small>}
                    </div>
                    <strong>R$ {command.total.toFixed(2).replace(".", ",")}</strong>
                    <button onClick={() => {
                      setCustomerName(command.name);
                      setPaymentTotal(command.total);
                      setPaymentItems(command.items);
                      setPaymentMethod(deliveryPaymentLabel(command.delivery?.payment));
                      setPaymentCommandId(command.id);
                      setPaymentCommandBackup(command);
                      setModal("payment");
                    }}>COBRAR</button>
                    {printStatuses[command.id]==="failed"&&tenantNavigation?.tenantId&&<button onClick={()=>{
                      setPrintStatuses((current)=>({...current,[command.id]:"sending"}));
                      queueKitchenOrder({
                        tenantId:tenantNavigation.tenantId!,commandId:command.id,
                        customer:command.tableLabel||command.name,waiter:command.waiterName,
                        items:toReceiptItems(command.items),total:command.total,kind:`retry_${Date.now()}`,
                      }).then(()=>setPrintStatuses((current)=>({...current,[command.id]:"pending"})))
                        .catch(()=>setPrintStatuses((current)=>({...current,[command.id]:"failed"})));
                    }}>TENTAR NOVAMENTE</button>}
                  </div>)}
                  {savedCommands.length>visibleCommandCount&&<button className="commands-load-more" onClick={()=>setVisibleCommandCount((count)=>count+5)}>VER MAIS <ChevronDown size={14}/></button>}
                  </div>
                }
              </>
            )}
            {modal === "payment" && (
              <>
                <span className="modal-icon"><Banknote /></span>
                <h3>Finalizar {customerName}</h3>
                <div className="checkout-total">R$ {paymentTotal.toFixed(2).replace(".", ",")}</div>
                <div className="payment-methods">{["PIX","Dinheiro","Cartão Débito","Cartão Crédito"].map((method) =>
                  <button key={method} className={paymentMethod === method ? "active" : ""} onClick={() => {setPaymentMethod(method);setPaymentError("")}}>{method}</button>)}
                </div>
                {paymentMethod === "Dinheiro" && <>
                  <input className="cash-input" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} inputMode="decimal" placeholder="Valor recebido" />
                  {!!cashReceived && <p className="change">{Number.isFinite(cashAmount) ? cashAmount >= paymentTotal ? `Troco: R$ ${(cashAmount-paymentTotal).toFixed(2).replace(".", ",")}` : `Faltam R$ ${(paymentTotal-cashAmount).toFixed(2).replace(".", ",")}` : "Informe um valor válido"}</p>}
                </>}
                {paymentError&&<p className="form-error">{paymentError}</p>}
                <button className="primary" disabled={!cashPaymentValid||paymentProcessing} onClick={async() => {
                  setPaymentProcessing(true);setPaymentError("");
                  if(paymentCommandId!==null&&supabase){
                    const {data,error}=await supabase.rpc("finalize_restaurant_command",{p_command_id:paymentCommandId,p_payment_method:paymentMethod});
                    if(error||!data){
                      setPaymentError(error?.message||"Não foi possível finalizar esta comanda.");
                      setPaymentProcessing(false);
                      return;
                    }
                  }
                  const sale={id:paymentCommandId??Date.now(),name:customerName,total:paymentTotal,method:paymentMethod,createdAt:Date.now(),items:paymentItems};
                  setSalesHistory((all)=>[...all.filter((item)=>item.id!==sale.id),sale]);
                  if(paymentCommandId!==null)setSavedCommands((all)=>all.filter((command)=>command.id!==paymentCommandId));
                  if(tenantNavigation?.tenantId)queueCustomerReceipt({
                    tenantId:tenantNavigation.tenantId,
                    saleId:sale.id,
                    customer:sale.name,
                    items:toReceiptItems(sale.items),
                    total:sale.total,
                    paymentMethod:sale.method,
                  }).catch((error)=>console.error("Pagamento confirmado, mas o comprovante não entrou na fila de impressão:",error));
                  else printCustomerReceipt(sale);
                  playNotificationSound("success"); setCart({}); setCartDetails({}); setCashReceived(""); setPaymentCommandId(null); setPaymentCommandBackup(null); setSent(true); setModal(null);setPaymentProcessing(false);
                }}>{paymentProcessing?"FINALIZANDO...":"CONFIRMAR PAGAMENTO E IMPRIMIR"}</button>
              </>
            )}
            {modal === "about" && (
              <>
                <span className="modal-icon"><Info /></span>
                <h3>Sobre a Burguer House</h3>
                <p>Smash burgers feitos na hora, ingredientes selecionados e um atendimento pensado para você aproveitar cada mordida.</p>
                <button className="primary" onClick={() => setModal(null)}>VOLTAR AO CARDÁPIO</button>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function Home() {
  return <RestaurantApp />;
}

function Success({ title, text }: { title: string; text: string }) {
  return <div className="success">
    <span className="modal-icon success-icon"><Check /></span>
    <h3>{title}</h3><p>{text}</p>
  </div>;
}

type OrderItem = { product: Product; qty: number; note: string; point?: string; delivered?: boolean };
type TabName = "Dashboard" | "PDV" | "Comandas" | "Caixa" | "Produtos" | "Relatórios";
type OpenOrder = { id: number; customer: string; items: OrderItem[]; createdAt: number; status: "pendente" | "pago"; method?: string };

function PdvPanel({ menuProducts, onClose }: { menuProducts: Product[]; onClose: () => void }) {
  const [tab, setTab] = useState<TabName>("Dashboard");
  const [basket, setBasket] = useState<OrderItem[]>([]);
  const [customer, setCustomer] = useState("");
  const [orders, setOrders] = useState<OpenOrder[]>([
    { id: 101, customer: "Mesa 12", createdAt: Date.now() - 12 * 60000, status: "pendente", items: [{ product: menuProducts[0], qty: 2, note: "Sem cebola", point: "Ao ponto" }] },
  ]);
  const [expenses, setExpenses] = useState([{ id: 1, description: "Gás", amount: 85, category: "Operação" }]);
  const [checkout, setCheckout] = useState<OpenOrder | null>(null);
  const [method, setMethod] = useState("PIX");
  const [cash, setCash] = useState("");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", category: "Operação" });
  const [category, setCategory] = useState("Todas");

  const paid = orders.filter((o) => o.status === "pago");
  const pending = orders.filter((o) => o.status === "pendente");
  const orderTotal = (items: OrderItem[]) => items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const revenue = paid.reduce((s, o) => s + orderTotal(o.items), 0);
  const costs = expenses.reduce((s, e) => s + e.amount, 0);
  const basketTotal = orderTotal(basket);
  const categories = ["Todas", ...Array.from(new Set(menuProducts.map((p) => p.category)))];

  const addToBasket = (product: Product) => setBasket((current) => {
    const exists = current.find((item) => item.product.id === product.id);
    return exists
      ? current.map((item) => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item)
      : [...current, { product, qty: 1, note: "", point: product.category === "Lanches" ? "Ao ponto" : undefined }];
  });
  const updateQty = (id: number, amount: number) => setBasket((current) =>
    current.map((i) => i.product.id === id ? { ...i, qty: i.qty + amount } : i).filter((i) => i.qty > 0));
  const saveOrder = () => {
    if (!customer.trim() || !basket.length) return;
    setOrders((current) => [...current, { id: Date.now(), customer: customer.trim(), items: basket, createdAt: Date.now(), status: "pendente" }]);
    setBasket([]); setCustomer(""); setTab("Comandas");
  };
  const startCheckout = (order?: OpenOrder) => {
    if (order) setCheckout(order);
    else if (customer.trim() && basket.length) setCheckout({ id: Date.now(), customer: customer.trim(), items: basket, createdAt: Date.now(), status: "pendente" });
  };
  const finishPayment = () => {
    if (!checkout) return;
    const completed = { ...checkout, status: "pago" as const, method };
    setOrders((current) => current.some((o) => o.id === checkout.id)
      ? current.map((o) => o.id === checkout.id ? completed : o)
      : [...current, completed]);
    if (!orders.some((o) => o.id === checkout.id)) { setBasket([]); setCustomer(""); }
    setCheckout(null); setCash(""); setTab("Dashboard");
  };

  const navItems: { name: TabName; icon: typeof Store }[] = [
    { name: "Dashboard", icon: LayoutDashboard }, { name: "PDV", icon: Store },
    { name: "Comandas", icon: ShoppingBag }, { name: "Caixa", icon: Banknote },
    { name: "Produtos", icon: Tags }, { name: "Relatórios", icon: BarChart3 },
  ];

  return <div className="pdv-overlay">
    <aside className="pdv-sidebar">
      <div className="pdv-logo"><span>BH</span><b>GESTÃO</b></div>
      <nav>{navItems.map(({ name, icon: Icon }) =>
        <button key={name} className={tab === name ? "active" : ""} onClick={() => setTab(name)}><Icon />{name}</button>)}
      </nav>
      <div className="online"><i /> 1 dispositivo online</div>
    </aside>
    <section className="pdv-main">
      <header className="pdv-head"><div><small>BURGuer HOUSE · OPERAÇÃO</small><h2>{tab}</h2></div><button onClick={onClose}><X /> Voltar ao cardápio</button></header>

      {tab === "Dashboard" && <div className="dash-view">
        <div className="stats">
          <Stat label="Vendas do dia" value={`R$ ${revenue.toFixed(2).replace(".", ",")}`} />
          <Stat label="Custos do dia" value={`R$ ${costs.toFixed(2).replace(".", ",")}`} negative />
          <Stat label="Lucro do dia" value={`R$ ${(revenue - costs).toFixed(2).replace(".", ",")}`} />
          <Stat label="Comandas abertas" value={String(pending.length)} />
        </div>
        <div className="pdv-grid-2">
          <Panel title="Comandas abertas">{pending.length ? pending.map((o) => <OrderRow key={o.id} order={o} total={orderTotal(o.items)} />) : <Empty text="Nenhuma comanda aberta." />}</Panel>
          <Panel title="Últimas vendas">{paid.length ? paid.slice(-5).reverse().map((o) => <OrderRow key={o.id} order={o} total={orderTotal(o.items)} />) : <Empty text="As vendas finalizadas aparecerão aqui." />}</Panel>
        </div>
      </div>}

      {tab === "PDV" && <div className="sale-view">
        <section className="menu-builder">
          <div className="pdv-categories">{categories.map((c) => <button className={category === c ? "active" : ""} onClick={() => setCategory(c)} key={c}>{c}</button>)}</div>
          <div className="quick-products">{menuProducts.filter((p) => category === "Todas" || p.category === category).map((p) =>
            <button key={p.id} onClick={() => addToBasket(p)}><span>{foodEmoji(p.name, p.category)}</span><b>{p.name}</b><small>R$ {p.price.toFixed(2).replace(".", ",")}</small></button>)}</div>
        </section>
        <aside className="order-builder">
          <label>Mesa<input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="35" inputMode="numeric" /></label>
          <div className="builder-items">{basket.map((item) => <div className="builder-item" key={item.product.id}>
            <div><b>{item.product.name}</b><small>R$ {(item.product.price * item.qty).toFixed(2).replace(".", ",")}</small></div>
            <div className="mini-step"><button onClick={() => updateQty(item.product.id,-1)}><Minus /></button><span>{item.qty}</span><button onClick={() => updateQty(item.product.id,1)}><Plus /></button></div>
            {item.point && <select value={item.point} onChange={(e) => setBasket((c) => c.map((i) => i.product.id === item.product.id ? {...i, point:e.target.value}:i))}><option>Mal passado</option><option>Ao ponto</option><option>Bem passado</option></select>}
            <input placeholder="Observação do item" value={item.note} onChange={(e) => setBasket((c) => c.map((i) => i.product.id === item.product.id ? {...i,note:e.target.value}:i))} />
          </div>)}</div>
          {!basket.length && <Empty text="Toque em um produto para começar." />}
          <div className="order-footer"><div><span>Total</span><strong>R$ {basketTotal.toFixed(2).replace(".", ",")}</strong></div>
            <button disabled={!customer.trim() || !basket.length} onClick={saveOrder}>SALVAR COMANDA</button>
            <button className="gold" disabled={!customer.trim() || !basket.length} onClick={() => startCheckout()}>COBRAR / FINALIZAR</button>
          </div>
        </aside>
      </div>}

      {tab === "Comandas" && <div className="commands-grid">{pending.map((o) => <article className="command-card" key={o.id}>
        <div className="command-top"><div><small>ABERTA HÁ {Math.max(1,Math.round((Date.now()-o.createdAt)/60000))} MIN</small><h3>{o.customer}</h3></div><strong>R$ {orderTotal(o.items).toFixed(2).replace(".", ",")}</strong></div>
        {o.items.map((i) => <label className="delivery" key={i.product.id}><input type="checkbox" checked={!!i.delivered} onChange={() => setOrders((all) => all.map((ord) => ord.id === o.id ? {...ord,items:ord.items.map((x)=>x.product.id===i.product.id?{...x,delivered:!x.delivered}:x)}:ord))}/><span>{i.qty}× {i.product.name}</span></label>)}
        <div className="command-actions"><button onClick={() => {setBasket(o.items);setCustomer(o.customer);setOrders((all)=>all.filter((x)=>x.id!==o.id));setTab("PDV")}}>Adicionar itens</button><button className="gold" onClick={() => startCheckout(o)}>Cobrar</button><button className="danger" onClick={() => setOrders((all)=>all.filter((x)=>x.id!==o.id))}>Cancelar</button></div>
      </article>)}
      {!pending.length && <Empty text="Não há comandas abertas." />}</div>}

      {tab === "Caixa" && <div className="cash-view">
        <div className="stats"><Stat label="Entradas" value={`R$ ${revenue.toFixed(2).replace(".", ",")}`} /><Stat label="Saídas" value={`R$ ${costs.toFixed(2).replace(".", ",")}`} negative /><Stat label="Saldo" value={`R$ ${(revenue-costs).toFixed(2).replace(".", ",")}`} /></div>
        <Panel title="Movimentações"><button className="small-gold" onClick={() => setExpenseOpen(true)}>+ NOVO CUSTO</button>
          <div className="cash-table"><b>Descrição</b><b>Categoria</b><b>Valor</b>{expenses.map((e)=><div className="cash-line" key={e.id}><span>{e.description}</span><span>{e.category}</span><strong>- R$ {e.amount.toFixed(2).replace(".", ",")}</strong></div>)}</div>
        </Panel>
      </div>}

      {tab === "Produtos" && <Panel title={`${menuProducts.length} produtos cadastrados`}>
        <div className="products-admin">{categories.slice(1).map((c)=><details key={c} open><summary>{c}<span>{menuProducts.filter((p)=>p.category===c).length} itens</span></summary>{menuProducts.filter((p)=>p.category===c).map((p)=><div key={p.id}><span>{foodEmoji(p.name,p.category)} {p.name}</span><b>R$ {p.price.toFixed(2).replace(".", ",")}</b><i>Ativo</i></div>)}</details>)}</div>
      </Panel>}

      {tab === "Relatórios" && <div className="report-view">
        <div className="stats"><Stat label="Receita" value={`R$ ${revenue.toFixed(2).replace(".", ",")}`} /><Stat label="Ticket médio" value={`R$ ${(paid.length?revenue/paid.length:0).toFixed(2).replace(".", ",")}`} /><Stat label="Pedidos" value={String(orders.length)} /></div>
        <Panel title="Desempenho por categoria"><div className="bars">{categories.slice(1).map((c,i)=><div key={c}><span>{c}</span><i style={{width:`${35+i*14}%`}}/><b>{35+i*14}%</b></div>)}</div><button className="small-gold" onClick={() => window.print()}>EXPORTAR / IMPRIMIR PDF</button></Panel>
      </div>}
    </section>

    {checkout && <div className="modal-backdrop"><section className="modal checkout-modal"><button className="modal-close" onClick={()=>setCheckout(null)}><X /></button><span className="modal-icon"><Banknote /></span><h3>Finalizar {checkout.customer}</h3><div className="checkout-total">R$ {orderTotal(checkout.items).toFixed(2).replace(".", ",")}</div>
      <div className="payment-methods">{["PIX","Dinheiro","Cartão Débito","Cartão Crédito"].map((m)=><button className={method===m?"active":""} onClick={()=>setMethod(m)} key={m}>{m}</button>)}</div>
      {method==="Dinheiro"&&<><input className="cash-input" inputMode="decimal" value={cash} onChange={(e)=>setCash(e.target.value)} placeholder="Valor recebido"/>{cash&&<p className="change">{Number(cash.replace(",","."))>=orderTotal(checkout.items)?`Troco: R$ ${(Number(cash.replace(",","."))-orderTotal(checkout.items)).toFixed(2).replace(".", ",")}`:`Faltam R$ ${(orderTotal(checkout.items)-Number(cash.replace(",", "."))).toFixed(2).replace(".", ",")}`}</p>}</>}
      <button className="primary" disabled={method==="Dinheiro"&&Number(cash.replace(",","."))<orderTotal(checkout.items)} onClick={finishPayment}>CONFIRMAR PAGAMENTO</button>
    </section></div>}

    {expenseOpen&&<div className="modal-backdrop"><section className="modal"><button className="modal-close" onClick={()=>setExpenseOpen(false)}><X /></button><h3>Novo custo</h3><div className="expense-form"><input placeholder="Descrição" value={newExpense.description} onChange={(e)=>setNewExpense({...newExpense,description:e.target.value})}/><input placeholder="Valor" inputMode="decimal" value={newExpense.amount} onChange={(e)=>setNewExpense({...newExpense,amount:e.target.value})}/><select value={newExpense.category} onChange={(e)=>setNewExpense({...newExpense,category:e.target.value})}><option>Operação</option><option>Insumos</option><option>Manutenção</option></select></div><button className="primary" onClick={()=>{if(newExpense.description&&Number(newExpense.amount.replace(",","."))){setExpenses([...expenses,{id:Date.now(),description:newExpense.description,amount:Number(newExpense.amount.replace(",",".")),category:newExpense.category}]);setExpenseOpen(false)}}}>SALVAR CUSTO</button></section></div>}
  </div>;
}

function Stat({label,value,negative}:{label:string;value:string;negative?:boolean}) { return <article className="stat-card"><small>{label}</small><strong className={negative?"negative":""}>{value}</strong></article> }
function Panel({title,children}:{title:string;children:React.ReactNode}) { return <section className="admin-panel"><h3>{title}</h3>{children}</section> }
function Empty({text}:{text:string}) { return <div className="admin-empty">{text}</div> }
function OrderRow({order,total}:{order:OpenOrder;total:number}) { return <div className="order-row"><div><b>{order.customer}</b><small>{order.items.length} {order.items.length===1?"item":"itens"}</small></div><strong>R$ {total.toFixed(2).replace(".", ",")}</strong></div> }
function foodEmoji(name:string,category:string) { const text=`${name} ${category}`.toLowerCase(); if(text.includes("vinho"))return"🍷";if(text.includes("salada"))return"🥗";if(text.includes("batata"))return"🍟";if(text.includes("onion"))return"🧅";return"🍔" }

type CommandDelivery = {
  phone?:string;
  fulfillment?:"delivery"|"pickup";
  payment?:string;
  street?:string;
  number?:string;
  neighborhood?:string;
  reference?:string;
  notes?:string;
};
function deliveryPaymentLabel(method?:string){
  const value=(method||"").toLowerCase();
  if(value==="cash"||value==="dinheiro")return"Dinheiro";
  if(value==="credit"||value==="credito"||value==="crédito")return"Cartão Crédito";
  if(value==="debit"||value==="debito"||value==="débito")return"Cartão Débito";
  return"PIX";
}
type IntegratedCommand = {id:number;name:string;tableLabel?:string;waiterName?:string;source?:"waiter"|"delivery";count:number;total:number;createdAt:number;kitchenStatus?:"new"|"preparing"|"ready"|"cancelled";cancelledBy?:"customer"|"store";cancelledAt?:string;delivery?:CommandDelivery;items:{name:string;qty:number;price:number;detail?:string;delivered:boolean}[]};
type IntegratedSale = {id:number;name:string;total:number;method:string;createdAt:number;items:{name:string;qty:number;price:number;detail?:string}[]};
type IntegratedExpense = {id:number;description:string;amount:number;createdAt:number};

function mergeOpenCommands(commands:IntegratedCommand[]){
  const merged:IntegratedCommand[]=[];
  commands.forEach((command)=>{
    const existing=merged.find((item)=>item.id===command.id);
    if(!existing){merged.push({...command,items:[...command.items]});return}
    existing.count+=command.count;
    existing.total+=command.total;
    existing.createdAt=Math.min(existing.createdAt,command.createdAt);
    command.items.forEach((incoming)=>{
      const index=existing.items.findIndex((item)=>item.delivered===incoming.delivered&&item.name===incoming.name&&(item.detail||"")===(incoming.detail||""));
      if(index>=0)existing.items[index]={...existing.items[index],qty:existing.items[index].qty+incoming.qty};
      else existing.items.push({...incoming});
    });
  });
  return merged;
}

function deliveryAddress(delivery?:CommandDelivery){
  if(!delivery)return"";
  return [
    [delivery.street,delivery.number].filter(Boolean).join(", "),
    delivery.neighborhood,
    delivery.reference,
  ].filter(Boolean).join(" · ");
}

function IntegratedProducts({tenantId,products,categories,onChange,onAddCategory,onRenameCategory,onDeleteCategory}:{tenantId?:string|null;products:Product[];categories:string[];onChange:(products:Product[])=>void;onAddCategory:(name:string)=>void;onRenameCategory:(oldName:string,newName:string)=>void;onDeleteCategory:(name:string)=>void}) {
  const blank={id:0,name:"",price:"",category:categories[0]||"",description:"",image:"",tag:"",trackStock:true,preparationPointEnabled:false,stock:"0",minStock:"5"};
  const [form,setForm]=useState(blank);
  const [drawerOpen,setDrawerOpen]=useState(false);
  const [editing,setEditing]=useState<number|null>(null);
  const [filter,setFilter]=useState("Todos");
  const [query,setQuery]=useState("");
  const [manageOpen,setManageOpen]=useState(false);
  const [newCategory,setNewCategory]=useState("");
  const [categoryToDelete,setCategoryToDelete]=useState<string|null>(null);
  const [productToDelete,setProductToDelete]=useState<Product|null>(null);
  const [productError,setProductError]=useState("");
  const [categoryNotice,setCategoryNotice]=useState("");
  const [imageUploading,setImageUploading]=useState(false);

  const selectLocalImage=async(file?:File)=>{
    if(!file)return;
    if(!supabase||!tenantId){
      setProductError("Entre na conta da loja para enviar imagens à nuvem.");
      return;
    }
    if(!file.type.startsWith("image/")){
      setProductError("Selecione um arquivo de imagem válido.");
      return;
    }
    if(file.size>8*1024*1024){
      setProductError("A imagem deve ter no máximo 8 MB.");
      return;
    }
    const reader=new FileReader();
    reader.onload=()=>{
      const image=new Image();
      image.onload=async()=>{
        const maxSize=1000;
        const scale=Math.min(1,maxSize/Math.max(image.width,image.height));
        const canvas=document.createElement("canvas");
        canvas.width=Math.max(1,Math.round(image.width*scale));
        canvas.height=Math.max(1,Math.round(image.height*scale));
        canvas.getContext("2d")?.drawImage(image,0,0,canvas.width,canvas.height);
        setImageUploading(true);
        try{
          const blob=await new Promise<Blob>((resolve,reject)=>
            canvas.toBlob((value)=>value?resolve(value):reject(new Error("Falha ao preparar imagem")),"image/jpeg",.82));
          const path=`${tenantId}/${crypto.randomUUID()}.jpg`;
          const {error}=await supabase.storage.from("product-images").upload(path,blob,{contentType:"image/jpeg",cacheControl:"31536000"});
          if(error)throw error;
          const {data}=supabase.storage.from("product-images").getPublicUrl(path);
          setProductError("");
          setForm((current)=>({...current,image:data.publicUrl}));
        }catch(error){
          setProductError(`Não foi possível enviar a imagem à nuvem: ${error instanceof Error?error.message:"erro desconhecido"}`);
        }finally{
          setImageUploading(false);
        }
      };
      image.onerror=()=>setProductError("Não foi possível abrir essa imagem.");
      image.src=String(reader.result);
    };
    reader.onerror=()=>setProductError("Não foi possível ler o arquivo selecionado.");
    reader.readAsDataURL(file);
  };

  const visible=products
    .filter((p)=>filter==="Todos"||p.category===filter)
    .filter((p)=>!query.trim()||p.name.toLowerCase().includes(query.trim().toLowerCase())||p.description.toLowerCase().includes(query.trim().toLowerCase()));

  const openNew=()=>{
    if(!categories.length){
      setCategoryNotice("Crie uma categoria antes de adicionar o primeiro produto.");
      setManageOpen(true);
      return;
    }
    setEditing(null);setProductError("");setForm({...blank,category:categories[0]});setDrawerOpen(true);
  };
  const openEdit=(product:Product)=>{setProductError("");setEditing(product.id);setForm({id:product.id,name:product.name,price:String(product.price).replace(".",","),category:product.category,description:product.description,image:product.image,tag:product.tag||"",trackStock:!!product.trackStock,preparationPointEnabled:usesPreparationPoint(product),stock:String(product.stock||0),minStock:String(product.minStock||0)});setDrawerOpen(true)};
  const closeDrawer=()=>{setDrawerOpen(false);setEditing(null);setProductError("");setForm(blank)};
  const submit=()=>{
    const price=Number(form.price.replace(",","."));
    if(!categories.length||!form.category||!categories.includes(form.category)){
      setProductError("Crie uma categoria ou selecione uma categoria existente antes de salvar o produto.");
      return;
    }
    if(!form.name.trim()||!Number.isFinite(price)||price<=0){
      setProductError("Preencha o nome e informe um preço válido para salvar o produto.");
      return;
    }
    const item:Product={id:editing??Math.max(0,...products.map((p)=>p.id))+1,name:form.name.trim(),price,category:form.category,description:form.description.trim()||"Produto preparado com ingredientes selecionados.",image:form.image.trim()||"https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=88",tag:form.tag.trim()||undefined,trackStock:form.trackStock,preparationPointEnabled:form.preparationPointEnabled,stock:Math.max(0,Number(form.stock)||0),minStock:Math.max(0,Number(form.minStock)||0)};
    onChange(editing?products.map((p)=>p.id===editing?item:p):[...products,item]);
    closeDrawer();
  };
  const remove=(id:number)=>{onChange(products.filter((p)=>p.id!==id));if(editing===id)closeDrawer()};
  const duplicate=(product:Product)=>{const copy:Product={...product,id:Math.max(0,...products.map((p)=>p.id))+1,name:`${product.name} (cópia)`};onChange([...products,copy])};

  return <div className="integrated-view catalog-view">
    <header className="catalog-topbar">
      <div>
        <p>CARDÁPIO</p>
        <h1>Catálogo</h1>
      </div>
      <div className="catalog-actions">
        <div className="catalog-search"><Search size={15}/><input placeholder="Buscar produto..." value={query} onChange={(e)=>setQuery(e.target.value)}/></div>
        <button className="ghost-btn" onClick={()=>{setCategoryNotice("");setManageOpen(true)}}><Tags size={15}/> Categorias</button>
        <button className="primary-btn" onClick={openNew}><Plus size={16}/> Novo produto</button>
      </div>
    </header>

    <div className="catalog-chips">
      <button className={filter==="Todos"?"chip active":"chip"} onClick={()=>setFilter("Todos")}>Todos <em>{products.length}</em></button>
      {categories.map((c)=><button key={c} className={filter===c?"chip active":"chip"} onClick={()=>setFilter(c)}>{c} <em>{products.filter((p)=>p.category===c).length}</em></button>)}
    </div>

    <div className="catalog-grid">
      {visible.map((product)=>(
        <article key={product.id} className="catalog-card" onClick={()=>openEdit(product)}>
          <div className="catalog-card-media"><ProductImage product={product}/>
            {product.tag&&<span className="catalog-tag">{product.tag}</span>}
            <div className="catalog-hover">
              <button onClick={(e)=>{e.stopPropagation();openEdit(product)}} title="Editar"><Utensils size={14}/></button>
              <button onClick={(e)=>{e.stopPropagation();duplicate(product)}} title="Duplicar"><Plus size={14}/></button>
              <button onClick={(e)=>{e.stopPropagation();setProductToDelete(product)}} title="Remover" className="danger"><X size={14}/></button>
            </div>
          </div>
          <div className="catalog-card-body">
            <small>{product.category}</small>
            <h3>{product.name}</h3>
            <div className="catalog-card-foot">
              <strong>R$ {product.price.toFixed(2).replace(".",",")}</strong>
              {product.trackStock&&<span className={(product.stock||0)<=(product.minStock||0)?"catalog-dot low":"catalog-dot"}>{product.stock||0}</span>}
            </div>
          </div>
        </article>
      ))}
      <button className="catalog-card catalog-add" onClick={openNew}>
        <Plus size={26}/>
        <span>Adicionar produto</span>
      </button>
    </div>

    {!visible.length&&<div className="integrated-empty"><Utensils/><h3>Nenhum produto encontrado</h3><p>Tente outra busca ou crie um novo item.</p></div>}

    {drawerOpen&&<div className="drawer-backdrop" onMouseDown={closeDrawer}>
      <aside className="drawer" onMouseDown={(e)=>e.stopPropagation()}>
        <header className="drawer-head">
          <div><p>{editing?"EDITAR":"NOVO"}</p><h2>{editing?form.name||"Produto":"Novo produto"}</h2></div>
          <button className="drawer-close" onClick={closeDrawer} aria-label="Fechar"><X/></button>
        </header>
        <div className="drawer-body">
          {form.image&&<div className="drawer-preview" style={{backgroundImage:`url(${form.image})`}}/>}
          <label className="field">Nome<input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} placeholder="Ex.: Burger da Casa"/></label>
          <div className="field-row">
            <label className="field">Preço<input value={form.price} inputMode="decimal" onChange={(e)=>setForm({...form,price:e.target.value})} placeholder="39,90"/></label>
            <label className="field">Categoria<select value={form.category} onChange={(e)=>{setProductError("");setForm({...form,category:e.target.value})}}><option value="" disabled>Selecione uma categoria</option>{categories.map((c)=><option key={c}>{c}</option>)}</select></label>
          </div>
          {productError&&<div className="drawer-form-alert" role="alert">{productError}</div>}
          <label className="field">Descrição<textarea rows={3} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} placeholder="Ingredientes e detalhes"/></label>
          <label className="field">Imagem
            <input value={form.image} onChange={(e)=>setForm({...form,image:e.target.value})} placeholder="Cole uma URL: https://..."/>
            <span className="local-image-picker">
              <input type="file" accept="image/*" disabled={imageUploading} onChange={(e)=>selectLocalImage(e.target.files?.[0])}/>
              <b>{imageUploading?"ENVIANDO PARA A NUVEM...":"ESCOLHER IMAGEM DO DISPOSITIVO"}</b>
              <small>JPG, PNG ou WEBP · máximo 8 MB</small>
            </span>
          </label>
          <label className="field">Badge<input value={form.tag} onChange={(e)=>setForm({...form,tag:e.target.value})} placeholder="NOVO, DESTAQUE..."/></label>
          <label className="drawer-switch"><input type="checkbox" checked={form.preparationPointEnabled} onChange={(e)=>setForm({...form,preparationPointEnabled:e.target.checked})}/><span/> Permitir escolha do ponto de preparo</label>
          {form.preparationPointEnabled&&<p className="drawer-switch-note">O cliente poderá escolher entre Mal passado, Ao ponto e Bem passado ao adicionar este produto.</p>}
          <label className="drawer-switch"><input type="checkbox" checked={form.trackStock} onChange={(e)=>setForm({...form,trackStock:e.target.checked})}/><span/> Controlar estoque</label>
          {form.trackStock&&<div className="field-row">
            <label className="field">Estoque<input value={form.stock} inputMode="numeric" onChange={(e)=>setForm({...form,stock:e.target.value})}/></label>
            <label className="field">
              <span className="field-label-with-help">Mínimo
                <span className="field-help">
                  <button type="button" aria-label="O que significa estoque mínimo?">?</button>
                  <span className="field-help-tooltip" role="tooltip">Quando o estoque chegar a esta quantidade ou ficar abaixo dela, o sistema mostrará um alerta para reposição.</span>
                </span>
              </span>
              <input value={form.minStock} inputMode="numeric" onChange={(e)=>setForm({...form,minStock:e.target.value})}/>
            </label>
          </div>}
        </div>
        <footer className="drawer-foot">
          {editing&&<button className="danger-btn" onClick={()=>setProductToDelete(products.find((product)=>product.id===editing)||null)}>Remover</button>}
          <button className="ghost-btn" onClick={closeDrawer}>Cancelar</button>
          <button className="primary-btn" disabled={imageUploading} onClick={submit}>{imageUploading?"Enviando imagem...":editing?"Salvar":"Adicionar"}</button>
        </footer>
      </aside>
    </div>}

    {productToDelete&&<div className="modal-backdrop" onMouseDown={()=>setProductToDelete(null)}>
      <section className="modal confirmation-modal" onMouseDown={(event)=>event.stopPropagation()}>
        <button className="modal-close" onClick={()=>setProductToDelete(null)} aria-label="Fechar"><X/></button>
        <span className="modal-icon"><Trash2/></span>
        <h3>Remover produto</h3>
        <p>Você tem certeza que deseja remover <b>{productToDelete.name}</b>? Essa ação não poderá ser desfeita.</p>
        <div className="confirmation-actions">
          <button onClick={()=>setProductToDelete(null)}>VOLTAR</button>
          <button className="danger-confirm" onClick={()=>{remove(productToDelete.id);setProductToDelete(null)}}>SIM, REMOVER</button>
        </div>
      </section>
    </div>}

    {manageOpen&&<div className="modal-backdrop" onMouseDown={()=>{setManageOpen(false);setCategoryNotice("")}}>
      <section className="modal categories-modal" onMouseDown={(e)=>e.stopPropagation()}>
        <button className="modal-close" onClick={()=>{setManageOpen(false);setCategoryNotice("")}} aria-label="Fechar"><X/></button>
        <span className="modal-icon"><Tags/></span>
        <h3>Categorias</h3>
        <p>Organize as seções do cardápio.</p>
        {categoryNotice&&<div className="category-required-alert" role="alert">{categoryNotice}</div>}
        <div className="cat-new">
          <input value={newCategory} onChange={(e)=>setNewCategory(e.target.value)} placeholder="Nova categoria" onKeyDown={(e)=>{if(e.key==="Enter"){const clean=newCategory.trim();if(clean&&!categories.some((c)=>c.toLowerCase()===clean.toLowerCase())){onAddCategory(clean);setNewCategory("");setCategoryNotice("")}}}}/>
          <button className="primary-btn" onClick={()=>{const clean=newCategory.trim();if(clean&&!categories.some((c)=>c.toLowerCase()===clean.toLowerCase())){onAddCategory(clean);setNewCategory("");setCategoryNotice("")}}}><Plus size={14}/></button>
        </div>
        <div className="cat-list">{categories.map((category)=>{
          const count=products.filter((p)=>p.category===category).length;
          return <div key={category} className="cat-row">
            <div><strong>{category}</strong><small>{count} {count===1?"produto":"produtos"}</small></div>
            <div>
              <button className="ghost-btn" onClick={()=>{const next=window.prompt("Novo nome da categoria",category);if(next)onRenameCategory(category,next)}}>Renomear</button>
              <button className="danger-btn" onClick={()=>setCategoryToDelete(category)}>Remover</button>
            </div>
          </div>;
        })}</div>
      </section>
    </div>}

    {categoryToDelete&&<div className="modal-backdrop" onMouseDown={()=>setCategoryToDelete(null)}><section className="modal confirmation-modal" onMouseDown={(event)=>event.stopPropagation()}>
      <button className="modal-close" onClick={()=>setCategoryToDelete(null)} aria-label="Fechar"><X/></button>
      <span className="modal-icon"><Tags/></span>
      <h3>Remover categoria</h3>
      <p>Você tem certeza que deseja remover “{categoryToDelete}”? {products.filter((product)=>product.category===categoryToDelete).length>0?`Os ${products.filter((product)=>product.category===categoryToDelete).length} produtos desta categoria também serão removidos.`:"Esta categoria está vazia."}</p>
      <div className="confirmation-actions"><button onClick={()=>setCategoryToDelete(null)}>VOLTAR</button><button className="danger-confirm" onClick={()=>{
        const remainingCategories=categories.filter((category)=>category!==categoryToDelete);
        onChange(products.filter((product)=>product.category!==categoryToDelete));
        onDeleteCategory(categoryToDelete);
        if(filter===categoryToDelete)setFilter("Todos");
        if(form.category===categoryToDelete)setForm({...form,category:remainingCategories[0]||""});
        setCategoryToDelete(null);
      }}>SIM, REMOVER</button></div>
    </section></div>}
  </div>
}

function IntegratedStock({products,onChange}:{products:Product[];onChange:(products:Product[])=>void}) {
  const [query,setQuery]=useState("");
  const [onlyLow,setOnlyLow]=useState(false);
  const [newProductFor,setNewProductFor]=useState<string|null>(null);
  const [newCategory,setNewCategory]=useState(false);
  const [catName,setCatName]=useState("");
  const [draft,setDraft]=useState({name:"",price:"",stock:"0",minStock:"5",trackStock:true});
  const tracked=products.filter((p)=>p.trackStock);
  const low=tracked.filter((p)=>(p.stock||0)<=(p.minStock||0));
  const totalUnits=tracked.reduce((sum,p)=>sum+Number(p.stock||0),0);
  const categories=Array.from(new Set(products.map((p)=>p.category)));

  const setStock=(id:number,value:number)=>onChange(products.map((p)=>p.id===id?{...p,stock:Math.max(0,Math.floor(value)||0)}:p));
  const setMin=(id:number,value:number)=>onChange(products.map((p)=>p.id===id?{...p,minStock:Math.max(0,Math.floor(value)||0)}:p));
  const toggleTrack=(id:number,on:boolean)=>onChange(products.map((p)=>p.id===id?{...p,trackStock:on,stock:p.stock||0,minStock:p.minStock||0}:p));

  const openNewProduct=(cat:string|"")=>{setDraft({name:"",price:"",stock:"0",minStock:"5",trackStock:true});setNewProductFor(cat||categories[0]||"");};
  const saveNewProduct=()=>{
    const name=draft.name.trim(); if(!name||!newProductFor) return;
    const nextId=(products.reduce((m,p)=>Math.max(m,p.id),0)||0)+1;
    onChange([...products,{id:nextId,category:newProductFor,name,price:Number(draft.price)||0,image:"",description:"",trackStock:draft.trackStock,preparationPointEnabled:false,stock:Number(draft.stock)||0,minStock:Number(draft.minStock)||0}]);
    setNewProductFor(null);
  };
  const saveNewCategory=()=>{
    const name=catName.trim(); if(!name||categories.includes(name)) {setNewCategory(false);setCatName("");return;}
    const nextId=(products.reduce((m,p)=>Math.max(m,p.id),0)||0)+1;
    onChange([...products,{id:nextId,category:name,name:`Novo item · ${name}`,price:0,image:"",description:"",trackStock:true,preparationPointEnabled:false,stock:0,minStock:5}]);
    setNewCategory(false);setCatName("");
  };

  const visible=products
    .filter((p)=>p.name.toLowerCase().includes(query.trim().toLowerCase())||p.category.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((p)=>!onlyLow||(p.trackStock&&(p.stock||0)<=(p.minStock||0)))
    .sort((a,b)=>Number(!!b.trackStock)-Number(!!a.trackStock));

  return <div className="integrated-view">
    <div className="integrated-heading">
      <div><p>INVENTÁRIO · CONTROLE</p><h1>Estoque</h1><span>Ajuste as quantidades direto na lista. Simples e rápido.</span></div>
      <b className={low.length?"stock-alert on":"stock-alert"}>{low.length} {low.length===1?"alerta":"alertas"}</b>
    </div>

    <div className="stock-summary">
      <article><small>Controlados</small><strong>{tracked.length}</strong></article>
      <article><small>Estoque baixo</small><strong className={low.length?"red":""}>{low.length}</strong></article>
      <article><small>Unidades totais</small><strong>{totalUnits}</strong></article>
    </div>

    <div className="stock-toolbar">
      <div className="stock-search"><Search size={15}/><input placeholder="Buscar produto ou categoria" value={query} onChange={(e)=>setQuery(e.target.value)}/></div>
      <label className="stock-filter"><input type="checkbox" checked={onlyLow} onChange={(e)=>setOnlyLow(e.target.checked)}/> Apenas estoque baixo</label>
      <button className="stock-add-btn" onClick={()=>setNewCategory(true)}><Plus size={14}/> Categoria</button>
      <button className="stock-add-btn primary" onClick={()=>openNewProduct("")}><Plus size={14}/> Produto</button>
    </div>

    {(() => {
      const grouped = categories.map((cat)=>({cat,items:visible.filter((p)=>p.category===cat)})).filter((g)=>g.items.length);
      if(!grouped.length) return <div className="integrated-empty"><Store/><h3>Nenhum produto encontrado</h3><p>Ajuste a busca ou desmarque o filtro.</p></div>;
      return <div className="stock-groups">{grouped.map(({cat,items})=>{
        const catLow=items.filter((p)=>p.trackStock&&(p.stock||0)<=(p.minStock||0)).length;
        return <details key={cat} className="stock-drawer">
          <summary>
            <span className="drawer-caret"><ChevronDown size={16}/></span>
            <span className="drawer-title">{cat}</span>
            <span className="drawer-count">{items.length} {items.length===1?"item":"itens"}</span>
            {catLow>0 && <span className="drawer-alert">{catLow} alerta{catLow===1?"":"s"}</span>}
            <button className="drawer-add" onClick={(e)=>{e.preventDefault();openNewProduct(cat);}} title="Adicionar produto"><Plus size={14}/></button>
          </summary>
          <div className="stock-simple">
            {items.map((product)=>{
              const current=Number(product.stock||0);
              const min=Number(product.minStock||0);
              const state=!product.trackStock?"off":current<=0?"out":current<=min?"low":"ok";
              return <article key={product.id} className={`stock-row stock-${state}`}>
                <ProductImage product={product}/>
                <div className="stock-info">
                  <small>{product.category}</small>
                  <h3>{product.name}</h3>
                  {product.trackStock
                    ? <span className={state==="out"?"red":state==="low"?"amber":"green"}>{state==="out"?"Esgotado":state==="low"?"Repor estoque":"Disponível"}</span>
                    : <span className="muted">Estoque não controlado</span>}
                </div>
                {product.trackStock?<>
                  <div className="stock-counter">
                    <button aria-label="Diminuir" onClick={()=>setStock(product.id,current-1)}><Minus size={14}/></button>
                    <input type="number" min={0} value={current} onChange={(e)=>setStock(product.id,Number(e.target.value))}/>
                    <button aria-label="Aumentar" onClick={()=>setStock(product.id,current+1)}><Plus size={14}/></button>
                  </div>
                  <div className="stock-quick">
                    <button onClick={()=>setStock(product.id,current+5)}>+5</button>
                    <button onClick={()=>setStock(product.id,current+10)}>+10</button>
                    <label>Mínimo <input type="number" min={0} value={min} onChange={(e)=>setMin(product.id,Number(e.target.value))}/></label>
                  </div>
                </>:<div className="stock-off"><p>Ative para controlar as unidades deste produto.</p></div>}
                <label className="stock-switch" title="Controlar estoque">
                  <input type="checkbox" checked={!!product.trackStock} onChange={(e)=>toggleTrack(product.id,e.target.checked)}/>
                  <span/>
                </label>
              </article>;
            })}
          </div>
        </details>;
      })}</div>;
    })()}

    {newProductFor!==null && <div className="modal-overlay" onClick={()=>setNewProductFor(null)}>
      <div className="modal stock-modal" onClick={(e)=>e.stopPropagation()}>
        <header><h3>Novo produto</h3><button onClick={()=>setNewProductFor(null)}>×</button></header>
        <div className="stock-modal-body">
          <label>Categoria<select value={newProductFor} onChange={(e)=>setNewProductFor(e.target.value)}>{categories.map((c)=><option key={c} value={c}>{c}</option>)}</select></label>
          <label>Nome<input autoFocus value={draft.name} onChange={(e)=>setDraft({...draft,name:e.target.value})} placeholder="Ex: Espetinho de coração"/></label>
          <div className="stock-modal-row">
            <label>Preço (R$)<input type="number" step="0.01" min={0} value={draft.price} onChange={(e)=>setDraft({...draft,price:e.target.value})}/></label>
            <label>Estoque<input type="number" min={0} value={draft.stock} onChange={(e)=>setDraft({...draft,stock:e.target.value})}/></label>
            <label>
              <span className="stock-label-with-help">Mínimo
                <span className="field-help">
                  <button type="button" aria-label="O que significa estoque mínimo?">?</button>
                  <span className="field-help-tooltip" role="tooltip">Quando o estoque chegar a esta quantidade ou ficar abaixo dela, o sistema mostrará um alerta para reposição.</span>
                </span>
              </span>
              <input type="number" min={0} value={draft.minStock} onChange={(e)=>setDraft({...draft,minStock:e.target.value})}/>
            </label>
          </div>
          <label className="inline-check"><input type="checkbox" checked={draft.trackStock} onChange={(e)=>setDraft({...draft,trackStock:e.target.checked})}/> Controlar estoque deste produto</label>
        </div>
        <footer><button onClick={()=>setNewProductFor(null)}>Cancelar</button><button className="primary" disabled={!draft.name.trim()} onClick={saveNewProduct}>Salvar produto</button></footer>
      </div>
    </div>}

    {newCategory && <div className="modal-overlay" onClick={()=>setNewCategory(false)}>
      <div className="modal stock-modal" onClick={(e)=>e.stopPropagation()}>
        <header><h3>Nova categoria</h3><button onClick={()=>setNewCategory(false)}>×</button></header>
        <div className="stock-modal-body">
          <label>Nome da categoria<input autoFocus value={catName} onChange={(e)=>setCatName(e.target.value)} placeholder="Ex: Sobremesas"/></label>
          <p className="stock-modal-hint">Um produto inicial em branco será criado nessa categoria — edite ou adicione mais depois.</p>
        </div>
        <footer><button onClick={()=>setNewCategory(false)}>Cancelar</button><button className="primary" disabled={!catName.trim()} onClick={saveNewCategory}>Criar categoria</button></footer>
      </div>
    </div>}
  </div>;
}

function IntegratedCommands({tenantId,commands,setCommands,onCharge,products,adjustStock,printStatuses}:{tenantId?:string|null;commands:IntegratedCommand[];setCommands:React.Dispatch<React.SetStateAction<IntegratedCommand[]>>;onCharge:(command:IntegratedCommand)=>void;products:Product[];adjustStock:(deltas:{name:string;qty:number}[])=>void;printStatuses:Record<number,"sending"|"pending"|"processing"|"printed"|"failed">}) {
  const [confirmation,setConfirmation]=useState<{action:"print"|"cancel"|"dismiss";command:IntegratedCommand}|null>(null);
  const [editing,setEditing]=useState<IntegratedCommand|null>(null);
  const editCategories=useMemo(()=>Array.from(new Set(products.map((product)=>product.category))),[products]);
  const [editCategory,setEditCategory]=useState(editCategories[0]||"");
  const confirmAction=async()=>{
    if(!confirmation)return;
    if(confirmation.action==="print"){
      if(tenantId)queueKitchenOrder({
        tenantId,
        commandId:confirmation.command.id,
        customer:confirmation.command.tableLabel||confirmation.command.name,
        waiter:confirmation.command.waiterName,
        items:toReceiptItems(confirmation.command.items),
        total:confirmation.command.total,
        kind:`reprint_${Date.now()}`,
      }).catch((error)=>console.error("Não foi possível colocar a impressão na fila:",error));
      else printKitchenTicket(confirmation.command.name,confirmation.command.items,confirmation.command.waiterName);
    }
    else if(confirmation.action==="cancel") {
      if(tenantId&&supabase){
        const {data,error}=await supabase.rpc("cancel_restaurant_command",{p_command_id:confirmation.command.id});
        if(error||!data){
          console.error("Não foi possível cancelar a comanda:",error);
          return;
        }
      }
      if(!confirmation.command.delivery){
        adjustStock(confirmation.command.items.map((item)=>({name:item.name,qty:item.qty})));
      }
      setCommands((all)=>all.filter((command)=>command.id!==confirmation.command.id));
    }
    else {
      if(!tenantId||!supabase)return;
      const {data,error}=await supabase.rpc("dismiss_cancelled_command",{p_command_id:confirmation.command.id});
      if(error||!data){
        console.error("Não foi possível remover a comanda cancelada da fila:",error);
        return;
      }
      setCommands((all)=>all.filter((command)=>command.id!==confirmation.command.id));
    }
    setConfirmation(null);
  };
  const [pendingChanges,setPendingChanges]=useState<OrderChange[]>([]);
  const [printingChanges,setPrintingChanges]=useState(false);
  const [printChangeError,setPrintChangeError]=useState("");
  const [printChangeSent,setPrintChangeSent]=useState(false);
  
  const [pendingProduct,setPendingProduct]=useState<{command:IntegratedCommand;product:Product}|null>(null);
  const [pendingEditMeat,setPendingEditMeat]=useState<{command:IntegratedCommand;product:Product}|null>(null);
  const [editDoneness,setEditDoneness]=useState("");
  const [editMeatNote,setEditMeatNote]=useState("");
  useEffect(()=>{
    if(editing&&!commands.some((command)=>command.id===editing.id))setEditing(null);
  },[commands,editing]);
  useEffect(()=>{
    setPendingChanges([]);
    setPrintChangeError("");
    setPrintChangeSent(false);
  },[editing?.id]);
  const applyEdit=(command:IntegratedCommand,nextItems:IntegratedCommand["items"],change:OrderChange)=>{
    setPrintChangeSent(false);
    setPrintChangeError("");
    const nextCommand={...command,items:nextItems,count:nextItems.reduce((sum,item)=>sum+item.qty,0),total:nextItems.reduce((sum,item)=>sum+item.qty*item.price,0)};
    setCommands((all)=>all.map((c)=>c.id===command.id?nextCommand:c));
    setEditing(nextCommand);
    setPendingChanges((current)=>{
      const index=current.findIndex((c)=>c.type===change.type&&c.name===change.name&&(c.notes||"")===(change.notes||""));
      if(index>=0){const copy=[...current];copy[index]={...copy[index],qty:copy[index].qty+change.qty};return copy}
      return [...current,change];
    });
  };
  const sendPendingChanges=async()=>{
    if(!editing)return;
    setPrintingChanges(true);
    setPrintChangeError("");
    setPrintChangeSent(false);
    try{
      if(tenantId){
        if(pendingChanges.length)await queueOrderUpdate({
          tenantId,
          commandId:editing.id,
          customer:editing.tableLabel||editing.name,
          waiter:editing.waiterName,
          changes:pendingChanges,
          newTotal:editing.total,
        });
        else await queueKitchenOrder({
          tenantId,
          commandId:editing.id,
          customer:editing.tableLabel||editing.name,
          waiter:editing.waiterName,
          items:toReceiptItems(editing.items),
          total:editing.total,
          kind:`reprint_${Date.now()}`,
        });
      }else if(pendingChanges.length)await printOrderChange(editing.name,pendingChanges,editing.total,editing.waiterName);
      else await printKitchenTicket(editing.name,editing.items,editing.waiterName);
      setPendingChanges([]);
      setPrintChangeSent(true);
    }catch(error){
      setPrintChangeError(`Não foi possível enviar as alterações para impressão: ${error instanceof Error?error.message:"erro desconhecido"}`);
    }finally{
      setPrintingChanges(false);
    }
  };
  const changeItemQty=(command:IntegratedCommand,index:number,delta:number)=>{
    const item=command.items[index];
    if(delta>0){
      const product=products.find((p)=>p.name===item.name);
      if(product?.trackStock&&Number(product.stock||0)<=0)return;
    }
    const nextQty=item.qty+delta;
    const nextItems=nextQty<=0?command.items.filter((_,i)=>i!==index):command.items.map((it,i)=>i===index?{...it,qty:nextQty}:it);
    adjustStock([{name:item.name,qty:-delta}]);
    applyEdit(command,nextItems,{type:delta>0?"adicionado":"removido",name:item.name,qty:1,notes:item.detail});
  };
  const removeItem=(command:IntegratedCommand,index:number)=>{
    const item=command.items[index];
    adjustStock([{name:item.name,qty:item.qty}]);
    applyEdit(command,command.items.filter((_,i)=>i!==index),{type:"removido",name:item.name,qty:item.qty,notes:item.detail});
  };
  const addProductToCommand=(command:IntegratedCommand,product:Product,detail=""):void=>{
    if(product.trackStock&&Number(product.stock||0)<=0)return;
    const existingIndex=command.items.findIndex((item)=>item.name===product.name&&(item.detail||"")===detail);
    const nextItems=existingIndex>=0?command.items.map((item,i)=>i===existingIndex?{...item,qty:item.qty+1}:item):[...command.items,{name:product.name,qty:1,price:product.price,detail,delivered:false}];
    adjustStock([{name:product.name,qty:-1}]);
    applyEdit(command,nextItems,{type:"adicionado",name:product.name,qty:1,notes:detail||undefined});
  };
  const openAddProduct=(command:IntegratedCommand,product:Product)=>{
    if(usesPreparationPoint(product)){setEditDoneness("");setEditMeatNote("");setPendingEditMeat({command,product});return}
    setPendingProduct({command,product});
  };
  const setKitchenStatus=(id:number,kitchenStatus:"new"|"preparing"|"ready")=>
    setCommands((all)=>all.map((command)=>command.id===id?{...command,kitchenStatus}:command));
  const reprintCommand=(command:IntegratedCommand)=>{
    if(!tenantId){
      printKitchenTicket(command.name,command.items,command.waiterName);
      return;
    }
    queueKitchenOrder({
      tenantId,
      commandId:command.id,
      customer:command.tableLabel||command.name,
      waiter:command.waiterName,
      items:toReceiptItems(command.items),
      total:command.total,
      kind:`reprint_${Date.now()}`,
    }).catch((error)=>console.error("Não foi possível colocar a reimpressão na fila:",error));
  };
  const kitchenColumns=[
    {id:"new" as const,title:"NOVAS",description:"Aguardando início",commands:commands.filter((command)=>(command.kitchenStatus||"new")==="new")},
    {id:"preparing" as const,title:"PREPARANDO",description:"Em produção",commands:commands.filter((command)=>command.kitchenStatus==="preparing")},
    {id:"ready" as const,title:"PRONTAS",description:"Finalizadas",commands:commands.filter((command)=>command.kitchenStatus==="ready")},
    {id:"cancelled" as const,title:"CANCELADAS",description:"Canceladas no delivery",commands:commands.filter((command)=>command.kitchenStatus==="cancelled")},
  ];
  const openCommandsCount=commands.filter((command)=>command.kitchenStatus!=="cancelled").length;
  return <div className="integrated-view">
    <div className="integrated-heading"><div><p>OPERAÇÃO · TEMPO REAL</p><h1>Comandas abertas</h1><span>Acompanhe preparo, entrega, impressão e cobrança sem sair do cardápio.</span></div><b>{openCommandsCount} abertas</b></div>
    {!commands.length ? <div className="integrated-empty"><ShoppingBag/><h3>Nenhuma comanda aberta</h3><p>Adicione itens pelo cardápio e escolha “Salvar comanda”.</p></div> :
    <div className="kitchen-board">{kitchenColumns.map((column)=><section className={`kitchen-column ${column.id}`} key={column.id}>
      <header className="kitchen-column-head"><div><b>{column.title}</b><span>{column.commands.length}</span></div><small>{column.description}</small></header>
      <div className="kitchen-column-list">{column.commands.length?column.commands.map((command)=><article className="kitchen-command-card" key={command.id}>
        <header><div><small>COMANDA #{String(command.id).slice(-6)} · HÁ {Math.max(1,Math.round((Date.now()-command.createdAt)/60000))} MIN</small><h2>{command.name}</h2>{command.waiterName&&<small>GARÇOM: {command.waiterName}</small>}</div><strong>R$ {command.total.toFixed(2).replace(".",",")}</strong></header>
        <span className={`command-print-status ${printStatuses[command.id]||"checking"}`}>{
          printStatuses[command.id]==="printed"?"✓ IMPRESSA":
          printStatuses[command.id]==="failed"?"! FALHA NA IMPRESSÃO":
          printStatuses[command.id]==="processing"?"IMPRIMINDO":
          printStatuses[command.id]==="pending"?"NA FILA DA IMPRESSORA":"VERIFICANDO IMPRESSÃO"
        }</span>
        {column.id==="cancelled"&&<div className="command-cancelled-notice"><X/> <b>{command.cancelledBy==="customer"?"CANCELADO PELO CLIENTE":"PEDIDO CANCELADO"}</b></div>}
        {command.delivery?.fulfillment==="delivery"&&<div className="command-delivery is-delivery">
          <b><Truck/>ENTREGA · DELIVERY</b>
          {command.delivery.phone&&<span><Phone/>{command.delivery.phone}</span>}
          {deliveryAddress(command.delivery)&&<span><MapPin/>{deliveryAddress(command.delivery)}</span>}
          {command.delivery.notes&&<small>OBS.: {command.delivery.notes}</small>}
        </div>}
        <div className="command-products">{command.items.map((item,index)=><label key={`${item.name}-${index}`}><input type="checkbox" disabled={column.id==="cancelled"} checked={item.delivered} onChange={()=>setCommands((all)=>all.map((c)=>c.id===command.id?{...c,items:c.items.map((x,i)=>i===index?{...x,delivered:!x.delivered}:x)}:c))}/><span><b>{item.qty}×</b> {item.name}{item.detail&&<small>{item.detail}</small>}</span><em>{column.id==="cancelled"?"Cancelado":item.delivered?"Entregue":column.id==="ready"?"Pronto":column.id==="new"?"Novo":"Preparando"}</em></label>)}</div>
        <div className="kitchen-flow-actions">
          {column.id==="new"&&<button className="flow-main" onClick={()=>setKitchenStatus(command.id,"preparing")}>INICIAR PREPARO</button>}
          {column.id==="preparing"&&<><button onClick={()=>setKitchenStatus(command.id,"new")}>VOLTAR</button><button className="flow-main" onClick={()=>setKitchenStatus(command.id,"ready")}>MARCAR PRONTO</button></>}
          {column.id==="ready"&&<><button onClick={()=>setKitchenStatus(command.id,"preparing")}>VOLTAR</button><button className="flow-main" onClick={()=>onCharge(command)}>COBRAR / FINALIZAR</button></>}
        </div>
        {column.id!=="cancelled"?<footer><button onClick={()=>{setEditing(command);setEditCategory((current)=>current||editCategories[0]||"")}}>EDITAR</button><button onClick={()=>reprintCommand(command)}>REIMPRIMIR</button><button className="danger" onClick={()=>setConfirmation({action:"cancel",command})}>CANCELAR</button></footer>:<footer><button className="danger" onClick={()=>setConfirmation({action:"dismiss",command})}>REMOVER DA LISTA</button></footer>}
      </article>):<div className="kitchen-column-empty"><ShoppingBag/><span>Nenhuma comanda</span></div>}</div>
    </section>)}</div>}
    {confirmation&&<div className="modal-backdrop" onMouseDown={()=>setConfirmation(null)}><section className="modal confirmation-modal" onMouseDown={(event)=>event.stopPropagation()}>
      <button className="modal-close" onClick={()=>setConfirmation(null)} aria-label="Fechar"><X/></button>
      <span className="modal-icon">{confirmation.action==="print"?<ShoppingBag/>:<X/>}</span>
      <h3>{confirmation.action==="print"?"Confirmar impressão":confirmation.action==="dismiss"?"Remover da lista":"Cancelar comanda"}</h3>
      <p>{confirmation.action==="print"?`Você tem certeza que deseja imprimir a comanda de ${confirmation.command.name}?`:confirmation.action==="dismiss"?`Remover o cartão cancelado de ${confirmation.command.name}? O pedido continuará salvo no histórico.`:`Você tem certeza que deseja cancelar a comanda de ${confirmation.command.name}? Esta ação não poderá ser desfeita.`}</p>
      <div className="confirmation-actions"><button onClick={()=>setConfirmation(null)}>VOLTAR</button><button className={confirmation.action==="print"?"primary":"danger-confirm"} onClick={confirmAction}>{confirmation.action==="print"?"SIM, IMPRIMIR":confirmation.action==="dismiss"?"SIM, REMOVER":"SIM, CANCELAR"}</button></div>
    </section></div>}
    {editing&&<div className="modal-backdrop" onMouseDown={()=>setEditing(null)}><section className="modal edit-command-modal" onMouseDown={(event)=>event.stopPropagation()}>
      <button className="modal-close" onClick={()=>setEditing(null)} aria-label="Fechar"><X/></button>
      <span className="modal-icon"><ShoppingBag/></span>
      <h3>Editar comanda — {editing.name}</h3>
      {editing.items.length?<div className="cart-lines">{editing.items.map((item,index)=><div className="cart-line" key={`${item.name}-${index}`}>
        <div><b>{item.qty}×</b><span>{item.name}{item.detail&&<small>{item.detail}</small>}</span></div>
        <div className="cart-line-actions">
          <strong>R$ {(item.price*item.qty).toFixed(2).replace(".",",")}</strong>
          <div className="stepper">
            <button onClick={()=>changeItemQty(editing,index,-1)} aria-label="Remover um"><Minus/></button>
            <b>{item.qty}</b>
            <button onClick={()=>changeItemQty(editing,index,1)} aria-label="Adicionar mais um"><Plus/></button>
          </div>
          <button onClick={()=>removeItem(editing,index)} aria-label={`Remover ${item.name}`}><X size={15}/></button>
        </div>
      </div>)}</div>:<p className="empty">Todos os itens foram removidos desta comanda.</p>}
      <h3 className="add-product-heading">Adicionar produto</h3>
      <div className="pdv-categories">{editCategories.map((category)=><button key={category} className={editCategory===category?"active":""} onClick={()=>setEditCategory(category)}>{category}</button>)}</div>
      <div className="quick-products edit-quick-products">{products.filter((product)=>product.category===editCategory).map((product)=><button key={product.id} onClick={()=>openAddProduct(editing!,product)}><b>{product.name}</b><small>R$ {product.price.toFixed(2).replace(".",",")}</small></button>)}</div>
      <div className="cart-actions">
        <button onClick={()=>setEditing(null)}>FECHAR</button>
        <button className="primary" disabled={printingChanges} onClick={sendPendingChanges}>
          {printingChanges?"ENVIANDO PARA IMPRESSORA...":printChangeSent?"ENVIADO PARA IMPRESSÃO":pendingChanges.length?`IMPRIMIR ALTERAÇÕES (${pendingChanges.length})`:"REIMPRIMIR COMANDA"}
        </button>
      </div>
      {printChangeError&&<div className="drawer-form-alert" role="alert">{printChangeError}</div>}
    </section></div>}
    {pendingProduct&&<div className="modal-backdrop" onMouseDown={()=>setPendingProduct(null)}><section className="modal confirmation-modal" onMouseDown={(event)=>event.stopPropagation()}>
      <button className="modal-close" onClick={()=>setPendingProduct(null)} aria-label="Fechar"><X/></button>
      <span className="modal-icon"><ShoppingBag/></span>
      <h3>Adicionar produto</h3>
      <p>Você tem certeza que quer adicionar <b>{pendingProduct.product.name}</b> na comanda <b>{pendingProduct.command.name}</b>?</p>
      <div className="confirmation-actions"><button onClick={()=>setPendingProduct(null)}>VOLTAR</button><button className="primary" onClick={()=>{addProductToCommand(pendingProduct.command,pendingProduct.product);setPendingProduct(null)}}>SIM, ADICIONAR</button></div>
    </section></div>}
    {pendingEditMeat&&<div className="modal-backdrop" onMouseDown={()=>setPendingEditMeat(null)}><section className="modal" onMouseDown={(event)=>event.stopPropagation()}>
      <button className="modal-close" onClick={()=>setPendingEditMeat(null)} aria-label="Fechar"><X/></button>
      <span className="modal-icon"><Utensils/></span>
      <h3>Ponto de preparo</h3>
      <p><b>{pendingEditMeat.product.name}</b> — escolha como deseja o preparo para <b>{pendingEditMeat.command.name}</b>.</p>
      <div className="doneness-options">
        {["Mal passada","Ao ponto","Bem passada"].map((point)=>(
          <button key={point} className={editDoneness===point?"active":""} onClick={()=>setEditDoneness(point)}>{point}</button>
        ))}
      </div>
      <label className="meat-note">Observação (opcional)
        <textarea value={editMeatNote} onChange={(event)=>setEditMeatNote(event.target.value)} placeholder="Ex.: sem sal, sem farofa..." />
      </label>
      <div className="doneness-actions">
        <button className="secondary" onClick={()=>setEditDoneness("Sem ponto")}>SEM PONTO</button>
        <button className="primary" disabled={!editDoneness} onClick={()=>{
          const note=editMeatNote.trim();
          const detail=[editDoneness&&`Ponto: ${editDoneness}`,note&&`Obs.: ${note}`].filter(Boolean).join(" · ");
          addProductToCommand(pendingEditMeat.command,pendingEditMeat.product,detail);
          setPendingEditMeat(null);setEditDoneness("");setEditMeatNote("");
        }}>ADICIONAR</button>
      </div>
    </section></div>}
  </div>
}

type OperationsSyncView = { status:string; message:string; connected:boolean };

function SyncBadge({sync}:{sync:OperationsSyncView}) {
  return <span className={`sync-badge ${sync.connected?"online":sync.status==="error"?"offline":""}`}>
    {sync.connected?<Cloud/>:<CloudOff/>}{sync.message}
  </span>;
}

function IntegratedCash({sales,expenses,onAddExpense,onDeleteExpense,sync}:{sales:IntegratedSale[];expenses:IntegratedExpense[];onAddExpense:(description:string,amount:number)=>void;onDeleteExpense:(id:number)=>void;sync:OperationsSyncView}) {
  const [expenseOpen,setExpenseOpen]=useState(false);
  const [description,setDescription]=useState("");
  const [amount,setAmount]=useState("");
  const revenue=sales.reduce((s,x)=>s+x.total,0), costs=expenses.reduce((s,x)=>s+x.amount,0);
  const numericAmount=Number(amount.replace(",","."));
  const saveExpense=()=>{
    if(!description.trim()||!Number.isFinite(numericAmount)||numericAmount<=0)return;
    onAddExpense(description.trim(),numericAmount);
    setDescription("");setAmount("");setExpenseOpen(false);
  };
  return <div className="integrated-view"><div className="integrated-heading"><div><p>FINANCEIRO · TEMPO REAL</p><h1>Fluxo de caixa</h1><span>Entradas, custos e saldo da operação.</span><SyncBadge sync={sync}/></div><button onClick={()=>exportFinanceCsv(sales,expenses)}>EXPORTAR CSV</button></div>
    <div className="cash-summary"><article><small>Entradas</small><strong>R$ {revenue.toFixed(2).replace(".",",")}</strong></article><article><small>Saídas</small><strong className="red">R$ {costs.toFixed(2).replace(".",",")}</strong></article><article><small>Saldo</small><strong>R$ {(revenue-costs).toFixed(2).replace(".",",")}</strong></article></div>
    <div className="finance-panels"><section><h3>Vendas pagas</h3>{sales.length?sales.slice().reverse().map((sale)=><div className="finance-row" key={sale.id}><span>{sale.name}<small>{sale.method}</small></span><b>R$ {sale.total.toFixed(2).replace(".",",")}</b></div>):<p>Nenhuma venda finalizada.</p>}</section>
    <section><h3>Custos <button onClick={()=>setExpenseOpen(true)}>+ NOVO CUSTO</button></h3>{expenses.length?expenses.slice().reverse().map((e)=><div className="finance-row expense-row" key={e.id}><span>{e.description}<small>{new Date(e.createdAt).toLocaleDateString("pt-BR")}</small></span><b className="red">- R$ {e.amount.toFixed(2).replace(".",",")}</b><button className="expense-delete" onClick={()=>onDeleteExpense(e.id)} aria-label={`Excluir custo ${e.description}`}><Trash2/></button></div>):<p>Nenhum custo registrado.</p>}</section></div>
    {expenseOpen&&<div className="modal-backdrop" onMouseDown={()=>setExpenseOpen(false)}><section className="modal expense-modal" onMouseDown={event=>event.stopPropagation()}>
      <button className="modal-close" onClick={()=>setExpenseOpen(false)} aria-label="Fechar"><X/></button>
      <span className="modal-icon"><Banknote/></span><h3>Novo custo</h3><p>Registre uma saída para manter o caixa e os relatórios atualizados.</p>
      <label className="expense-field">Descrição<input autoFocus value={description} onChange={event=>setDescription(event.target.value)} placeholder="Ex.: compra de carvão"/></label>
      <label className="expense-field">Valor (R$)<input inputMode="decimal" value={amount} onChange={event=>setAmount(event.target.value)} placeholder="0,00"/></label>
      <div className="confirmation-actions"><button onClick={()=>setExpenseOpen(false)}>CANCELAR</button><button className="primary" disabled={!description.trim()||!Number.isFinite(numericAmount)||numericAmount<=0} onClick={saveExpense}>SALVAR CUSTO</button></div>
    </section></div>}
  </div>
}

function IntegratedReports({sales,expenses,commands,sync}:{sales:IntegratedSale[];expenses:IntegratedExpense[];commands:IntegratedCommand[];sync:OperationsSyncView}) {
  const brl=(v:number)=>`R$ ${v.toFixed(2).replace(".",",")}`;
  type Period="today"|"7d"|"30d"|"month"|"custom";
  const [period,setPeriod]=useState<Period>("today");
  const toISO=(d:Date)=>{const z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,10)};
  const today=new Date();
  const [customFrom,setCustomFrom]=useState(toISO(today));
  const [customTo,setCustomTo]=useState(toISO(today));

  const range=useMemo(()=>{
    const end=new Date();end.setHours(23,59,59,999);
    const start=new Date();start.setHours(0,0,0,0);
    if(period==="today"){/* start=hoje */}
    else if(period==="7d"){start.setDate(start.getDate()-6)}
    else if(period==="30d"){start.setDate(start.getDate()-29)}
    else if(period==="month"){start.setDate(1)}
    else if(period==="custom"){
      const f=new Date(customFrom+"T00:00:00");
      const t=new Date(customTo+"T23:59:59");
      if(!isNaN(f.getTime()))start.setTime(f.getTime());
      if(!isNaN(t.getTime()))end.setTime(t.getTime());
    }
    return {start:start.getTime(),end:end.getTime()};
  },[period,customFrom,customTo]);

  const inRange=(ts:number)=>ts>=range.start&&ts<=range.end;
  const periodSales=sales.filter((s)=>inRange(s.createdAt));
  const periodExpenses=expenses.filter((e)=>inRange(e.createdAt));
  const revenue=periodSales.reduce((s,x)=>s+x.total,0);
  const costs=periodExpenses.reduce((s,x)=>s+x.amount,0);
  const profit=revenue-costs;

  const methodKeys=["Dinheiro","PIX","Cartão Crédito","Cartão Débito"] as const;
  const byMethod=Object.fromEntries(methodKeys.map((m)=>[m,{total:0,count:0}])) as Record<string,{total:number;count:number}>;
  periodSales.forEach((s)=>{const key=methodKeys.includes(s.method as typeof methodKeys[number])?s.method:"Dinheiro";byMethod[key].total+=s.total;byMethod[key].count+=1});

  const grouped=new Map<string,{qty:number;revenue:number}>();
  periodSales.flatMap((s)=>s.items).forEach((i)=>{const old=grouped.get(i.name)||{qty:0,revenue:0};grouped.set(i.name,{qty:old.qty+i.qty,revenue:old.revenue+i.qty*i.price})});
  const ranking=Array.from(grouped.entries()).sort((a,b)=>b[1].qty-a[1].qty);
  const topRevenue=ranking[0]?.[1].qty||1;

  const dateFmt=(ts:number)=>new Date(ts).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
  const shortDate=(ts:number)=>new Date(ts).toLocaleDateString("pt-BR");

  const periodLabel=period==="today"?`Hoje · ${shortDate(range.start)}`
    :period==="7d"?`Últimos 7 dias · ${shortDate(range.start)} a ${shortDate(range.end)}`
    :period==="30d"?`Últimos 30 dias · ${shortDate(range.start)} a ${shortDate(range.end)}`
    :period==="month"?`Mês atual · ${shortDate(range.start)} a ${shortDate(range.end)}`
    :`Personalizado · ${shortDate(range.start)} a ${shortDate(range.end)}`;

  const periodTags:{key:Period;label:string}[]=[
    {key:"today",label:"Hoje"},
    {key:"7d",label:"Últimos 7 dias"},
    {key:"30d",label:"Últimos 30 dias"},
    {key:"month",label:"Mês atual"},
    {key:"custom",label:"Personalizado"},
  ];

  return <div className="integrated-view">
    <div className="integrated-heading">
      <div><p>ANÁLISE · {periodLabel.toUpperCase()}</p><h1>Relatórios</h1><span>Recebimentos por forma de pagamento, vendas e custos no período.</span><SyncBadge sync={sync}/></div>
      <button onClick={()=>generateReportPdf({periodLabel,sales:periodSales,expenses:periodExpenses,pendingCommands:commands.length})}>IMPRIMIR RELATÓRIO</button>
    </div>

    <div className="report-period">
      <div className="period-tags">
        {periodTags.map((t)=><button key={t.key} className={period===t.key?"active":""} onClick={()=>setPeriod(t.key)}>{t.label}</button>)}
      </div>
      {period==="custom" && <div className="period-custom">
        <label>De <input type="date" value={customFrom} max={customTo} onChange={(e)=>setCustomFrom(e.target.value)}/></label>
        <label>Até <input type="date" value={customTo} min={customFrom} onChange={(e)=>setCustomTo(e.target.value)}/></label>
      </div>}
    </div>

    <div className="method-summary">
      {methodKeys.map((m)=><article key={m}><small>{m}</small><strong>{brl(byMethod[m].total)}</strong><span>{byMethod[m].count} {byMethod[m].count===1?"venda":"vendas"}</span></article>)}
    </div>

    <div className="cash-summary report-summary">
      <article><small>Entradas</small><strong>{brl(revenue)}</strong></article>
      <article><small>Saídas</small><strong className="red">{brl(costs)}</strong></article>
      <article><small>Lucro</small><strong>{brl(profit)}</strong></article>
      <article><small>Vendas</small><strong>{periodSales.length}</strong></article>
    </div>

    <div className="finance-panels reports-panels">
      <section>
        <h3>Produtos mais vendidos</h3>
        {ranking.length?ranking.map(([name,data],i)=><div className="rank-row" key={name}><b>{i+1}</b><span>{name}<i style={{width:`${Math.max(16,(data.qty/topRevenue)*100)}%`}}/></span><strong>{data.qty} un.</strong></div>):<p>Nenhuma venda no período.</p>}
      </section>
      <section>
        <h3>Vendas</h3>
        {periodSales.length?periodSales.slice().reverse().map((s)=><div className="finance-row" key={s.id}><span>{s.name}<small>{dateFmt(s.createdAt)} · {s.method}</small></span><b>{brl(s.total)}</b></div>):<p>Nenhuma venda registrada.</p>}
      </section>
      <section>
        <h3>Custos</h3>
        {periodExpenses.length?periodExpenses.slice().reverse().map((e)=><div className="finance-row" key={e.id}><span>{e.description}<small>{dateFmt(e.createdAt)}</small></span><b className="red">- {brl(e.amount)}</b></div>):<p>Nenhum custo registrado.</p>}
      </section>
      <section>
        <h3>Resumo operacional</h3>
        <div className="report-metric"><span>Ticket médio</span><b>{brl(periodSales.length?revenue/periodSales.length:0)}</b></div>
        <div className="report-metric"><span>Margem</span><b>{revenue?(((profit)/revenue)*100).toFixed(1):"0"}%</b></div>
        <div className="report-metric"><span>Itens vendidos</span><b>{periodSales.flatMap((s)=>s.items).reduce((n,i)=>n+i.qty,0)}</b></div>
        <div className="report-metric"><span>Comandas pendentes</span><b>{commands.length}</b></div>
      </section>
    </div>
  </div>
}

function escapePrintHtml(value:unknown){return String(value??"").replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]||char))}
function receiptHtml(title:string,customer:string,items:{name:string;qty:number;price:number;detail?:string}[],total?:number,method?:string){
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapePrintHtml(title)}</title><style>body{font:14px monospace;width:72mm;margin:0 auto;padding:8mm 2mm;color:#000}h2{text-align:center;margin:4px 0}hr{border:0;border-top:1px dashed #000}.item{display:flex;justify-content:space-between;margin:7px 0}.detail{display:block;font-size:12px;margin:2px 0 8px 18px}.total{font-size:20px;font-weight:bold;text-align:right}@media print{button{display:none}}</style></head><body><h2>${escapePrintHtml(title)}</h2><p>${new Date().toLocaleString("pt-BR")}</p><hr><b>Mesa/Cliente: ${escapePrintHtml(customer)}</b><hr>${items.map(i=>`<div class="item"><span>${Number(i.qty)||0}x ${escapePrintHtml(i.name)}</span><span>${total!==undefined?`R$ ${((Number(i.qty)||0)*(Number(i.price)||0)).toFixed(2)}`:""}</span></div>${i.detail?`<span class="detail">${escapePrintHtml(i.detail)}</span>`:""}`).join("")}${total!==undefined?`<hr><p class="total">TOTAL R$ ${Number(total).toFixed(2)}</p><p>Pagamento: ${escapePrintHtml(method||"-")}</p>`:""}<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script></body></html>`;
}
function openPrintDocument(html:string){const frame=document.createElement("iframe");frame.sandbox.add("allow-scripts","allow-modals");frame.style.position="fixed";frame.style.width="0";frame.style.height="0";frame.style.border="0";frame.srcdoc=html;document.body.appendChild(frame);setTimeout(()=>frame.remove(),2000)}
function toReceiptItems(items:{name:string;qty:number;price:number;detail?:string}[]){
  return items.map((item)=>({name:item.name,qty:item.qty,unitPrice:item.price,total:item.price*item.qty,notes:item.detail}));
}
// Tenta imprimir na impressora térmica via ponte local (print-helper); se a
// ponte não estiver rodando, cai para a impressão pelo navegador.
async function printKitchenTicket(customer:string,items:{name:string;qty:number;price:number;detail?:string}[],waiter?:string){
  try{
    await sendOrderTicketToPrinter({customer,waiter,items:toReceiptItems(items)});
  }catch(error){
    console.error("Impressão térmica indisponível, usando impressão do navegador:",error);
    openPrintDocument(receiptHtml("PEDIDO DA COZINHA",customer,items));
  }
}
async function printCustomerReceipt(sale:IntegratedSale){
  try{
    await sendReceiptToPrinter({customer:sale.name,items:toReceiptItems(sale.items),total:sale.total,paymentMethod:sale.method});
  }catch(error){
    console.error("Impressão térmica indisponível, usando impressão do navegador:",error);
    openPrintDocument(receiptHtml("COMPROVANTE",sale.name,sale.items,sale.total,sale.method));
  }
}
function orderChangeHtml(customer:string,changes:OrderChange[],newTotal?:number){
  const removed=changes.filter((c)=>c.type==="removido");
  const added=changes.filter((c)=>c.type==="adicionado");
  const list=(items:OrderChange[])=>items.map((c)=>`<div class="item">${Number(c.qty)||0}x ${escapePrintHtml(c.name)}</div>${c.notes?`<span class="detail">&gt;&gt; ${escapePrintHtml(c.notes)}</span>`:""}`).join("");
  const section=(title:string,items:OrderChange[])=>items.length?`<h3 class="sec">${title}</h3>${list(items)}`:"";
  return `<!doctype html><html><head><meta charset="utf-8"><title>ATUALIZAÇÃO</title><style>body{font:14px monospace;width:72mm;margin:0 auto;padding:8mm 2mm;color:#000}h2,h3{text-align:center;margin:4px 0}h3.sec{text-align:left;margin:10px 0 4px;border-bottom:1px dashed #000;padding-bottom:2px;font-size:14px}hr{border:0;border-top:1px dashed #000}.item{margin:5px 0}.detail{display:block;font-size:12px;margin:2px 0 6px 12px}.total{font-size:18px;font-weight:bold;text-align:right}@media print{button{display:none}}</style></head><body><h2>PEDIDO ATUALIZADO</h2><p>${new Date().toLocaleString("pt-BR")}</p><hr><b>Mesa/Cliente: ${escapePrintHtml(customer)}</b>${section("SAIU (removido)",removed)}${section("ENTROU (adicionado)",added)}${newTotal!==undefined?`<hr><p class="total">NOVO TOTAL R$ ${Number(newTotal).toFixed(2)}</p>`:""}<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script></body></html>`;
}
// Imprime só a MUDANÇA (item adicionado/removido numa comanda já aberta) — continua
// na mesma via física, sem repetir o pedido inteiro.
async function printOrderChange(customer:string,changes:OrderChange[],newTotal?:number,waiter?:string){
  try{
    await sendOrderUpdateToPrinter({customer,waiter,changes,newTotal});
  }catch(error){
    console.error("Impressão térmica indisponível, usando impressão do navegador:",error);
    openPrintDocument(orderChangeHtml(customer,changes,newTotal));
  }
}
function exportFinanceCsv(sales:IntegratedSale[],expenses:IntegratedExpense[]){const rows=["Tipo;Data;Descrição;Método;Valor",...sales.map(s=>`Entrada;${new Date(s.createdAt).toLocaleDateString("pt-BR")};${s.name};${s.method};${s.total.toFixed(2).replace(".",",")}`),...expenses.map(e=>`Saída;${new Date(e.createdAt).toLocaleDateString("pt-BR")};${e.description};;${e.amount.toFixed(2).replace(".",",")}`)];const blob=new Blob(["\uFEFF"+rows.join("\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="fluxo-caixa.csv";a.click();URL.revokeObjectURL(url)}
