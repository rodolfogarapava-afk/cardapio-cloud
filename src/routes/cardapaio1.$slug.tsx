import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cardapaio1/$slug")({
  head: () => ({
    meta: [
      { title: "Cardápio" },
      { name: "description", content: "Cardápio digital da loja." },
    ],
  }),
  component: CardapaioPreviewPage,
});

function CardapaioPreviewPage() {
  const { slug } = Route.useParams();

  return (
    <main style={{ width: "100%", height: "100dvh", overflow: "hidden", background: "#fff" }}>
      <iframe
        src={`/alimentacao-app/index.html#/cardapio/${encodeURIComponent(slug)}`}
        title="Cardápio"
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
      />
    </main>
  );
}
