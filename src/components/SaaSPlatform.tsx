import { useEffect, useMemo, useState, type ReactNode } from "react";
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
} from "lucide-react";
import "./saas-platform.css";

type SubscriptionStatus = "active" | "past_due" | "blocked" | "trial";
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
  id: number;
  tenantId: string;
  label: string;
  destination: string;
  status: "printed" | "pending" | "failed";
  createdAt: number;
};

const initialTenants: Tenant[] = [
  { id: "deus-proveu", name: "Deus Proveu Espetinhos", owner: "Marcos Almeida", plan: "Pro", monthly: 149.9, status: "active", due: "05/08/2026", orders: 184, printer: "online" },
  { id: "cantina-bella", name: "Cantina Bella", owner: "Ana Souza", plan: "Essencial", monthly: 89.9, status: "past_due", due: "25/07/2026", orders: 97, printer: "online" },
  { id: "burger-station", name: "Burger Station", owner: "Lucas Lima", plan: "Pro", monthly: 149.9, status: "blocked", due: "18/07/2026", orders: 211, printer: "offline" },
  { id: "acai-do-parque", name: "Açaí do Parque", owner: "Renata Costa", plan: "Essencial", monthly: 89.9, status: "trial", due: "10/08/2026", orders: 42, printer: "online" },
];

const initialJobs: PrintJob[] = [
  { id: 8742, tenantId: "deus-proveu", label: "Pedido #184 · Mesa 07", destination: "Cozinha", status: "printed", createdAt: Date.now() - 90_000 },
  { id: 8743, tenantId: "deus-proveu", label: "Pedido #185 · Mesa 03", destination: "Churrasqueira", status: "pending", createdAt: Date.now() - 18_000 },
  { id: 8744, tenantId: "burger-station", label: "Pedido #211 · Balcão", destination: "Cozinha", status: "failed", createdAt: Date.now() - 310_000 },
];

const tenantStore = "cardapio-cloud-tenants-v1";
const jobsStore = "cardapio-cloud-jobs-v1";

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusLabel(status: SubscriptionStatus) {
  return { active: "Em dia", past_due: "Em atraso", blocked: "Bloqueado", trial: "Teste grátis" }[status];
}

export default function SaaSPlatform({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<"landing" | "master" | "tenant">("landing");
  const [tenantId, setTenantId] = useState("deus-proveu");
  const [tenantPage, setTenantPage] = useState<"operation" | "billing" | "printing">("operation");
  const [masterPage, setMasterPage] = useState<"overview" | "clients" | "billing" | "printing">("overview");
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [jobs, setJobs] = useState<PrintJob[]>(initialJobs);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedTenants = localStorage.getItem(tenantStore);
      const savedJobs = localStorage.getItem(jobsStore);
      if (savedTenants) setTenants(JSON.parse(savedTenants));
      if (savedJobs) setJobs(JSON.parse(savedJobs));
    } catch {}
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(tenantStore, JSON.stringify(tenants));
    localStorage.setItem(jobsStore, JSON.stringify(jobs));
  }, [tenants, jobs, hydrated]);

  const tenant = tenants.find((item) => item.id === tenantId) ?? tenants[0];
  const setTenantStatus = (id: string, status: SubscriptionStatus) =>
    setTenants((all) => all.map((item) => item.id === id ? { ...item, status, due: status === "active" ? "05/09/2026" : item.due } : item));

  if (role === "landing") {
    return <DemoLanding onMaster={() => setRole("master")} onTenant={() => { setTenantId("deus-proveu"); setRole("tenant"); }} onBlocked={() => { setTenantId("burger-station"); setRole("tenant"); }} />;
  }

  if (role === "master") {
    return (
      <MasterConsole
        page={masterPage}
        setPage={setMasterPage}
        tenants={tenants}
        jobs={jobs}
        onStatus={setTenantStatus}
        onEnterTenant={(id) => { setTenantId(id); setRole("tenant"); setTenantPage("operation"); }}
        onExit={() => setRole("landing")}
      />
    );
  }

  if (tenant.status === "blocked") {
    return <BlockedScreen tenant={tenant} onPaid={() => setTenantStatus(tenant.id, "active")} onExit={() => setRole("landing")} />;
  }

  return (
    <div className="saas-tenant-shell">
      <TenantBar tenant={tenant} page={tenantPage} setPage={setTenantPage} onExit={() => setRole("landing")} />
      {tenant.status === "past_due" && (
        <button className="saas-overdue-banner" onClick={() => setTenantPage("billing")}>
          <Clock3 /> Sua mensalidade venceu em {tenant.due}. Regularize para evitar a suspensão. <strong>Ver cobrança <ArrowRight /></strong>
        </button>
      )}
      {tenantPage === "operation" && children}
      {tenantPage === "billing" && <TenantBilling tenant={tenant} onBlock={() => setTenantStatus(tenant.id, "blocked")} />}
      {tenantPage === "printing" && <PrintingCenter tenant={tenant} jobs={jobs} setJobs={setJobs} />}
    </div>
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

function MasterConsole({ page, setPage, tenants, jobs, onStatus, onEnterTenant, onExit }: {
  page: "overview" | "clients" | "billing" | "printing";
  setPage: (page: "overview" | "clients" | "billing" | "printing") => void;
  tenants: Tenant[]; jobs: PrintJob[]; onStatus: (id: string, status: SubscriptionStatus) => void;
  onEnterTenant: (id: string) => void; onExit: () => void;
}) {
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
        <div className="saas-side-account"><span>SA</span><div><b>Super Admin</b><small>admin@cardapiocloud.com</small></div><button onClick={onExit} aria-label="Sair"><LogOut /></button></div>
      </aside>
      <section className="saas-master-main">
        <header><div><p>PLATAFORMA</p><h1>{page === "overview" ? "Visão geral" : page === "clients" ? "Clientes" : page === "billing" ? "Cobranças" : "Rede de impressão"}</h1></div><span className="saas-health"><i /> Todos os serviços operacionais</span></header>
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
          <TenantTable tenants={tenants} onStatus={onStatus} onEnter={onEnterTenant} compact />
        </>}
        {page === "clients" && <TenantTable tenants={tenants} onStatus={onStatus} onEnter={onEnterTenant} />}
        {page === "billing" && <BillingTable tenants={tenants} onStatus={onStatus} />}
        {page === "printing" && <MasterPrinting tenants={tenants} jobs={jobs} />}
      </section>
    </main>
  );
}

function Kpi({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail: string; tone: string }) {
  return <article className="saas-kpi"><span className={tone}>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{detail}</em></div></article>;
}
function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="saas-panel-title"><div><h3>{title}</h3><p>{subtitle}</p></div><button>Ver detalhes <ArrowRight /></button></header>;
}

function TenantTable({ tenants, onStatus, onEnter, compact = false }: { tenants: Tenant[]; onStatus: (id: string, s: SubscriptionStatus) => void; onEnter: (id: string) => void; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const visible = tenants.filter(t => `${t.name} ${t.owner}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="saas-panel saas-table-panel">
    <PanelTitle title={compact ? "Clientes recentes" : "Gestão de clientes"} subtitle={compact ? "Status e atividade da sua carteira" : "Acesse, suspenda ou reative qualquer estabelecimento"} />
    {!compact && <label className="saas-search"><Search /><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar restaurante ou responsável..." /></label>}
    <div className="saas-table-scroll"><table><thead><tr><th>Estabelecimento</th><th>Plano</th><th>Status</th><th>Vencimento</th><th>Impressora</th><th></th></tr></thead>
      <tbody>{visible.map(t=><tr key={t.id}><td><span className="saas-tenant-avatar">{t.name.slice(0,2).toUpperCase()}</span><div><b>{t.name}</b><small>{t.owner}</small></div></td><td>{t.plan}<small>{money(t.monthly)}/mês</small></td><td><Status status={t.status}/></td><td>{t.due}</td><td><span className={`saas-printer-state ${t.printer}`}><i/>{t.printer === "online" ? "Online" : "Offline"}</span></td><td><button className="saas-enter" onClick={()=>onEnter(t.id)}>Acessar</button>{t.status==="blocked"?<button className="saas-action-good" onClick={()=>onStatus(t.id,"active")}>Reativar</button>:<button className="saas-action-bad" onClick={()=>onStatus(t.id,"blocked")}>Bloquear</button>}</td></tr>)}</tbody>
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

function TenantBar({ tenant, page, setPage, onExit }: { tenant: Tenant; page: "operation"|"billing"|"printing"; setPage:(p:"operation"|"billing"|"printing")=>void; onExit:()=>void }) {
  return <header className="saas-tenant-bar"><div className="saas-brand"><span><ChefHat/></span><div><strong>Cardápio Cloud</strong><small>{tenant.name}</small></div></div><nav><button className={page==="operation"?"active":""} onClick={()=>setPage("operation")}><Store/> Operação</button><button className={page==="billing"?"active":""} onClick={()=>setPage("billing")}><CreditCard/> Minha assinatura</button><button className={page==="printing"?"active":""} onClick={()=>setPage("printing")}><Printer/> Impressão</button></nav><div className="saas-tenant-session"><Status status={tenant.status}/><button onClick={onExit}><LogOut/> Sair da demo</button></div></header>;
}

function TenantBilling({ tenant, onBlock }: { tenant: Tenant; onBlock:()=>void }) {
  return <main className="saas-tenant-page"><div className="saas-page-heading"><div><p>CONTA & ASSINATURA</p><h1>Minha assinatura</h1><span>Gerencie seu plano e acompanhe as mensalidades.</span></div></div>
    <div className="saas-plan-card"><div><span className="saas-plan-icon"><CreditCard/></span><p>PLANO ATUAL</p><h2>{tenant.plan}</h2><strong>{money(tenant.monthly)}<small>/mês</small></strong><Status status={tenant.status}/></div><ul><li><CheckCircle2/>Cardápio digital e QR Code</li><li><CheckCircle2/>PDV, estoque e relatórios</li><li><CheckCircle2/>Impressão automática na cozinha</li><li><CheckCircle2/>Suporte e atualizações</li></ul></div>
    <section className="saas-panel saas-invoice"><PanelTitle title="Última mensalidade" subtitle="Julho de 2026"/><div><span><small>Vencimento</small><b>{tenant.due}</b></span><span><small>Valor</small><b>{money(tenant.monthly)}</b></span><span><small>Status</small><Status status={tenant.status}/></span><button onClick={onBlock}>Simular vencimento e bloqueio</button></div></section>
  </main>;
}

function PrintingCenter({ tenant, jobs, setJobs }: { tenant: Tenant; jobs: PrintJob[]; setJobs:(fn:(j:PrintJob[])=>PrintJob[])=>void }) {
  const ownJobs=jobs.filter(j=>j.tenantId===tenant.id);
  const test=()=>{const id=Date.now();setJobs(all=>[{id,tenantId:tenant.id,label:`Teste #${String(id).slice(-4)}`,destination:"Cozinha",status:"pending",createdAt:Date.now()},...all]);setTimeout(()=>setJobs(all=>all.map(j=>j.id===id?{...j,status:"printed"}:j)),1800)};
  return <main className="saas-tenant-page"><div className="saas-page-heading"><div><p>IMPRESSÃO LOCAL</p><h1>Central de impressão</h1><span>O agente busca os pedidos na nuvem e imprime na rede do restaurante.</span></div><button className="saas-primary" onClick={test}><Printer/> Imprimir teste</button></div>
    <div className="saas-agent-card"><span className={tenant.printer}><Wifi/></span><div><p>AGENTE WINDOWS</p><h2>{tenant.printer==="online"?"Conectado e pronto":"Agente desconectado"}</h2><small>{tenant.printer==="online"?"Último sinal recebido há 8 segundos · Cozinha-POS80":"Verifique o computador da cozinha"}</small></div><i className={tenant.printer}/></div>
    <section className="saas-panel saas-table-panel"><PanelTitle title="Trabalhos recentes" subtitle="A fila evita perda e impressão duplicada"/><JobTable jobs={ownJobs} tenants={[tenant]}/></section>
  </main>;
}

function JobTable({ jobs, tenants }: { jobs:PrintJob[]; tenants:Tenant[] }) {
  return <div className="saas-table-scroll"><table><thead><tr><th>Trabalho</th><th>Restaurante</th><th>Destino</th><th>Horário</th><th>Status</th></tr></thead><tbody>{jobs.map(j=><tr key={j.id}><td><b>{j.label}</b><small>ID {j.id}</small></td><td>{tenants.find(t=>t.id===j.tenantId)?.name||j.tenantId}</td><td><Printer/> {j.destination}</td><td>{new Date(j.createdAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</td><td><span className={`saas-job ${j.status}`}>{j.status==="printed"?<CheckCircle2/>:j.status==="pending"?<RefreshCw/>:<XCircle/>}{j.status==="printed"?"Impresso":j.status==="pending"?"Na fila":"Falhou"}</span></td></tr>)}</tbody></table></div>;
}

function BlockedScreen({ tenant, onPaid, onExit }: { tenant: Tenant; onPaid:()=>void; onExit:()=>void }) {
  const [checking,setChecking]=useState(false);
  const pix=useMemo(()=>`00020126580014BR.GOV.BCB.PIX0136${tenant.id}-mensalidade-0720265204000053039865406${tenant.monthly.toFixed(2)}5802BR5914CARDAPIO CLOUD6009SAO PAULO62070503***6304ABCD`,[tenant]);
  const confirm=()=>{setChecking(true);setTimeout(()=>{onPaid()},1800)};
  return <main className="saas-blocked">
    <header><div className="saas-brand"><span><ChefHat/></span><div><strong>Cardápio Cloud</strong><small>GESTÃO & PEDIDOS</small></div></div><button onClick={onExit}><LogOut/> Sair da demo</button></header>
    <section className="saas-blocked-card">
      <div className="saas-lock-copy"><span className="saas-lock-icon"><Clock3/></span><p>ASSINATURA PENDENTE</p><h1>Regularize para continuar usando o sistema.</h1><span>A mensalidade de <b>{tenant.name}</b> venceu em {tenant.due}. Seus dados estão seguros e serão liberados assim que o pagamento for confirmado.</span>
        <ul><li><ShieldCheck/>Nenhum dado ou pedido foi apagado</li><li><RefreshCw/>Liberação automática após a confirmação</li><li><CheckCircle2/>Pagamento processado em ambiente seguro</li></ul>
      </div>
      <div className="saas-pix-card"><div className="saas-pix-title"><span><QrCode/></span><div><p>PAGAMENTO VIA PIX</p><h2>{money(tenant.monthly)}</h2></div><em>Julho/2026</em></div><div className="saas-qr"><QRCode value={pix} size={190}/></div><p>Abra o aplicativo do seu banco e escaneie o QR Code</p><div className="saas-pix-code"><span>{pix.slice(0,45)}...</span><button onClick={()=>navigator.clipboard?.writeText(pix)}>Copiar código</button></div><button className="saas-confirm-payment" onClick={confirm} disabled={checking}>{checking?<><RefreshCw className="spin"/>Confirmando com o provedor...</>:<><CheckCircle2/>Simular pagamento confirmado</>}</button><small><ShieldCheck/>Acesso liberado automaticamente pelo webhook</small></div>
    </section>
    <footer>Precisa de ajuda? <b>Falar com o suporte</b> · atendimento@cardapiocloud.com.br</footer>
  </main>;
}
