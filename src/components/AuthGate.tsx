import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, ChefHat, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import "./auth-gate.css";

type AuthContextValue = {
  user: Pick<User, "id" | "email"> | { id: string; email: string };
  signOut: () => Promise<void>;
  isDemo: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);
export const useAppAuth = () => useContext(AuthContext);

export default function AuthGate({ children, area = "sistema" }: { children: ReactNode; area?: "admin" | "cliente" | "sistema" }) {
  const [user, setUser] = useState<AuthContextValue["user"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) return <AuthLoading />;
  if (!user) {
    return <LoginScreen area={area} />;
  }

  return <AuthContext.Provider value={{ user, signOut, isDemo: false }}>{children}</AuthContext.Provider>;
}

function AuthLoading() {
  return <main className="auth-screen"><div className="auth-loading"><span><ChefHat /></span><p>Verificando acesso...</p></div></main>;
}

function LoginScreen({ area }: { area: "admin" | "cliente" | "sistema" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    if (!supabase) {
      setError("A autenticação está indisponível. Verifique a configuração do servidor.");
      setBusy(false);
      return;
    }
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) setError(authError.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : authError.message);
    setBusy(false);
  };

  const resetPassword = async () => {
    setError("");
    setMessage("");
    if (!email) {
      setError("Digite seu e-mail antes de solicitar uma nova senha.");
      return;
    }
    if (!supabase) {
      setError("A autenticação está indisponível. Verifique a configuração do servidor.");
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin`,
    });
    if (resetError) setError(resetError.message);
    else setMessage("Enviamos as instruções de recuperação para o seu e-mail.");
  };

  return (
    <main className="auth-screen">
      <section className="auth-brand-panel">
        <div className="auth-brand"><span><ChefHat /></span><div><b>CARDÁPIO CLOUD</b></div></div>
        <div className="auth-brand-copy">
          <p>ACESSO ADMINISTRATIVO</p>
          <h1>Gestão simples.<br />Operação sob controle.</h1>
          <span>Entre para gerenciar seu cardápio, comandas, estoque, caixa e impressão da cozinha.</span>
        </div>
        <div className="auth-security"><ShieldCheck /><span><b>Ambiente protegido</b><small>Seus dados e os dados dos clientes são isolados por estabelecimento.</small></span></div>
      </section>
      <section className="auth-form-panel">
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-mobile-brand"><span><ChefHat /></span><b>CARDÁPIO CLOUD</b></div>
          <p>{area === "admin" ? "ADMINISTRAÇÃO DA PLATAFORMA" : area === "cliente" ? "ÁREA DO CLIENTE" : "ENTRAR NO SISTEMA"}</p>
          <h2>{area === "admin" ? "Acesso administrativo" : "Bem-vindo de volta"}</h2>
          <span className="auth-subtitle">{area === "cliente" ? "Entre para acessar a operação da sua loja." : "Informe seus dados para acessar o painel."}</span>
          <label><span>E-MAIL</span><div><Mail /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" required /></div></label>
          <label><span>SENHA</span><div><LockKeyhole /><input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Digite sua senha" autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
          <button className="auth-forgot" type="button" onClick={resetPassword}>Esqueci minha senha</button>
          {error && <div className="auth-message error">{error}</div>}
          {message && <div className="auth-message success">{message}</div>}
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? "ENTRANDO..." : <>ENTRAR <ArrowRight /></>}</button>
          {!isSupabaseConfigured && <div className="auth-message error">A autenticação precisa ser configurada para liberar o acesso.</div>}
          <small className="auth-footnote">Ao entrar, você concorda com os termos de uso e a política de privacidade.</small>
        </form>
      </section>
    </main>
  );
}
