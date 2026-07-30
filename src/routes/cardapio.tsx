import { createFileRoute } from "@tanstack/react-router";
import AuthGate from "@/components/AuthGate";
import SaaSPlatform from "@/components/SaaSPlatform";
import { RestaurantApp } from "./index";

export const Route = createFileRoute("/cardapio")({
  head: () => ({
    meta: [
      { title: "Cardápio digital" },
      { name: "description", content: "Consulte o cardápio, escolha seus produtos e monte seu pedido." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PublicMenuRoute,
});

function PublicMenuRoute() {
  return (
    <AuthGate area="cliente">
      <SaaSPlatform area="cliente">
        <RestaurantApp publicMenu />
      </SaaSPlatform>
    </AuthGate>
  );
}
