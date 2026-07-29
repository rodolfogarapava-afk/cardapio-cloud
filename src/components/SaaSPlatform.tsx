import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import QRCode from "react-qr-code";
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  Clock3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Users,
  Wifi,
  XCircle,
  Plus,
  Mail,
  KeyRound,
  Trash2,
  Download,
} from "lucide-react";
import "./saas-platform.css";
import { createIsolatedSupabaseClient, supabase } from "@/lib/supabase";
import { useAppAuth } from "@/components/AuthGate";
import { queuePrinterTest } from "@/lib/printQueue";

type SubscriptionStatus = "active" | "past_due" | "blocked" | "trial" | "canceled";
type Tenant = {
  id: string;
  name: string;
  owner: string;
  plan: string;
  monthly: number;
  status: SubscriptionStatus;
  due: string;
  orders: number;
  printer: "online" | "offline";
};
type PrintJob = {
  id: number | string;
  tenantId: string;
  label: string;
  destination: string;
  status: "printed" | "pending" | "failed";
  createdAt: number;
};

type TenantNavigation = {
  page: "operation" | "billing" | "printing";
  setPage: (page: "operation" | "billing" | "printing") => void;
  content: ReactNode;
  status: SubscriptionStatus;
  tenantId: string;
  tenantName: string;
  onExit: () => void;
};

const TenantNavigationContext = createContext<TenantNavigation | null>(null);
export const useTenantNavigation = () => useContext(TenantNavigationContext);

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusLabel(status: SubscriptionStatus) {
  return { active: "Em dia", past_due: "Em atraso", blocked: "Bloqueado", trial: "Teste grátis", canceled: "Cancelado" }[status];
}

export default function SaaSPlatform({ children, area = "auto" }: { children: ReactNode; area?: "admin" | "cliente" | "auto" }) {
  const auth = useAppAuth();
  const [role, setRole] = useState<"loading" | "master" | "tenant">("loading");
  const [tenantId, setTenantId] = useState("");
  const [tenantPage, setTenantPage] = useState<"operation" | "billing" | "printing">("operation");
  const [masterPage, setMasterPage] = useState<"overview" | "clients" | "billing" | "printing">("overview");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!supabase || !auth?.user) return;
    let cancelled=false;
    const formatDate=(date:string|null)=>date?new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR"):"—";
    const load=async()=>{
      setLoadError("");
      const {data:profile,error:profileError}=await supabase.from("profiles").select("platform_role").eq("id",auth.user.id).maybeSingle();
      if(cancelled)return;
      if(profileError){setLoadError("Não foi possível carregar o perfil administrativo.");return}
      const isMaster=profile?.platform_role==="super_admin";
      let query=supabase.from("tenants").select("id,name,owner_name,plan,monthly_fee,subscription_status,due_date,printer_status");
      if(!isMaster){
        const {data:membership}=await supabase.from("tenant_memberships").select("tenant_id").eq("user_id",auth.user.id).limit(1).maybeSingle();
        if(!membership?.tenant_id){setLoadError("Este usuário ainda não está vinculado a uma loja.");return}
        query=query.eq("id",membership.tenant_id);
      }
      const {data,error}=await query.order("created_at",{ascending:false});
      if(cancelled)return;
      if(error){setLoadError("Não foi possível carregar as lojas.");return}
      const mapped=(data||[]).map((row)=>({
        id:row.id,name:row.name,owner:row.owner_name||"Sem responsável",plan:row.plan,
        monthly:Number(row.monthly_fee),status:row.subscription_status as SubscriptionStatus,
        due:formatDate(row.due_date),orders:0,printer:row.printer_status as "online"|"offline",
      }));
      setTenants(mapped);
      if(area==="admin"){
        if(!isMaster){setLoadError("Este acesso é exclusivo para o administrador da plataforma.");return}
        setRole("master");
      } else if(area==="cliente"){
        const ownTenant = isMaster ? mapped[0] : mapped[0];
        if(!ownTenant){setLoadError("Este usuário ainda não está vinculado a uma loja.");return}
        setTenantId(ownTenant.id);setRole("tenant");
      } else if(isMaster)setRole("master");
      else {setTenantId(mapped[0]?.id||"");setRole("tenant")}
    };
    load();
    return()=>{cancelled=true};
  },[auth?.user.id,area]);

  const tenant = tenants.find((item) => item.id === tenantId) ?? tenants[0];
  const setTenantStatus = async (id: string, status: SubscriptionStatus) => {
    if(!supabase)return;
    const updates:Record<string,unknown>={subscription_status:status};
    if(status==="active"){const next=new Date();next.setMonth(next.getMonth()+1);updates.due_date=next.toISOString().slice(0,10)}
    const {error}=await supabase.from("tenants").update(updates).eq("id",id);
    if(error){setLoadError("Não foi possível alterar o acesso desta loja.");return}
    setTenants((all) => all.map((item) => item.id === id ? { ...item, status, due: status === "active" ? new Date(updates.due_date as string+"T12:00:00").toLocaleDateString("pt-BR") : item.due } : item));
  };
  const deleteTenant = async (tenant: Tenant) => {
    if(!supabase)return;
    const confirmed=window.confirm(`Excluir permanentemente a conta "${tenant.name}"?\n\nO acesso do cliente, cardápio, caixa, relatórios, comandas e demais dados da loja serão apagados. Esta ação não pode ser desfeita.`);
    if(!confirmed)return;
    setLoadError("");
    const {error}=await supabase.rpc("delete_client_account",{client_tenant_id:tenant.id});
    if(error){setLoadError(`Não foi possível excluir a conta: ${error.message}`);return}
    setTenants((all)=>all.filter((item)=>item.id!==tenant.id));
    setJobs((all)=>all.filter((job)=>job.tenantId!==tenant.id));
  };

  if(role==="loading")return <main className="saas-loading"><RefreshCw className="spin"/><h2>Carregando sua operação</h2><p>{loadError||"Consultando lojas e permissões no Supabase..."}</p></main>;

  if (role === "master") {
    return (
      <MasterConsole
        page={masterPage}
        setPage={setMasterPage}
        tenants={tenants}
        jobs={jobs}
        onStatus={setTenantStatus}
        onCreated={(created)=>setTenants(all=>[created,...all])}
        onUpdated={(updated)=>setTenants(all=>all.map(tenant=>tenant.id===updated.id?updated:tenant))}
        onDeleted={deleteTenant}
        onEnterTenant={(id) => { setTenantId(id); setRole("tenant"); setTenantPage("operation"); }}
        onExit={() => auth?.signOut()}
      />
    );
  }

  if (tenant.status === "blocked") {
    return <BlockedScreen tenant={tenant} onPaid={() => window.location.reload()} onExit={() => auth?.signOut()} />;
  }

  const tenantContent = tenantPage === "billing"
    ? <TenantBilling tenant={tenant} onBlock={() => setTenantStatus(tenant.id, "blocked")} />
    : tenantPage === "printing"
      ? <PrintingCenter tenant={tenant} jobs={jobs} setJobs={setJobs} />
      : null;

  return (
    <TenantNavigationContext.Provider value={{ page: tenantPage, setPage: setTenantPage, content: tenantContent, status: tenant.status, tenantId: tenant.id, tenantName: tenant.name, onExit: () => area==="auto"&&role==="tenant"&&auth?.user.email==="admin@admin.com"?setRole("master"):auth?.signOut() }}>
    <div className="saas-tenant-shell">
      {tenant.status === "past_due" && (
        <button className="saas-overdue-banner" onClick={() => setTenantPage("billing")}>
          <Clock3 /> Sua mensalidade venceu em {tenant.due}. Regularize para evitar a suspensão. <strong>Ver cobrança <ArrowRight /></strong>
        </button>
      )}
      {children}
    </div>
    </TenantNavigationContext.Provider>
  );
}

function DemoLanding({ onMaster, onTenant, onBlocked }: { onMaster: () => void; onTenant: () => void; onBlocked: () => void }) {
  return (
    <main className="saas-login">
      <div className="saas-login-glow" />
      <section className="saas-login-card">
        <div className="saas-brand"><span><ChefHat /></span><div><strong>Cardápio Cloud</strong><small>GESTÃO & PEDIDOS</small></div></div>
        <div className="saas-login-copy">
          <span className="saas-eyebrow"><ShieldCheck /> AMBIENTE DE DEMONSTRAÇÃO</span>
          <h1>Seu restaurante conectado, do pedido à cozinha.</h1>
          <p>Teste os três cenários do sistema: gestão da plataforma, operação do restaurante e bloqueio automático por inadimplência.</p>
        </div>
        <div className="saas-demo-options">
          <button onClick={onMaster}><span className="purple"><LayoutDashboard /></span><div><strong>Administrador da plataforma</strong><small>Clientes, planos, cobranças e impressoras</small></div><ArrowRight /></button>
          <button onClick={onTenant}><span className="yellow"><Store /></span><div><strong>Restaurante ativo</strong><small>Cardápio, PDV, caixa e operação</small></div><ArrowRight /></button>
          <button onClick={onBlocked}><span className="red"><QrCode /></span><div><strong>Cliente inadimplente</strong><small>Bloqueio, QR Code Pix e reativação</small></div><ArrowRight /></button>
        </div>
        <p className="saas-demo-note">Dados e pagamentos são simulados nesta versão de teste.</p>
      </section>
      <aside className="saas-login-preview">
        <span className="saas-live"><i /> PLATAFORMA ONLINE</span>
        <div className="saas-preview-window">
          <header><i /><i /><i /><small>app.cardapiocloud.com.br</small></header>
          <div className="saas-preview-stats">
            <article><Users /><span><b>24</b> clientes ativos</span></article>
            <article><CircleDollarSign /><span><b>R$ 3.247</b> receita mensal</span></article>
            <article><Activity /><span><b>1.842</b> pedidos hoje</span></article>
          </div>
          <div className="saas-preview-chart"><span style={{ height: "42%" }} /><span style={{ height: "57%" }} /><span style={{ height: "48%" }} /><span style={{ height: "72%" }} /><span style={{ height: "65%" }} /><span style={{ height: "88%" }} /><span style={{ height: "78%" }} /></div>
          <div className="saas-preview-order"><CheckCircle2 /><span><b>Novo pedido recebido</b><small>Deus Proveu · Mesa 07</small></span><em>agora</em></div>
        </div>
      </aside>
    </main>
  );
}

function MasterConsole({ page, setPage, tenants, jobs, onStatus, onEnterTenant, onExit, onCreated, onUpdated, onDeleted }: {
  page: "overview" | "clients" | "billing" | "printing";
  setPage: (page: "overview" | "clients" | "billing" | "printing") => void;
  tenants: Tenant[]; jobs: PrintJob[]; onStatus: (id: string, status: SubscriptionStatus) => void;
  onEnterTenant: (id: string) => void; onExit: () => void; onCreated: (tenant:Tenant)=>void; onUpdated:(tenant:Tenant)=>void; onDeleted:(tenant:Tenant)=>void;
}) {
  const [createOpen,setCreateOpen]=useState(false);
  const [editingTenant,setEditingTenant]=useState<Tenant|null>(null);
  const revenue = tenants.filter((t) => t.status === "active").reduce((sum, t) => sum + t.monthly, 0);
  const nav = [
    ["overview", LayoutDashboard, "Visão geral"],
    ["clients", Building2, "Clientes"],
    ["billing", CreditCard, "Cobranças"],
    ["printing", Printer, "Impressão"],
  ] as const;
  return (
    <main className="saas-master">
      <aside className="saas-master-side">
        <div className="saas-brand"><span><ChefHat /></span><div><strong>Cardápio Cloud</strong><small>PAINEL MASTER</small></div></div>
        <nav>{nav.map(([id, Icon, label]) => <button key={id} className={page === id ? "active" : ""} onClick={() => setPage(id)}><Icon />{label}</button>)}</nav>
        <div className="saas-side-account"><span>SA</span><div><b>Super Admin</b><small>admin@admin.com</small></div><button onClick={onExit} aria-label="Sair"><LogOut /></button></div>
      </aside>
      <section className="saas-master-main">
        <header><div><p>PLATAFORMA</p><h1>{page === "overview" ? "Visão geral" : page === "clients" ? "Clientes" : page === "billing" ? "Cobranças" : "Rede de impressão"}</h1></div><div className="saas-header-actions"><span className="saas-health"><i /> Supabase conectado</span><button className="saas-new-client" onClick={()=>setCreateOpen(true)}><Plus/> NOVO CLIENTE</button></div></header>
        {page === "overview" && <>
          <div className="saas-kpis">
            <Kpi icon={<Building2 />} label="Clientes" value={String(tenants.length)} detail={`${tenants.filter(t => t.status === "active").length} ativos`} tone="purple" />
            <Kpi icon={<CircleDollarSign />} label="Receita mensal" value={money(revenue)} detail="+12,4% este mês" tone="green" />
            <Kpi icon={<Activity />} label="Pedidos processados" value={tenants.reduce((s, t) => s + t.orders, 0).toLocaleString("pt-BR")} detail="últimos 30 dias" tone="yellow" />
            <Kpi icon={<Printer />} label="Agentes online" value={`${tenants.filter(t => t.printer === "online").length}/${tenants.length}`} detail={`${jobs.filter(j => j.status === "failed").length} requer atenção`} tone="blue" />
          </div>
          <section className="saas-master-grid">
            <div className="saas-panel"><PanelTitle title="Receita recorrente" subtitle="Evolução dos últimos 7 meses" /><div className="saas-revenue-chart">{[42,48,53,61,68,76,88].map((h,i)=><span key={i} style={{height:`${h}%`}}><i>{["Jan","Fev","Mar","Abr","Mai","Jun","Jul"][i]}</i></span>)}</div></div>
            <div className="saas-panel"><PanelTitle title="Saúde das assinaturas" subtitle="Situação atual da base" /><div className="saas-donut-wrap"><div className="saas-donut"><strong>{tenants.length}</strong><small>clientes</small></div><ul><li><i className="green"/>Em dia <b>{tenants.filter(t=>t.status==="active").length}</b></li><li><i className="yellow"/>Atrasados <b>{tenants.filter(t=>t.status==="past_due").length}</b></li><li><i className="red"/>Bloqueados <b>{tenants.filter(t=>t.status==="blocked").length}</b></li><li><i className="purple"/>Em teste <b>{tenants.filter(t=>t.status==="trial").length}</b></li></ul></div></div>
          </section>
          <TenantTable tenants={tenants} onStatus={onStatus} onEnter={onEnterTenant} onEdit={setEditingTenant} onDelete={onDeleted} compact />
        </>}
        {page === "clients" && <TenantTable tenants={tenants} onStatus={onStatus} onEnter={onEnterTenant} onEdit={setEditingTenant} onDelete={onDeleted} />}
        {page === "billing" && <BillingTable tenants={tenants} onStatus={onStatus} />}
        {page === "printing" && <MasterPrinting tenants={tenants} jobs={jobs} />}
      </section>
      {createOpen&&<CreateTenantModal onClose={()=>setCreateOpen(false)} onCreated={(tenant)=>{onCreated(tenant);setCreateOpen(false);setPage("clients")}}/>}
      {editingTenant&&<EditTenantModal tenant={editingTenant} onClose={()=>setEditingTenant(null)} onUpdated={(tenant)=>{onUpdated(tenant);setEditingTenant(null)}}/>}
    </main>
  );
}

function CreateTenantModal({onClose,onCreated}:{onClose:()=>void;onCreated:(tenant:Tenant)=>void}) {
  const [form,setForm]=useState({name:"",owner:"",email:"",password:"",plan:"Essencial",monthly:"89,90",due:""});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const update=(field:string,value:string)=>setForm(current=>({...current,[field]:value}));
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();setError("");setBusy(true);
    const isolated=createIsolatedSupabaseClient();
    if(!supabase||!isolated){setError("Supabase não configurado.");setBusy(false);return}
    const slugBase=form.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    const slug=`${slugBase}-${String(Date.now()).slice(-5)}`;
    const monthly=Number(form.monthly.replace(",","."));
    const {data:signup,error:signupError}=await isolated.auth.signUp({email:form.email.trim(),password:form.password,options:{data:{full_name:form.owner.trim()}}});
    if(signupError||!signup.user){
      const signupMessage=signupError?.message||"";
      setError(
        signupMessage==="User already registered"?"Este e-mail já está cadastrado.":
        signupMessage.toLowerCase().includes("rate limit")?"O serviço de e-mail do Supabase atingiu o limite. Tente novamente em alguns minutos.":
        signupMessage||"Não foi possível criar o acesso."
      );
      setBusy(false);return
    }
    const {data:tenant,error:tenantError}=await supabase.from("tenants").insert({
      name:form.name.trim(),slug,owner_name:form.owner.trim(),plan:form.plan,monthly_fee:monthly,
      due_date:form.due||null,subscription_status:"active",printer_status:"offline",
    }).select("id").single();
    if(tenantError||!tenant){setError(tenantError?.message||"Não foi possível criar a loja.");setBusy(false);return}
    const [profileResult,membershipResult,confirmationResult]=await Promise.all([
      supabase.from("profiles").upsert({id:signup.user.id,full_name:form.owner.trim(),platform_role:"tenant_admin"}),
      supabase.from("tenant_memberships").insert({tenant_id:tenant.id,user_id:signup.user.id,role:"owner"}),
      supabase.rpc("confirm_client_account",{client_user_id:signup.user.id}),
    ]);
    const finalError=profileResult.error||membershipResult.error||confirmationResult.error;
    if(finalError){setError(finalError.message);setBusy(false);return}
    onCreated({id:tenant.id,name:form.name.trim(),owner:form.owner.trim(),plan:form.plan,monthly,status:"active",due:form.due?new Date(form.due+"T12:00:00").toLocaleDateString("pt-BR"):"—",orders:0,printer:"offline"});
  };
  return <div className="saas-modal-backdrop" onMouseDown={onClose}><form className="saas-client-modal" onMouseDown={event=>event.stopPropagation()} onSubmit={submit}>
    <button type="button" className="saas-modal-close" onClick={onClose} aria-label="Fechar"><XCircle/></button>
    <p>CADASTRO REAL · SUPABASE</p><h2>Novo cliente</h2><span>Crie a loja e o acesso do responsável. Os dados financeiros serão separados automaticamente.</span>
    <div className="saas-client-fields">
      <label>Nome da loja<input required value={form.name} onChange={e=>update("name",e.target.value)} placeholder="Ex.: Cantina da Praça"/></label>
      <label>Responsável<input required value={form.owner} onChange={e=>update("owner",e.target.value)} placeholder="Nome completo"/></label>
      <label><Mail/> E-mail de acesso<input required type="email" value={form.email} onChange={e=>update("email",e.target.value)} placeholder="cliente@empresa.com"/></label>
      <label><KeyRound/> Senha inicial<input required minLength={6} type="password" value={form.password} onChange={e=>update("password",e.target.value)} placeholder="Mínimo 6 caracteres"/></label>
      <label>Plano<select value={form.plan} onChange={e=>update("plan",e.target.value)}><option>Essencial</option><option>Pro</option><option>Premium</option></select></label>
      <label>Mensalidade<input required inputMode="decimal" value={form.monthly} onChange={e=>update("monthly",e.target.value)} placeholder="89,90"/></label>
      <label>Próximo vencimento<input required type="date" value={form.due} onChange={e=>update("due",e.target.value)}/></label>
    </div>
    {error&&<div className="saas-form-error">{error}</div>}
    <div className="saas-modal-actions"><button type="button" onClick={onClose}>CANCELAR</button><button type="submit" disabled={busy}>{busy?<RefreshCw className="spin"/>:<Plus/>}{busy?"CRIANDO...":"CRIAR CLIENTE E ACESSO"}</button></div>
  </form></div>
}

function EditTenantModal({tenant,onClose,onUpdated}:{tenant:Tenant;onClose:()=>void;onUpdated:(tenant:Tenant)=>void}) {
  const toISODate=(value:string)=>{
    const parts=value.split("/");
    return parts.length===3?`${parts[2]}-${parts[1]}-${parts[0]}`:"";
  };
  const [form,setForm]=useState({name:tenant.name,owner:tenant.owner,plan:tenant.plan,monthly:tenant.monthly.toFixed(2).replace(".",","),due:toISODate(tenant.due)});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const update=(field:string,value:string)=>setForm(current=>({...current,[field]:value}));
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();setBusy(true);setError("");
    if(!supabase){setError("Supabase não configurado.");setBusy(false);return}
    const monthly=Number(form.monthly.replace(",","."));
    const {error:updateError}=await supabase.from("tenants").update({
      name:form.name.trim(),owner_name:form.owner.trim(),plan:form.plan,
      monthly_fee:monthly,due_date:form.due||null,
    }).eq("id",tenant.id);
    if(updateError){setError(updateError.message);setBusy(false);return}
    onUpdated({...tenant,name:form.name.trim(),owner:form.owner.trim(),plan:form.plan,monthly,due:form.due?new Date(form.due+"T12:00:00").toLocaleDateString("pt-BR"):"—"});
  };
  return <div className="saas-modal-backdrop" onMouseDown={onClose}><form className="saas-client-modal" onMouseDown={event=>event.stopPropagation()} onSubmit={submit}>
    <button type="button" className="saas-modal-close" onClick={onClose} aria-label="Fechar"><XCircle/></button>
    <p>CLIENTE · SUPABASE</p><h2>Editar loja</h2><span>As alterações serão aplicadas também na Área do Cliente.</span>
    <div className="saas-client-fields">
      <label>Nome da loja<input required value={form.name} onChange={e=>update("name",e.target.value)}/></label>
      <label>Responsável<input required value={form.owner} onChange={e=>update("owner",e.target.value)}/></label>
      <label>Plano<select value={form.plan} onChange={e=>update("plan",e.target.value)}><option>Essencial</option><option>Pro</option><option>Premium</option></select></label>
      <label>Mensalidade<input required inputMode="decimal" value={form.monthly} onChange={e=>update("monthly",e.target.value)}/></label>
      <label>Próximo vencimento<input required type="date" value={form.due} onChange={e=>update("due",e.target.value)}/></label>
    </div>
    {error&&<div className="saas-form-error">{error}</div>}
    <div className="saas-modal-actions"><button type="button" onClick={onClose}>CANCELAR</button><button type="submit" disabled={busy}>{busy?<RefreshCw className="spin"/>:null}{busy?"SALVANDO...":"SALVAR ALTERAÇÕES"}</button></div>
  </form></div>
}

function Kpi({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail: string; tone: string }) {
  return <article className="saas-kpi"><span className={tone}>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{detail}</em></div></article>;
}
function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="saas-panel-title"><div><h3>{title}</h3><p>{subtitle}</p></div><button>Ver detalhes <ArrowRight /></button></header>;
}

function TenantTable({ tenants, onStatus, onEnter, onEdit, onDelete, compact = false }: { tenants: Tenant[]; onStatus: (id: string, s: SubscriptionStatus) => void; onEnter: (id: string) => void; onEdit:(tenant:Tenant)=>void; onDelete:(tenant:Tenant)=>void; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const visible = tenants.filter(t => `${t.name} ${t.owner}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="saas-panel saas-table-panel">
    <PanelTitle title={compact ? "Clientes recentes" : "Gestão de clientes"} subtitle={compact ? "Status e atividade da sua carteira" : "Acesse, suspenda ou reative qualquer estabelecimento"} />
    {!compact && <label className="saas-search"><Search /><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar restaurante ou responsável..." /></label>}
    <div className="saas-table-scroll"><table><thead><tr><th>Estabelecimento</th><th>Plano</th><th>Status</th><th>Vencimento</th><th>Impressora</th><th></th></tr></thead>
      <tbody>{visible.map(t=><tr key={t.id}><td><span className="saas-tenant-avatar">{t.name.slice(0,2).toUpperCase()}</span><div><b>{t.name}</b><small>{t.owner}</small></div></td><td>{t.plan}<small>{money(t.monthly)}/mês</small></td><td><Status status={t.status}/></td><td>{t.due}</td><td><span className={`saas-printer-state ${t.printer}`}><i/>{t.printer === "online" ? "Online" : "Offline"}</span></td><td><button className="saas-enter" onClick={()=>onEnter(t.id)}>Acessar</button><button className="saas-action-edit" onClick={()=>onEdit(t)}>Editar</button>{t.status==="blocked"?<button className="saas-action-good" onClick={()=>onStatus(t.id,"active")}>Reativar</button>:<button className="saas-action-bad" onClick={()=>onStatus(t.id,"blocked")}>Bloquear</button>}<button className="saas-action-delete" onClick={()=>onDelete(t)}><Trash2/> Excluir conta</button></td></tr>)}</tbody>
    </table></div>
  </section>;
}

function Status({ status }: { status: SubscriptionStatus }) {
  return <span className={`saas-status ${status}`}><i />{statusLabel(status)}</span>;
}

function BillingTable({ tenants, onStatus }: { tenants: Tenant[]; onStatus: (id: string, s: SubscriptionStatus) => void }) {
  return <section className="saas-panel saas-table-panel"><PanelTitle title="Mensalidades" subtitle="Acompanhamento e conciliação automática de pagamentos" />
    <div className="saas-billing-summary"><article><small>Previsto este mês</small><b>{money(tenants.reduce((s,t)=>s+t.monthly,0))}</b></article><article><small>Recebido</small><b>{money(tenants.filter(t=>t.status==="active").reduce((s,t)=>s+t.monthly,0))}</b></article><article><small>Em aberto</small><b>{money(tenants.filter(t=>["past_due","blocked"].includes(t.status)).reduce((s,t)=>s+t.monthly,0))}</b></article></div>
    <div className="saas-table-scroll"><table><thead><tr><th>Cliente</th><th>Referência</th><th>Valor</th><th>Situação</th><th>Ação</th></tr></thead><tbody>{tenants.map(t=><tr key={t.id}><td><b>{t.name}</b><small>{t.owner}</small></td><td>Julho/2026<small>Vence {t.due}</small></td><td><b>{money(t.monthly)}</b></td><td><Status status={t.status}/></td><td>{t.status!=="active"?<button className="saas-enter" onClick={()=>onStatus(t.id,"active")}>Confirmar pagamento</button>:<span className="saas-webhook"><CheckCircle2/> Webhook confirmado</span>}</td></tr>)}</tbody></table></div>
  </section>;
}

function MasterPrinting({ tenants, jobs }: { tenants: Tenant[]; jobs: PrintJob[] }) {
  return <><div className="saas-kpis"><Kpi icon={<Wifi/>} label="Agentes conectados" value={String(tenants.filter(t=>t.printer==="online").length)} detail="conexão HTTPS ativa" tone="green"/><Kpi icon={<Printer/>} label="Impressos hoje" value={String(jobs.filter(j=>j.status==="printed").length)} detail="confirmação do spooler" tone="blue"/><Kpi icon={<RefreshCw/>} label="Na fila" value={String(jobs.filter(j=>j.status==="pending").length)} detail="aguardando agente" tone="yellow"/><Kpi icon={<XCircle/>} label="Falhas" value={String(jobs.filter(j=>j.status==="failed").length)} detail="tentativa automática" tone="purple"/></div><section className="saas-panel saas-table-panel"><PanelTitle title="Fila global" subtitle="Últimos trabalhos enviados aos agentes locais"/><JobTable jobs={jobs} tenants={tenants}/></section></>;
}

function TenantBilling({ tenant }: { tenant: Tenant; onBlock:()=>void }) {
  return <main className="saas-tenant-page"><div className="saas-page-heading"><div><p>CONTA & ASSINATURA</p><h1>Minha assinatura</h1><span>Gerencie seu plano e acompanhe as mensalidades.</span></div></div>
    <div className="saas-plan-card"><div><span className="saas-plan-icon"><CreditCard/></span><p>PLANO ATUAL</p><h2>{tenant.plan}</h2><strong>{money(tenant.monthly)}<small>/mês</small></strong><Status status={tenant.status}/></div><ul><li><CheckCircle2/>Cardápio digital e QR Code</li><li><CheckCircle2/>PDV, estoque e relatórios</li><li><CheckCircle2/>Impressão automática na cozinha</li><li><CheckCircle2/>Suporte e atualizações</li></ul></div>
    <section className="saas-panel saas-invoice"><PanelTitle title="Mensalidade atual" subtitle={new Date().toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}/><div><span><small>Vencimento</small><b>{tenant.due}</b></span><span><small>Valor</small><b>{money(tenant.monthly)}</b></span><span><small>Status</small><Status status={tenant.status}/></span></div></section>
  </main>;
}

function PrintingCenter({ tenant, jobs, setJobs }: { tenant: Tenant; jobs: PrintJob[]; setJobs:(fn:(j:PrintJob[])=>PrintJob[])=>void }) {
  const [agent,setAgent]=useState<{checking:boolean;online:boolean;printer:string;lastSeen:string}>({checking:true,online:false,printer:"",lastSeen:""});
  const [activationCode,setActivationCode]=useState("");
  const [setupError,setSetupError]=useState("");
  const [cloudJobs,setCloudJobs]=useState<PrintJob[]>(jobs.filter(j=>j.tenantId===tenant.id));
  const refresh=async()=>{
    if(!supabase)return;
    const [{data:agents},{data:recentJobs}]=await Promise.all([
      supabase.from("printer_agents").select("printer_name,last_seen_at,revoked_at").eq("tenant_id",tenant.id).is("revoked_at",null).order("last_seen_at",{ascending:false}).limit(1),
      supabase.from("print_jobs").select("id,status,created_at").eq("tenant_id",tenant.id).order("created_at",{ascending:false}).limit(20),
    ]);
    const current=agents?.[0];
    const lastSeen=current?.last_seen_at?new Date(current.last_seen_at):null;
    const online=Boolean(lastSeen&&Date.now()-lastSeen.getTime()<45000);
    setAgent({checking:false,online,printer:current?.printer_name||"",lastSeen:lastSeen?.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})||""});
    setCloudJobs((recentJobs||[]).map((job)=>({id:job.id,tenantId:tenant.id,label:`Impressão ${String(job.id).slice(0,8)}`,destination:"Cozinha",status:job.status==="printed"?"printed":job.status==="failed"?"failed":"pending",createdAt:new Date(job.created_at).getTime()})));
  };
  useEffect(()=>{refresh();const timer=window.setInterval(refresh,10000);return()=>window.clearInterval(timer)},[tenant.id]);
  const generateCode=async()=>{
    if(!supabase)return;
    setSetupError("");
    const {data,error}=await supabase.rpc("create_printer_activation_code",{p_tenant_id:tenant.id,p_agent_name:"Cozinha"});
    if(error){
      console.error("Falha ao gerar código de ativação:",error);
      setSetupError(`Não foi possível gerar o código: ${error.message}`);
      return;
    }
    setActivationCode(String(data||""));
  };
  const test=async()=>{
    setSetupError("");
    try{await queuePrinterTest(tenant.id);await refresh();}
    catch{setSetupError("Não foi possível colocar o teste na fila de impressão.");}
  };
  return <main className="saas-tenant-page"><div className="saas-page-heading"><div><p>IMPRESSÃO NA NUVEM</p><h1>Central de impressão</h1><span>O agente desta loja recebe somente as impressões vinculadas a {tenant.name}.</span></div><button className="saas-primary" onClick={test} disabled={!agent.online}><Printer/> Imprimir teste</button></div>
    <div className={`saas-agent-card ${agent.online?"is-online":""}`}><span className={agent.online?"online":"offline"}><Wifi/></span><div><p>AGENTE WINDOWS · {tenant.name.toUpperCase()}</p><h2>{agent.checking?"Verificando agente...":agent.online?"Conectado e pronto":"Agente desconectado"}</h2><small>{agent.online?`${agent.printer||"Impressora USB"} · último sinal às ${agent.lastSeen}`:"Gere um código e instale o agente no notebook conectado à Knup."}</small></div><i className={agent.online?"online":"offline"}/></div>
    <section className="saas-print-setup">
      <div><b>1</b><span><strong>Gere o código desta loja</strong><small>O código expira em 20 minutos e só pode ser usado uma vez.</small>{activationCode&&<code className="saas-activation-code">{activationCode}</code>}</span><button className="saas-print-toggle" onClick={generateCode}><KeyRound/> {activationCode?"Gerar outro código":"Gerar código de ativação"}</button></div>
      <div><b>2</b><span><strong>Instale no notebook da loja</strong><small>Baixe, extraia e execute “instalar-impressora.bat”. Digite o código quando solicitado.</small></span><a className="saas-primary" href="/print-helper/cardapio-cloud-impressora.zip" download><Download/> Baixar agente Windows</a></div>
    </section>
    {setupError&&<div className="saas-form-error">{setupError}</div>}
    <section className="saas-panel saas-table-panel"><PanelTitle title="Trabalhos recentes" subtitle="Fila isolada desta loja, com confirmação e proteção contra duplicidade"/><JobTable jobs={cloudJobs} tenants={[tenant]}/></section>
  </main>;
}

function JobTable({ jobs, tenants }: { jobs:PrintJob[]; tenants:Tenant[] }) {
  return <div className="saas-table-scroll"><table><thead><tr><th>Trabalho</th><th>Restaurante</th><th>Destino</th><th>Horário</th><th>Status</th></tr></thead><tbody>{jobs.map(j=><tr key={j.id}><td><b>{j.label}</b><small>ID {j.id}</small></td><td>{tenants.find(t=>t.id===j.tenantId)?.name||j.tenantId}</td><td><Printer/> {j.destination}</td><td>{new Date(j.createdAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</td><td><span className={`saas-job ${j.status}`}>{j.status==="printed"?<CheckCircle2/>:j.status==="pending"?<RefreshCw/>:<XCircle/>}{j.status==="printed"?"Impresso":j.status==="pending"?"Na fila":"Falhou"}</span></td></tr>)}</tbody></table></div>;
}

function BlockedScreen({ tenant, onPaid, onExit }: { tenant: Tenant; onPaid:()=>void; onExit:()=>void }) {
  const [checking,setChecking]=useState(false);
  const pix=useMemo(()=>`00020126580014BR.GOV.BCB.PIX0136${tenant.id}-mensalidade-0720265204000053039865406${tenant.monthly.toFixed(2)}5802BR5914CARDAPIO CLOUD6009SAO PAULO62070503***6304ABCD`,[tenant]);
  const confirm=()=>{setChecking(true);onPaid()};
  return <main className="saas-blocked">
    <header><div className="saas-brand"><span><ChefHat/></span><div><strong>Cardápio Cloud</strong><small>GESTÃO & PEDIDOS</small></div></div><button onClick={onExit}><LogOut/> Sair da demo</button></header>
    <section className="saas-blocked-card">
      <div className="saas-lock-copy"><span className="saas-lock-icon"><Clock3/></span><p>ASSINATURA PENDENTE</p><h1>Regularize para continuar usando o sistema.</h1><span>A mensalidade de <b>{tenant.name}</b> venceu em {tenant.due}. Seus dados estão seguros e serão liberados assim que o pagamento for confirmado.</span>
        <ul><li><ShieldCheck/>Nenhum dado ou pedido foi apagado</li><li><RefreshCw/>Liberação automática após a confirmação</li><li><CheckCircle2/>Pagamento processado em ambiente seguro</li></ul>
      </div>
      <div className="saas-pix-card"><div className="saas-pix-title"><span><QrCode/></span><div><p>PAGAMENTO VIA PIX</p><h2>{money(tenant.monthly)}</h2></div><em>{new Date().toLocaleDateString("pt-BR",{month:"short",year:"numeric"})}</em></div><div className="saas-qr"><QRCode value={pix} size={190}/></div><p>Abra o aplicativo do seu banco e escaneie o QR Code</p><div className="saas-pix-code"><span>{pix.slice(0,45)}...</span><button onClick={()=>navigator.clipboard?.writeText(pix)}>Copiar código</button></div><button className="saas-confirm-payment" onClick={confirm} disabled={checking}>{checking?<><RefreshCw className="spin"/>Atualizando situação...</>:<><RefreshCw/>Já paguei — atualizar situação</>}</button><small><ShieldCheck/>A liberação ocorre quando o pagamento é confirmado pelo administrador</small></div>
    </section>
    <footer>Precisa de ajuda? <b>Falar com o suporte</b> · atendimento@cardapiocloud.com.br</footer>
  </main>;
}
