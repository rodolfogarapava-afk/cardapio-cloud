import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import Cardapio from "./pages/Cardapio";
import Checkout from "./pages/Checkout";
import PedidoConfirmado from "./pages/PedidoConfirmado";
import MeusPedidos from "./pages/MeusPedidos";
import { DELIVERY_NAVIGATION_EVENT, DeliveryNavigationDetail } from "@/lib/deliveryNavigation";

const queryClient = new QueryClient();

function getInitialDeliveryRoute() {
  const route = window.location.hash.replace(/^#/, "");
  return route.startsWith("/") ? route : "/cardapio/sabor-arte";
}

function InternalUrlSync() {
  const location = useLocation();

  useEffect(() => {
    const nextHash = `#${location.pathname}${location.search}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(window.history.state, "", nextHash);
    }
  }, [location.pathname, location.search]);

  return null;
}

function ClientCardapioTheme() {
  useEffect(() => {
    document.documentElement.classList.add("client-cardapio-theme");
    return () => document.documentElement.classList.remove("client-cardapio-theme");
  }, []);

  return <Cardapio />;
}

function ClientCheckoutTheme() {
  useEffect(() => {
    document.documentElement.classList.add("client-cardapio-theme");
    return () => document.documentElement.classList.remove("client-cardapio-theme");
  }, []);

  return <Checkout />;
}

function ClientOrderTheme() {
  useEffect(() => {
    document.documentElement.classList.add("client-cardapio-theme");
    return () => document.documentElement.classList.remove("client-cardapio-theme");
  }, []);

  return <PedidoConfirmado />;
}

function ClientOrdersTheme() {
  useEffect(() => {
    document.documentElement.classList.add("client-cardapio-theme");
    return () => document.documentElement.classList.remove("client-cardapio-theme");
  }, []);

  return <MeusPedidos />;
}

const App = () => {
  const [navigation, setNavigation] = useState(() => ({
    path: getInitialDeliveryRoute(),
    state: undefined as unknown,
    key: 0,
  }));

  useEffect(() => {
    const handleNavigation = (event: Event) => {
      const detail = (event as CustomEvent<DeliveryNavigationDetail>).detail;
      if (!detail?.path?.startsWith("/")) return;
      setNavigation(current => ({ path: detail.path, state: detail.state, key: current.key + 1 }));
    };
    window.addEventListener(DELIVERY_NAVIGATION_EVENT, handleNavigation);
    return () => window.removeEventListener(DELIVERY_NAVIGATION_EVENT, handleNavigation);
  }, []);

  const routeUrl = new URL(navigation.path, window.location.origin);
  const initialEntry = {
    pathname: routeUrl.pathname,
    search: routeUrl.search,
    state: navigation.state,
  };

  return <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <MemoryRouter key={navigation.key} initialEntries={[initialEntry]}>
              <div>
                <InternalUrlSync />
                <Routes>
                  <Route path="/" element={<Navigate to="/cardapio/sabor-arte" replace />} />
                  <Route path="/cardapio/:vendorSlug" element={<ClientCardapioTheme />} />
                  <Route path="/checkout/:vendorSlug" element={<ClientCheckoutTheme />} />
                  <Route path="/pedido-confirmado" element={<ClientOrderTheme />} />
                  <Route path="/pedido/:orderNumber" element={<ClientOrderTheme />} />
                  <Route path="/pedidos/:vendorSlug" element={<ClientOrdersTheme />} />
                  <Route path="*" element={<Navigate to="/cardapio/sabor-arte" replace />} />
                </Routes>
              </div>
            </MemoryRouter>
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>;
};

export default App;
