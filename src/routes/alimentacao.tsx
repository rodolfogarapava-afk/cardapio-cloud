import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/alimentacao")({
  head: () => ({
    meta: [
      { title: "Alimentação" },
      { name: "description", content: "Encontre restaurantes e opções de alimentação." },
    ],
  }),
  component: AlimentacaoPage,
});

function AlimentacaoPage() {
  return (
    <main style={{ width: "100%", height: "100dvh", overflow: "hidden", background: "#fff" }}>
      <iframe
        src="/alimentacao-app/index.html"
        title="Alimentação"
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
      />
    </main>
  );
}
