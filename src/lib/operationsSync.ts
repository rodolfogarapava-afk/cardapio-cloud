import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/lib/supabase";

export type CloudCommand = {
  id: number;
  name: string;
  tableLabel?: string;
  waiterName?: string;
  source?: "waiter" | "delivery";
  count: number;
  total: number;
  createdAt: number;
  kitchenStatus?: "new" | "preparing" | "ready" | "cancelled";
  cancelledBy?: "customer" | "store";
  cancelledAt?: string;
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
  tenantId?: string | null;
  commands: CloudCommand[];
  sales: CloudSale[];
  expenses: CloudExpense[];
  setCommands: Dispatch<SetStateAction<CloudCommand[]>>;
  setSales: Dispatch<SetStateAction<CloudSale[]>>;
  setExpenses: Dispatch<SetStateAction<CloudExpense[]>>;
  localReady: boolean;
  legacyStoragePrefix: string;
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
  const localChangePending = useRef(false);
  const refreshQueued = useRef(false);
  const lastLocalChangeAt = useRef(0);
  const remoteCommands = useRef(new Map<number, CloudCommand>());
  const remoteSales = useRef(new Map<number, CloudSale>());
  const remoteExpenses = useRef(new Map<number, CloudExpense>());
  const latest = useRef(params);
  latest.current = params;

  useEffect(() => {
    if (!supabase || !params.localReady) return;
    let cancelled = false;

    async function load() {
      setStatus("loading");
      const { data: membership, error: membershipError } = params.tenantId
        ? { data: { tenant_id: params.tenantId }, error: null }
        : await supabase!
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
      const loadedCommands = (commandsResult.data || []).map(row => row.payload as CloudCommand);
      const loadedSales = (salesResult.data || []).map(row => row.payload as CloudSale);
      const loadedExpenses = (expensesResult.data || []).map(row => row.payload as CloudExpense);
      remoteCommands.current = new Map(loadedCommands.map(item => [item.id, item]));
      remoteSales.current = new Map(loadedSales.map(item => [item.id, item]));
      remoteExpenses.current = new Map(loadedExpenses.map(item => [item.id, item]));
      // The cloud is authoritative even when a tenant has no rows. Falling back
      // to the previous local state here leaked demo/previous-store values into
      // newly created tenants and immediately uploaded them to Supabase.
      latest.current.setCommands(loadedCommands);
      latest.current.setSales(loadedSales);
      latest.current.setExpenses(loadedExpenses);
      hydrated.current = true;
      setStatus("synced");
      window.localStorage.removeItem(`${latest.current.legacyStoragePrefix}-commands`);
      window.localStorage.removeItem(`${latest.current.legacyStoragePrefix}-sales`);
      window.localStorage.removeItem(`${latest.current.legacyStoragePrefix}-expenses`);
      window.setTimeout(() => { applyingRemote.current = false; }, 0);
    }

    load();
    return () => { cancelled = true; };
  }, [params.localReady, params.tenantId]);

  useEffect(() => {
    if (!supabase || !tenantId || !hydrated.current) return;
    if (applyingRemote.current) return;
    localChangePending.current = true;
    lastLocalChangeAt.current = Date.now();
    const timer = window.setTimeout(async () => {
      if (applyingRemote.current) {
        localChangePending.current = false;
        return;
      }
      setStatus("loading");
      const current = latest.current;
      const changedCommands = current.commands.filter(command =>
        JSON.stringify(remoteCommands.current.get(command.id)) !== JSON.stringify(command));
      const changedSales = current.sales.filter(sale =>
        JSON.stringify(remoteSales.current.get(sale.id)) !== JSON.stringify(sale));
      const changedExpenses = current.expenses.filter(expense =>
        JSON.stringify(remoteExpenses.current.get(expense.id)) !== JSON.stringify(expense));
      const removedCommandIds = [...remoteCommands.current.keys()]
        .filter(id => !current.commands.some(command => command.id === id));
      const removedSaleIds = [...remoteSales.current.keys()]
        .filter(id => !current.sales.some(sale => sale.id === id));
      const removedExpenseIds = [...remoteExpenses.current.keys()]
        .filter(id => !current.expenses.some(expense => expense.id === id));

      const upsertCommands = changedCommands.length
        ? supabase!.from("restaurant_commands").upsert(changedCommands.map(command => ({
            tenant_id: tenantId, id: command.id, payload: command, updated_at: new Date().toISOString(),
          })))
        : Promise.resolve({ error: null });
      const upsertSales = changedSales.length
        ? supabase!.from("restaurant_sales").upsert(changedSales.map(sale => ({
            tenant_id: tenantId, id: sale.id, customer_name: sale.name, amount: sale.total,
            payment_method: sale.method, sold_at: new Date(sale.createdAt).toISOString(),
            payload: sale, updated_at: new Date().toISOString(),
          })))
        : Promise.resolve({ error: null });
      const upsertExpenses = changedExpenses.length
        ? supabase!.from("restaurant_expenses").upsert(changedExpenses.map(expense => ({
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
        localChangePending.current = false;
        setStatus("error");
        return;
      }

      const deleteKnown = async (table: string, ids: number[]) => {
        if (!ids.length) return { error: null };
        return supabase!.from(table).delete().eq("tenant_id", tenantId).in("id", ids);
      };
      const deletes = await Promise.all([
        deleteKnown("restaurant_commands", removedCommandIds),
        deleteKnown("restaurant_sales", removedSaleIds),
        deleteKnown("restaurant_expenses", removedExpenseIds),
      ]);
      localChangePending.current = false;
      if (deletes.some(result => result.error)) {
        setStatus("error");
      } else {
        remoteCommands.current = new Map(current.commands.map(item => [item.id, item]));
        remoteSales.current = new Map(current.sales.map(item => [item.id, item]));
        remoteExpenses.current = new Map(current.expenses.map(item => [item.id, item]));
        setStatus("synced");
        if (refreshQueued.current) {
          refreshQueued.current = false;
          window.dispatchEvent(new Event("operations-sync-refresh"));
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [params.commands, params.sales, params.expenses, tenantId]);

  useEffect(() => {
    if (!supabase || !tenantId) return;
    const refresh = async () => {
      // Não deixa um evento antigo da nuvem desfazer uma movimentação que
      // acabou de acontecer na tela (ex.: PRONTA -> PREPARANDO).
      if (localChangePending.current || Date.now()-lastLocalChangeAt.current<1200) {
        refreshQueued.current = true;
        return;
      }
      const current = latest.current;
      const [commandsResult, salesResult, expensesResult] = await Promise.all([
        supabase!.from("restaurant_commands").select("payload").eq("tenant_id", tenantId),
        supabase!.from("restaurant_sales").select("payload").eq("tenant_id", tenantId).order("sold_at"),
        supabase!.from("restaurant_expenses").select("payload").eq("tenant_id", tenantId).order("spent_at"),
      ]);
      if (commandsResult.error || salesResult.error || expensesResult.error) return;
      applyingRemote.current = true;
      const loadedCommands = (commandsResult.data || []).map(row => row.payload as CloudCommand);
      const loadedSales = (salesResult.data || []).map(row => row.payload as CloudSale);
      const loadedExpenses = (expensesResult.data || []).map(row => row.payload as CloudExpense);
      remoteCommands.current = new Map(loadedCommands.map(item => [item.id, item]));
      remoteSales.current = new Map(loadedSales.map(item => [item.id, item]));
      remoteExpenses.current = new Map(loadedExpenses.map(item => [item.id, item]));
      if (JSON.stringify(loadedCommands) !== JSON.stringify(current.commands)) current.setCommands(loadedCommands);
      if (JSON.stringify(loadedSales) !== JSON.stringify(current.sales)) current.setSales(loadedSales);
      if (JSON.stringify(loadedExpenses) !== JSON.stringify(current.expenses)) current.setExpenses(loadedExpenses);
      setStatus("synced");
      window.setTimeout(() => { applyingRemote.current = false; }, 0);
    };

    const channel = supabase.channel(`operations:${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_commands", filter: `tenant_id=eq.${tenantId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_sales", filter: `tenant_id=eq.${tenantId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_expenses", filter: `tenant_id=eq.${tenantId}` }, refresh)
      .subscribe();
    window.addEventListener("operations-sync-refresh", refresh);
    const poll = window.setInterval(refresh, 5000);
    return () => {
      supabase!.removeChannel(channel);
      window.removeEventListener("operations-sync-refresh", refresh);
      window.clearInterval(poll);
    };
  }, [tenantId]);

  return { status, message: messageFor(status), connected: status === "synced" };
}
