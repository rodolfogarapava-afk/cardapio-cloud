import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/cardapaio1/$slug")({
  head: () => ({
    meta: [
      { title: "Cardápio" },
      { name: "description", content: "Cardápio digital da loja." },
    ],
  }),
  component: LegacyCardapaioRedirect,
});

function LegacyCardapaioRedirect() {
  const { slug } = Route.useParams();
  const deliverySlug = slug === "sabor-arte" ? "proveu-espeto" : slug;
  return <Navigate to="/delivery/$slug" params={{ slug: deliverySlug }} replace />;
}
