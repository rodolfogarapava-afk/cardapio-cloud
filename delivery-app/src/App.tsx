import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import Cardapio from "./pages/Cardapio";
import Checkout from "./pages/Checkout";
import PedidoConfirmado from "./pages/PedidoConfirmado";
import MeusPedidos from "./pages/MeusPedidos";

const queryClient = new QueryClient();

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <HashRouter>
              <div>
                <Routes>
                  <Route path="/" element={<Navigate to="/cardapio/sabor-arte" replace />} />
                  <Route path="/cardapio/:vendorSlug" element={<ClientCardapioTheme />} />
                  <Route path="/checkout/:vendorSlug" element={<ClientCheckoutTheme />} />
                  <Route path="/pedido-confirmado" element={<ClientOrderTheme />} />
                  <Route path="/pedido/:orderNumber" element={<ClientOrderTheme />} />
                  <Route path="/pedidos/:vendorSlug" element={<ClientOrdersTheme />} />
                </Routes>
              </div>
            </HashRouter>
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
