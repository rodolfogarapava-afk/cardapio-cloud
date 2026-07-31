import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/common/Logo';
import { ArrowLeft, ClipboardList, LogOut, User as UserIcon, Phone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { goBack } from '@/lib/goBack';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export default function Perfil() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) {
    navigate('/acesso', { replace: true });
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="container h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => goBack(navigate, '/')}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar</span>
          </button>
          <Logo className="h-8 sm:h-9" />
          <div className="w-12 sm:w-16" aria-hidden />
        </div>
      </header>

      <main className="container max-w-xl py-8 sm:py-12">
        <section className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/10 ring-1 ring-primary/15 flex items-center justify-center shrink-0">
              <UserIcon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                {user.name}
              </h1>
              <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
            </div>
          </div>

          <dl className="mt-6 grid gap-3 text-sm">
            {user.email && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <dd className="truncate text-foreground">{user.email}</dd>
              </div>
            )}
            {user.phone && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <dd className="text-foreground">{user.phone}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="mt-4 rounded-2xl border bg-card shadow-sm overflow-hidden">
          <Link
            to="/historico"
            className={cn(
              'flex items-center gap-3 px-5 py-4 text-sm font-medium',
              'hover:bg-muted transition-colors border-b last:border-b-0'
            )}
          >
            <ClipboardList className="h-4 w-4 text-primary" />
            <span className="flex-1">Meus pedidos</span>
            <span className="text-muted-foreground">›</span>
          </Link>
          <ThemeToggle variant="inline" className="border-b" />
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="flex-1 text-left">Sair da conta</span>
          </button>
        </section>
      </main>
    </div>
  );
}
