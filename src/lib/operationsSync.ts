import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/lib/supabase";

export type CloudCommand = {
  id: number;
  name: string;
  count: number;
  total: number;
  createdAt: number;
  items: { name: string; qty: number; price: number; detail?: string; delivered: boolean }[];
};

export type CloudSale = {
  id: number;
  name: string;
  total: number;
  method: string;
  createdAt: number;
  items: { name: string; qty: number; price: number; detail?: string }[];
};

export type CloudExpense = {
  id: number;
  description: string;
  amount: number;
  createdAt: number;
};

type SyncStatus = "local" | "loading" | "synced" | "error";

type Params = {
  commands: CloudCommand[];
  sales: CloudSale[];
  expenses: CloudExpense[];
  setCommands: Dispatch<SetStateAction<CloudCommand[]>>;
  setSales: Dispatch<SetStateAction<CloudSale[]>>;
  setExpenses: Dispatch<SetStateAction<CloudExpense[]>>;
  localReady: boolean;
};

const messageFor = (status: SyncStatus) => ({
  local: "Dados salvos neste dispositivo",
  loading: "Conectando ao caixa na nuvem...",
  synced: "Supabase sincronizado",
  error: "Modo local — sincronização pendente",
}[status]);

export function useOperationsSync(params: Params) {
  const [status, setStatus] = useState<SyncStatus>(supabase ? "loading" : "local");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const hydrated = useRef(false);
  const applyingRemote = useRef(false);
  const latest = useRef(params);
  latest.current = params;

  useEffect(() => {
    if (!supabase || !params.localReady) return;
    let cancelled = false;

    async function load() {
      setStatus("loading");
      const { data: membership, error: membershipError } = await supabase!
        .from("tenant_memberships")
        .select("tenant_id")
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (membershipError || !membership?.tenant_id) {
        console.error("Estabelecimento não encontrado para o usuário.", membershipError);
        setStatus("error");
        return;
      }

      const id = membership.tenant_id as string;
      setTenantId(id);
      const [commandsResult, salesResult, expensesResult] = await Promise.all([
        supabase!.from("restaurant_commands").select("payload").eq("tenant_id", id),
        supabase!.from("restaurant_sales").select("payload").eq("tenant_id", id).order("sold_at"),
        supabase!.from("restaurant_expenses").select("payload").eq("tenant_id", id).order("spent_at"),
      ]);
      if (cancelled) return;
      const error = commandsResult.error || salesResult.error || expensesResult.error;
      if (error) {
        console.error("Não foi possível carregar o financeiro.", error);
        setStatus("error");
        return;
      }

      applyingRemote.current = true;
      const remoteCommands = (commandsResult.data || []).map(row => row.payload as CloudCommand);
      const remoteSales = (salesResult.data || []).map(row => row.payload as CloudSale);
      const remoteExpenses = (expensesResult.data || []).map(row => row.payload as CloudExpense);
      latest.current.setCommands(remoteCommands.length ? remoteCommands : latest.current.commands);
      latest.current.setSales(remoteSales.length ? remoteSales : latest.current.sales);
      latest.current.setExpenses(remoteExpenses.length ? remoteExpenses : latest.current.expenses);
      hydrated.current = true;
      setStatus("synced");
      window.setTimeout(() => { applyingRemote.current = false; }, 0);
    }

    load();
    return () => { cancelled = true; };
  }, [params.localReady]);

  useEffect(() => {
    if (!supabase || !tenantId || !hydrated.current) return;
    const timer = window.setTimeout(async () => {
      if (applyingRemote.current) return;
      setStatus("loading");
      const current = latest.current;
      const upsertCommands = current.commands.length
        ? supabase!.from("restaurant_commands").upsert(current.commands.map(command => ({
            tenant_id: tenantId, id: command.id, payload: command, updated_at: new Date().toISOString(),
          })))
        : Promise.resolve({ error: null });
      const upsertSales = current.sales.length
        ? supabase!.from("restaurant_sales").upsert(current.sales.map(sale => ({
            tenant_id: tenantId, id: sale.id, customer_name: sale.name, amount: sale.total,
            payment_method: sale.method, sold_at: new Date(sale.createdAt).toISOString(),
            payload: sale, updated_at: new Date().toISOString(),
          })))
        : Promise.resolve({ error: null });
      const upsertExpenses = current.expenses.length
        ? supabase!.from("restaurant_expenses").upsert(current.expenses.map(expense => ({
            tenant_id: tenantId, id: expense.id, description: expense.description, amount: expense.amount,
            spent_at: new Date(expense.createdAt).toISOString(), payload: expense,
            updated_at: new Date().toISOString(),
          })))
        : Promise.resolve({ error: null });

      const [commandsResult, salesResult, expensesResult] = await Promise.all([
        upsertCommands, upsertSales, upsertExpenses,
      ]);
      const error = commandsResult.error || salesResult.error || expensesResult.error;
      if (error) {
        console.error("Falha ao sincronizar o financeiro.", error);
        setStatus("error");
        return;
      }

      const deleteMissing = async (table: string, ids: number[]) => {
        let query = supabase!.from(table).delete().eq("tenant_id", tenantId);
        if (ids.length) query = query.not("id", "in", `(${ids.join(",")})`);
        return query;
      };
      const deletes = await Promise.all([
        deleteMissing("restaurant_commands", current.commands.map(item => item.id)),
        deleteMissing("restaurant_sales", current.sales.map(item => item.id)),
        deleteMissing("restaurant_expenses", current.expenses.map(item => item.id)),
      ]);
      setStatus(deletes.some(result => result.error) ? "error" : "synced");
    }, 650);
    return () => window.clearTimeout(timer);
  }, [params.commands, params.sales, params.expenses, tenantId]);

  useEffect(() => {
    if (!supabase || !tenantId) return;
    const refresh = async () => {
      const current = latest.current;
      const [commandsResult, salesResult, expensesResult] = await Promise.all([
        supabase!.from("restaurant_commands").select("payload").eq("tenant_id", tenantId),
        supabase!.from("restaurant_sales").select("payload").eq("tenant_id", tenantId).order("sold_at"),
        supabase!.from("restaurant_expenses").select("payload").eq("tenant_id", tenantId).order("spent_at"),
      ]);
      if (commandsResult.error || salesResult.error || expensesResult.error) return;
      applyingRemote.current = true;
      const remoteCommands = (commandsResult.data || []).map(row => row.payload as CloudCommand);
      const remoteSales = (salesResult.data || []).map(row => row.payload as CloudSale);
      const remoteExpenses = (expensesResult.data || []).map(row => row.payload as CloudExpense);
      if (JSON.stringify(remoteCommands) !== JSON.stringify(current.commands)) current.setCommands(remoteCommands);
      if (JSON.stringify(remoteSales) !== JSON.stringify(current.sales)) current.setSales(remoteSales);
      if (JSON.stringify(remoteExpenses) !== JSON.stringify(current.expenses)) current.setExpenses(remoteExpenses);
      setStatus("synced");
      window.setTimeout(() => { applyingRemote.current = false; }, 0);
    };

    const channel = supabase.channel(`operations:${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_commands", filter: `tenant_id=eq.${tenantId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_sales", filter: `tenant_id=eq.${tenantId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_expenses", filter: `tenant_id=eq.${tenantId}` }, refresh)
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [tenantId]);

  return { status, message: messageFor(status), connected: status === "synced" };
}
