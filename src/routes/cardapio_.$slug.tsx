import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import { supabase } from "@/lib/supabase";
import PublicDeliveryMenu from "@/components/PublicDeliveryMenu";
import type { Product } from "./index";

type PublicCatalog = {
  tenantId: string;
  tenantName: string;
  products: Product[];
  categories: string[];
};

export const Route = createFileRoute("/cardapio_/$slug")({
  head: () => ({
    meta: [
      { title: "Cardápio digital" },
      { name: "description", content: "Escolha seus produtos e faça seu pedido." },
    ],
  }),
  component: TenantPublicMenu,
});

function TenantPublicMenu() {
  const { slug } = Route.useParams();
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) {
        setError("O cardápio está temporariamente indisponível.");
        return;
      }
      const { data, error: requestError } = await supabase.rpc("get_public_menu", { p_slug: slug });
      if (!active) return;
      if (requestError || !data) {
        setError("Este cardápio não existe ou o delivery não está ativo.");
        return;
      }
      setCatalog(data as PublicCatalog);
    }
    load();
    return () => { active = false; };
  }, [slug]);

  if (error) {
    return <main className="public-menu-state"><Store/><h1>Cardápio indisponível</h1><p>{error}</p></main>;
  }
  if (!catalog) {
    return <main className="public-menu-state"><span className="public-menu-loader"/><h1>Carregando cardápio</h1><p>Aguarde um instante.</p></main>;
  }
  return <PublicDeliveryMenu catalog={catalog}/>;
}
