import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/delivery/$slug")({
  head: () => ({
    meta: [
      { title: "Cardápio delivery" },
      { name: "description", content: "Faça seu pedido online." },
    ],
  }),
  component: DeliveryMenuPage,
});

function DeliveryMenuPage() {
  const { slug } = Route.useParams();
  const visualSlug = slug === "proveu-espeto" ? "sabor-arte" : slug;

  return (
    <main style={{ width: "100%", height: "100dvh", overflow: "hidden", background: "#fff" }}>
      <iframe
        src={`/alimentacao-app/index.html#/cardapio/${encodeURIComponent(visualSlug)}`}
        title="Cardápio delivery"
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
      />
    </main>
  );
}
