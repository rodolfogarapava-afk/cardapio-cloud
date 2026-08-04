import { createFileRoute } from "@tanstack/react-router";
import AuthGate from "@/components/AuthGate";
import SaaSPlatform from "@/components/SaaSPlatform";
import { RestaurantApp } from "./index";

export const Route = createFileRoute("/cliente")({
  head: () => ({
    meta: [
      { title: "Área do Cliente — Cardápio Digital" },
      { name: "description", content: "Operação do restaurante: cardápio, comandas, caixa, relatórios e impressão." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ClientArea,
});

function ClientArea() {
  return (
    <AuthGate area="cliente">
      <SaaSPlatform area="cliente">
        <RestaurantApp />
      </SaaSPlatform>
    </AuthGate>
  );
}
