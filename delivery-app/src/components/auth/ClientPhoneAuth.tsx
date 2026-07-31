import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Phone, MessageCircle, User, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

type Step = 'phone' | 'otp' | 'profile';

// Mock "database" of known phones (in real app, backend would answer this)
const KNOWN_PHONES = new Set<string>(['11999991234']);

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function ClientPhoneAuth() {
  const navigate = useNavigate();
  const { register, isAuthenticated, user } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'client') {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (resendIn <= 0) return;
    timerRef.current = window.setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [resendIn]);

  const digits = phone.replace(/\D/g, '');
  const phoneValid = digits.length >= 10;

  const sendCode = async () => {
    if (!phoneValid) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    setLoading(false);
    setStep('otp');
    setResendIn(30);
    setOtp('');
  };

  const verifyOtp = async (code: string) => {
    if (code.length < 4) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    setLoading(false);
    const known = KNOWN_PHONES.has(digits);
    if (known) {
      await register({ name: 'Cliente', email: '', phone: digits, role: 'client' });
      toast({ title: 'Bem-vindo de volta!' });
      navigate('/', { replace: true });
    } else {
      setStep('profile');
    }
  };

  const completeProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await register({ name: name.trim(), email: email.trim() || `${digits}@cliente.local`, phone: digits, role: 'client' });
    setLoading(false);
    toast({ title: 'Conta criada!', description: 'Bem-vindo ao Use Livre.' });
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container flex items-center gap-3 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => step === 'phone' ? navigate('/acesso') : setStep(step === 'profile' ? 'otp' : 'phone')}
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Entrar · Cliente</h1>
        </div>
      </header>

      <main className="flex-1 container py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-8">
            <Logo className="h-24 sm:h-28" />
            <p className="text-muted-foreground mt-3 text-sm">
              {step === 'phone' && 'Use seu WhatsApp para entrar. Sem senha.'}
              {step === 'otp' && `Enviamos um código para ${formatPhone(digits)}`}
              {step === 'profile' && 'Só falta se apresentar 👋'}
            </p>
          </div>

          <div
            className="rounded-2xl border bg-card shadow-sm overflow-hidden"
            style={{ boxShadow: '0 8px 24px -12px hsl(var(--primary))' }}
          >
            <div className="h-1 bg-primary" />
            <div className="p-5 sm:p-6 space-y-4">

              {step === 'phone' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-primary" />
                      WhatsApp
                    </Label>
                    <Input
                      id="phone"
                      inputMode="tel"
                      autoFocus
                      value={phone}
                      onChange={e => setPhone(formatPhone(e.target.value))}
                      placeholder="(11) 99999-9999"
                      className="text-lg h-12"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enviaremos um código para confirmar seu número.
                    </p>
                  </div>
                  <Button
                    onClick={sendCode}
                    disabled={!phoneValid || loading}
                    size="lg"
                    className="w-full font-semibold"
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    {loading ? 'Enviando...' : 'Enviar código'}
                  </Button>
                </>
              )}

              {step === 'otp' && (
                <>
                  <div className="space-y-3 flex flex-col items-center">
                    <Label className="text-sm">Digite o código de 4 dígitos</Label>
                    <InputOTP
                      maxLength={4}
                      value={otp}
                      onChange={v => {
                        setOtp(v);
                        if (v.length === 4) verifyOtp(v);
                      }}
                      autoFocus
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="h-14 w-12 text-xl" />
                        <InputOTPSlot index={1} className="h-14 w-12 text-xl" />
                        <InputOTPSlot index={2} className="h-14 w-12 text-xl" />
                        <InputOTPSlot index={3} className="h-14 w-12 text-xl" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => setStep('phone')}
                      className="text-primary hover:underline font-medium"
                    >
                      Trocar número
                    </button>
                    {resendIn > 0 ? (
                      <span className="text-muted-foreground">Reenviar em {resendIn}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={sendCode}
                        className="text-primary hover:underline font-medium"
                      >
                        Reenviar código
                      </button>
                    )}
                  </div>

                  <Button
                    onClick={() => verifyOtp(otp)}
                    disabled={otp.length < 4 || loading}
                    size="lg"
                    className="w-full font-semibold"
                  >
                    {loading ? 'Validando...' : 'Confirmar'}
                  </Button>
                </>
              )}

              {step === 'profile' && (
                <form onSubmit={completeProfile} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Como podemos te chamar?
                    </Label>
                    <Input
                      id="name"
                      autoFocus
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Seu nome"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      E-mail <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                    />
                  </div>
                  <Button type="submit" size="lg" disabled={loading || !name.trim()} className="w-full font-semibold">
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            <Link to="/acesso" className="hover:underline">Trocar de perfil</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
