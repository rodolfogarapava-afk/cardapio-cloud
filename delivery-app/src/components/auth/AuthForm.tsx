import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, LogIn, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';

export type RoleKey = 'cliente' | 'lojista' | 'prestador';

const ROLE_MAP: Record<RoleKey, {
  label: string;
  role: UserRole;
  colorVar: string;
  fgVar: string;
  redirect: string;
  isBusiness: boolean;
}> = {
  cliente:   { label: 'Cliente',   role: 'client',   colorVar: '--primary',       fgVar: '--primary-foreground', redirect: '/',           isBusiness: false },
  lojista:   { label: 'Lojista',   role: 'vendor',   colorVar: '--vendor',        fgVar: '--vendor-foreground',  redirect: '/vendor',     isBusiness: true },
  prestador: { label: 'Prestador', role: 'provider', colorVar: '--hub-services',  fgVar: '--hub-foreground',     redirect: '/prestador',  isBusiness: true },
};

interface Props {
  mode: 'login' | 'signup';
  roleKey: RoleKey;
}

export function AuthForm({ mode, roleKey }: Props) {
  const cfg = ROLE_MAP[roleKey];
  const accent = `hsl(var(${cfg.colorVar}))`;
  const accentFg = `hsl(var(${cfg.fgVar}))`;
  const navigate = useNavigate();
  const { login, register, isAuthenticated, user } = useAuth();

  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [social, setSocial] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leadSent, setLeadSent] = useState(false);

  if (isAuthenticated && user) {
    const redirect = user.role === 'vendor' ? '/vendor'
      : user.role === 'admin' ? '/admin'
      : user.role === 'provider' ? '/prestador'
      : '/';
    navigate(redirect, { replace: true });
    return null;
  }

  const isSignup = mode === 'signup';
  const isLead = isSignup && cfg.isBusiness;
  const otherPath = isSignup ? `/entrar/${roleKey}` : `/cadastro/${roleKey}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLead) {
        // Captação de lead — não cria conta.
        await new Promise((r) => setTimeout(r, 600));
        setLeadSent(true);
        return;
      }
      // Cliente signup (fluxo original mantido — só cliente).
      if (isSignup) {
        const ok = await register({
          name: name || email.split('@')[0],
          email,
          phone,
          role: cfg.role,
        });
        if (ok) {
          toast({ title: 'Conta criada!', description: 'Bem-vindo ao Use Livre.' });
          navigate(cfg.redirect, { replace: true });
        } else {
          toast({ title: 'Não foi possível criar a conta', variant: 'destructive' });
        }
        return;
      }
      const ok = await login(email, password, cfg.role);
      if (ok) {
        toast({ title: 'Login realizado!', description: 'Bom te ver de volta.' });
        navigate(cfg.redirect, { replace: true });
      } else {
        toast({
          title: 'Não foi possível entrar',
          description: 'Verifique e-mail e senha.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------- Tela de confirmação de LEAD ----------
  if (leadSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b">
          <div className="container flex items-center gap-3 py-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Voltar">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Cadastro recebido</h1>
          </div>
        </header>
        <main className="flex-1 container py-10 flex flex-col items-center justify-center">
          <div className="w-full max-w-md text-center">
            <Logo className="h-20 sm:h-24 mx-auto" />
            <div
              className="mt-8 rounded-2xl border bg-card p-6 sm:p-8 shadow-sm"
              style={{ boxShadow: `0 12px 32px -16px ${accent}` }}
            >
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: `${accent.replace(')', ' / 0.15)')}`, color: accent }}
              >
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold">Recebemos seu cadastro!</h2>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                Nossa equipe entra em contato pelo WhatsApp ou e-mail pra liberar seu acesso e apresentar a plataforma.
              </p>
              <p
                className="text-sm font-semibold mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))' }}
              >
                🎁 Seu primeiro mês é grátis
              </p>
              <Button
                onClick={() => navigate('/')}
                size="lg"
                className="w-full mt-6 font-semibold hover:brightness-110"
                style={{ background: accent, color: accentFg }}
              >
                Voltar ao início
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container flex items-center gap-3 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(isLead ? '/seja-parceiro' : '/acesso')} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">
            {isLead ? 'Quero testar grátis' : isSignup ? 'Criar conta' : 'Entrar'} · {cfg.label}
          </h1>
        </div>
      </header>

      <main className="flex-1 container py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-8">
            <Logo className="h-24 sm:h-28" />
            <p className="text-muted-foreground mt-3 text-sm">
              {isLead
                ? `Deixe seus dados — a gente entra em contato pra liberar seu 1º mês grátis.`
                : isSignup
                  ? `Crie sua conta como ${cfg.label.toLowerCase()}.`
                  : `Acesse sua conta de ${cfg.label.toLowerCase()}.`}
            </p>
          </div>

          <div
            className="rounded-2xl border bg-card shadow-sm overflow-hidden"
            style={{ boxShadow: `0 8px 24px -12px ${accent}` }}
          >
            <div className="h-1" style={{ background: accent }} />
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
              {isLead ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Seu nome</Label>
                    <Input id="name" required value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">WhatsApp</Label>
                    <Input id="phone" type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="business">Nome do estabelecimento</Label>
                    <Input
                      id="business"
                      required
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      placeholder={roleKey === 'lojista' ? 'Ex: Padaria do João' : 'Ex: Encanador João'}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="social">
                      Rede social do estabelecimento <span className="text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <Input
                      id="social"
                      value={social}
                      onChange={e => setSocial(e.target.value)}
                      placeholder="@seuinstagram ou link"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={loading}
                    className="w-full font-semibold shadow-sm transition-all hover:brightness-110"
                    style={{ background: accent, color: accentFg }}
                  >
                    {loading
                      ? 'Enviando...'
                      : <><Send className="mr-2 h-4 w-4" /> Quero testar grátis</>}
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground">
                    Sem cartão de crédito. 1º mês grátis. Zero comissão sobre suas vendas.
                  </p>
                </>
              ) : (
                <>
                  {isSignup && (
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Nome completo</Label>
                      <Input id="name" required value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
                  </div>
                  {isSignup && (
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={4}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(s => !s)}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={loading}
                    className={cn('w-full font-semibold shadow-sm transition-all hover:brightness-110')}
                    style={{ background: accent, color: accentFg }}
                  >
                    {loading
                      ? (isSignup ? 'Criando conta...' : 'Entrando...')
                      : (isSignup
                          ? <><LogIn className="mr-2 h-4 w-4" /> Criar conta</>
                          : <><LogIn className="mr-2 h-4 w-4" /> Entrar</>)}
                  </Button>
                </>
              )}
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLead ? (
              <>Já é parceiro?{' '}<Link to={otherPath} className="font-semibold hover:underline" style={{ color: accent }}>Entrar</Link></>
            ) : isSignup ? (
              <>Já tem conta?{' '}<Link to={otherPath} className="font-semibold hover:underline" style={{ color: accent }}>Entrar</Link></>
            ) : cfg.isBusiness ? (
              <>Ainda não é parceiro?{' '}<Link to="/seja-parceiro" className="font-semibold hover:underline" style={{ color: accent }}>Quero testar grátis</Link></>
            ) : (
              <>Ainda não tem conta?{' '}<Link to={otherPath} className="font-semibold hover:underline" style={{ color: accent }}>Criar conta</Link></>
            )}
          </p>

          {!cfg.isBusiness && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              <Link to="/acesso" className="hover:underline">Trocar de perfil</Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
