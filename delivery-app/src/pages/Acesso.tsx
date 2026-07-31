import { Link } from 'react-router-dom';
import { ArrowLeft, Smartphone, UtensilsCrossed, Briefcase, ArrowRight, Store } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { cn } from '@/lib/utils';

export default function Acesso() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container h-16 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Voltar para home"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
          <Logo className="h-8 sm:h-9" />
          <div className="w-12 sm:w-16" aria-hidden="true" />
        </div>
      </header>

      <main className="flex-1 container py-8 sm:py-12 flex flex-col">
        {/* Hero — acesso do cliente */}
        <section className="w-full max-w-xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Bem-vindo de volta
            </h1>
            <p className="mt-2 text-muted-foreground">
              Entre com seu telefone em segundos e aproveite o Use Livre.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-5 sm:p-8 shadow-sm">
            {/* Header do card — badge inline no mobile, ícone à esquerda no desktop */}
            <div className="flex items-center gap-3 mb-5 sm:mb-6 sm:gap-4">
              <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-primary/10 ring-1 ring-primary/15 flex items-center justify-center shrink-0">
                <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold leading-tight text-foreground">
                  Acesso do cliente
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Pedidos, histórico e favoritos
                </p>
              </div>
            </div>

            {/* CTA principal em destaque */}
            <Link
              to="/entrar/cliente"
              className={cn(
                'w-full inline-flex items-center justify-center h-12 rounded-xl px-6',
                'bg-primary text-primary-foreground font-semibold text-sm',
                'shadow-sm hover:brightness-110 transition-all'
              )}
            >
              Entrar com telefone
            </Link>

            {/* Separador sutil */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                ou
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* CTA secundário — ghost, menor peso visual */}
            <Link
              to="/cadastro/cliente"
              className={cn(
                'w-full inline-flex items-center justify-center h-12 rounded-xl px-6',
                'border border-input bg-background text-foreground font-semibold text-sm',
                'hover:bg-muted transition-colors'
              )}
            >
              Criar minha conta
            </Link>
          </div>
        </section>

        {/* Atalhos de explorar */}
        <section className="w-full max-w-xl mx-auto mt-8 sm:mt-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 text-center">
            Ou explore sem logar
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ExploreCard
              to="/alimentacao"
              label="Explorar Alimentação"
              description="Restaurantes, mercados e delivery perto de você."
              icon={UtensilsCrossed}
              tone="food"
            />
            <ExploreCard
              to="/servicos"
              label="Explorar Serviços"
              description="Prestadores de serviços e profissionais locais."
              icon={Briefcase}
              tone="services"
            />
          </div>
        </section>

        {/* Parceiro — bloco separado */}
        <section className="w-full max-w-xl mx-auto mt-auto pt-10 sm:pt-14">
          <div className="rounded-xl border bg-muted/40 p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="h-11 w-11 rounded-xl bg-vendor/10 ring-1 ring-vendor/20 flex items-center justify-center shrink-0">
              <Store className="h-5 w-5 text-vendor" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-foreground">É um estabelecimento ou prestador?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Venda no Use Livre e receba pedidos e contatos direto.
              </p>
            </div>
            <Link
              to="/seja-parceiro"
              className={cn(
                'inline-flex items-center gap-1.5 h-10 rounded-lg px-4',
                'bg-card border border-vendor/30 text-vendor font-semibold text-sm',
                'hover:bg-vendor/5 transition-colors shrink-0'
              )}
            >
              Seja parceiro <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

interface ExploreCardProps {
  to: string;
  label: string;
  description: string;
  icon: typeof UtensilsCrossed;
  tone: 'food' | 'services';
}

const toneMap = {
  food: {
    bg: 'bg-hub-food/10',
    ring: 'ring-hub-food/20',
    text: 'text-hub-food',
    hover: 'hover:bg-hub-food/5',
    border: 'border-hub-food/20',
  },
  services: {
    bg: 'bg-hub-services/10',
    ring: 'ring-hub-services/20',
    text: 'text-hub-services',
    hover: 'hover:bg-hub-services/5',
    border: 'border-hub-services/20',
  },
};

function ExploreCard({ to, label, description, icon: Icon, tone }: ExploreCardProps) {
  const t = toneMap[tone];
  return (
    <Link
      to={to}
      className={cn(
        'group relative rounded-xl border bg-card p-5 shadow-sm transition-all',
        'hover:shadow-md hover:-translate-y-0.5',
        t.hover
      )}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-1 rounded-t-xl opacity-80',
          t.bg.replace('/10', '')
        )}
      />
      <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center ring-1 mb-4', t.bg, t.ring)}>
        <Icon className={cn('h-5 w-5', t.text)} />
      </div>
      <h3 className="font-bold text-foreground leading-tight">{label}</h3>
      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
      <div className={cn('mt-4 inline-flex items-center gap-1 text-xs font-semibold', t.text)}>
        Ver opções <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
