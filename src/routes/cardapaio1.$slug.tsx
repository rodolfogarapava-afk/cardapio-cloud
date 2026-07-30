import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import PublicDeliveryMenu from "@/components/PublicDeliveryMenu";
import { supabase } from "@/lib/supabase";
import type { Product } from "./index";
import "@/components/cardapaio1-delivery.css";

type PublicCatalog = {
  tenantId: string;
  tenantName: string;
  products: Product[];
  categories: string[];
};

export const Route = createFileRoute("/cardapaio1/$slug")({
  head: () => ({
    meta: [
      { title: "Cardápio" },
      { name: "description", content: "Cardápio digital da loja." },
    ],
  }),
  component: CardapaioDeliveryPage,
});

function CardapaioDeliveryPage() {
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      if (!supabase) {
        setError("O cardápio está temporariamente indisponível.");
        return;
      }

      const { data, error: requestError } = await supabase.rpc("get_public_menu", {
        p_slug: "proveu-espeto",
      });

      if (!active) return;
      if (requestError || !data) {
        setError("Não foi possível carregar o catálogo da loja.");
        return;
      }
      setCatalog(data as PublicCatalog);
    }

    loadCatalog();
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return <main className="public-menu-state"><Store /><h1>Cardápio indisponível</h1><p>{error}</p></main>;
  }

  if (!catalog) {
    return <main className="public-menu-state"><span className="public-menu-loader" /><h1>Carregando cardápio</h1><p>Aguarde um instante.</p></main>;
  }

  return <PublicDeliveryMenu catalog={catalog} variant="sabor-arte" />;
}
