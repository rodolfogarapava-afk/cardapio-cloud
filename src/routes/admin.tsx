import { createFileRoute } from "@tanstack/react-router";
import SaaSPlatform from "@/components/SaaSPlatform";
import { RestaurantApp } from "./index";
import AuthGate from "@/components/AuthGate";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração — Cardápio Digital" },
      {
        name: "description",
        content: "Administração de clientes, assinaturas, pagamentos e impressão do Cardápio Digital.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <AuthGate area="admin">
      <SaaSPlatform area="admin">
        <RestaurantApp />
      </SaaSPlatform>
    </AuthGate>
  );
}
