import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/Logo';

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error('404: rota inexistente:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="container py-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild aria-label="Voltar ao hub">
          <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <Link to="/" aria-label="Use Livre" className="flex items-center">
          <Logo className="h-12 sm:h-14" />
        </Link>
      </header>

      <main className="container flex-1 flex flex-col items-center justify-center py-12 text-center">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <Compass className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-1">Página não encontrada</p>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          O endereço <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{location.pathname}</code> não existe ou foi movido.
        </p>
        <Button asChild>
          <Link to="/">Voltar para o início</Link>
        </Button>
      </main>
    </div>
  );
}
