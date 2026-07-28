import { createFileRoute } from "@tanstack/react-router";
import SaaSPlatform from "@/components/SaaSPlatform";
import { RestaurantApp } from "./index";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração — Cardápio Cloud" },
      {
        name: "description",
        content: "Administração de clientes, assinaturas, pagamentos e impressão do Cardápio Cloud.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <SaaSPlatform>
      <RestaurantApp />
    </SaaSPlatform>
  );
}
