import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/lib/supabase";

export type CloudProduct = {
  id: number;
  category: string;
  name: string;
  price: number;
  image: string;
  description: string;
  tag?: string;
  stock?: number;
  minStock?: number;
  trackStock?: boolean;
  preparationPointEnabled?: boolean;
};

type Params = {
  tenantId?: string | null;
  products: CloudProduct[];
  categories: string[];
  setProducts: Dispatch<SetStateAction<CloudProduct[]>>;
  setCategories: Dispatch<SetStateAction<string[]>>;
  ready: boolean;
  legacyStoragePrefix: string;
};

export function useCatalogSync(params: Params) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const hydrated = useRef(false);
  const applyingRemote = useRef(false);
  const latest = useRef(params);
  latest.current = params;

  useEffect(() => {
    if (!supabase || !params.ready) return;
    let cancelled = false;

    async function load() {
      const { data: membership, error: membershipError } = params.tenantId
        ? { data: { tenant_id: params.tenantId }, error: null }
        : await supabase!
          .from("tenant_memberships")
          .select("tenant_id")
          .limit(1)
          .maybeSingle();
      if (cancelled || membershipError || !membership?.tenant_id) return;

      const id = membership.tenant_id as string;
      setTenantId(id);
      const { data, error } = await supabase!
        .from("restaurant_catalogs")
        .select("products,categories")
        .eq("tenant_id", id)
        .maybeSingle();
      if (cancelled || error) {
        if (error) console.error("Não foi possível carregar o catálogo.", error);
        return;
      }

      if (data) {
        applyingRemote.current = true;
        latest.current.setProducts((data.products || []) as CloudProduct[]);
        latest.current.setCategories((data.categories || []) as string[]);
        window.setTimeout(() => { applyingRemote.current = false; }, 0);
      } else {
        const current = latest.current;
        const { error: seedError } = await supabase!
          .from("restaurant_catalogs")
          .insert({ tenant_id: id, products: current.products, categories: current.categories });
        if (seedError) {
          console.error("Não foi possível criar o catálogo na nuvem.", seedError);
          return;
        }
      }

      hydrated.current = true;
      window.localStorage.removeItem(`${params.legacyStoragePrefix}-products`);
      window.localStorage.removeItem(`${params.legacyStoragePrefix}-categories`);
    }

    load();
    return () => { cancelled = true; };
  }, [params.ready, params.tenantId, params.legacyStoragePrefix]);

  useEffect(() => {
    if (!supabase || !tenantId || !hydrated.current || applyingRemote.current) return;
    const timer = window.setTimeout(async () => {
      const current = latest.current;
      const { error } = await supabase!
        .from("restaurant_catalogs")
        .upsert({
          tenant_id: tenantId,
          products: current.products,
          categories: current.categories,
          updated_at: new Date().toISOString(),
        });
      if (error) console.error("Não foi possível salvar o catálogo.", error);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [params.products, params.categories, tenantId]);

  useEffect(() => {
    if (!supabase || !tenantId) return;
    const refresh = async () => {
      const { data, error } = await supabase!
        .from("restaurant_catalogs")
        .select("products,categories")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error || !data) return;
      const current = latest.current;
      const remoteProducts = (data.products || []) as CloudProduct[];
      const remoteCategories = (data.categories || []) as string[];
      applyingRemote.current = true;
      if (JSON.stringify(remoteProducts) !== JSON.stringify(current.products)) current.setProducts(remoteProducts);
      if (JSON.stringify(remoteCategories) !== JSON.stringify(current.categories)) current.setCategories(remoteCategories);
      window.setTimeout(() => { applyingRemote.current = false; }, 0);
    };

    const channel = supabase!
      .channel(`catalog:${tenantId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "restaurant_catalogs",
        filter: `tenant_id=eq.${tenantId}`,
      }, refresh)
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [tenantId]);
}
