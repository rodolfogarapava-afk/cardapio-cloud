import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, MapPin, Phone, Star, Calendar, ChevronDown, Play, ChevronLeft, ChevronRight, EyeOff, LogIn } from 'lucide-react';
import { BrandIcon } from '@/components/common/BrandIcon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useEmblaCarousel from 'embla-carousel-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatPriceUnit } from '@/lib/priceUnit';

import { getProviderBySlug, mockProviderReviews, serviceCategories } from '@/data/serviceProviders';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BookingSheet } from '@/components/client/BookingSheet';
import { usePublicCommentsVisibility } from '@/lib/reviewsVisibility';
import { goBack } from '@/lib/goBack';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';



const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function PrestadorPerfil() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const baseProvider = slug ? getProviderBySlug(slug) : undefined;
  const [provider, setProvider] = useState(baseProvider);
  const [mapOpen, setMapOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const { isAuthenticated, login } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPwd, setAuthPwd] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authErr, setAuthErr] = useState('');
  const mapRef = useRef<HTMLDivElement>(null);

  const handleBookingClick = () => {
    if (isAuthenticated) setBookingOpen(true);
    else { setAuthErr(''); setAuthOpen(true); }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErr('');
    if (!authEmail.trim() || !authPwd.trim()) {
      setAuthErr('Preencha e-mail e senha.');
      return;
    }
    setAuthLoading(true);
    const ok = await login(authEmail.trim(), authPwd);
    setAuthLoading(false);
    if (!ok) { setAuthErr('Credenciais inválidas.'); return; }
    toast.success('Bem-vindo(a)!');
    setAuthOpen(false);
    setAuthEmail(''); setAuthPwd('');
    setBookingOpen(true);
  };



  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', loop: false });
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [slideCount, setSlideCount] = useState(0);

  useEffect(() => {
    if (provider) setProvider(p => p ? { ...p, profileViews: (p.profileViews || 0) + 1 } : p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    setSlideCount(emblaApi.scrollSnapList().length);
    const onSel = () => setSelectedIdx(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSel);
    onSel();
    return () => { emblaApi.off('select', onSel); };
  }, [emblaApi]);

  useEffect(() => {
    if (!mapOpen || !provider || !mapRef.current) return;
    const { lat, lng, radiusKm } = provider.serviceArea;
    if (lat == null || lng == null) return;
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([lat, lng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    L.marker([lat, lng]).addTo(map);
    if (radiusKm) {
      L.circle([lat, lng], { radius: radiusKm * 1000, color: 'hsl(var(--primary))', fillOpacity: 0.1 }).addTo(map);
    }
    return () => { map.remove(); };
  }, [mapOpen, provider]);

  const reviews = useMemo(() => provider ? mockProviderReviews.filter(r => r.providerId === provider.id) : [], [provider]);
  const commentsVis = usePublicCommentsVisibility({ ownerId: provider?.id ?? '', isActive: !!provider?.isActive });

  const distribution = useMemo(() => {
    return [5, 4, 3, 2, 1].map(star => ({
      star,
      count: reviews.filter(r => r.rating === star).length,
      pct: reviews.length ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0,
    }));
  }, [reviews]);

  if (!provider) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Prestador não encontrado.</p>
        <Button onClick={() => navigate('/servicos')}>Voltar para Serviços</Button>
      </div>
    );
  }

  const cats = provider.categories.map(id => serviceCategories.find(c => c.id === id)?.name).filter(Boolean);
  const onContact = (channel: 'whatsapp' | 'phone') => {
    setProvider(p => p ? { ...p, contactClicks: (p.contactClicks || 0) + 1 } : p);
    const url = channel === 'whatsapp' ? `https://wa.me/${provider.whatsapp}` : `tel:${provider.phone}`;
    window.open(url, '_blank');
  };

  const availLabel = provider.availability.onDemand
    ? 'Sob agenda'
    : `${provider.availability.days.map(d => DAY_NAMES[d]).join(', ')} • ${provider.availability.from}–${provider.availability.to}`;

  type Slide = { kind: 'image'; src: string } | { kind: 'video'; src: string };
  const slides: Slide[] = [
    ...(provider.videos || []).map(src => ({ kind: 'video' as const, src })),
    ...provider.photos.map(src => ({ kind: 'image' as const, src })),
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b bg-background sticky top-0 z-20 backdrop-blur">
        <div className="container py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => goBack(navigate, '/servicos')} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold truncate flex-1">{provider.name}</h1>
        </div>
      </header>

      {/* Hero imersivo */}
      <section className="relative">
        <div className="h-72 sm:h-80 w-full overflow-hidden bg-muted relative">
          {provider.banner && <img src={provider.banner} alt="" className="h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 container pb-6">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0 flex-1 text-white pr-24 sm:pr-28">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  {provider.verified && (
                    <Badge variant="secondary" className="bg-success/20 text-success border-success/30 gap-1 backdrop-blur">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verificado
                    </Badge>
                  )}
                  <Badge variant="secondary" className="bg-white/15 text-white border-white/20 backdrop-blur">
                    {provider.type === 'company' ? 'Empresa' : 'Autônomo'}
                  </Badge>
                  <Button
                    size="sm"
                    className="hidden sm:flex h-7 gap-1.5 bg-[hsl(var(--whatsapp))] text-[hsl(var(--whatsapp-foreground))] hover:bg-[hsl(var(--whatsapp))]/90 shadow-md ml-1 border-0"
                    onClick={() => onContact('whatsapp')}
                  >
                    <BrandIcon name="whatsapp" variant="mono" size={14} className="text-[hsl(var(--whatsapp-foreground))]" /> WhatsApp
                  </Button>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold leading-tight drop-shadow">{provider.name}</h2>
                <div className="flex items-center gap-2 text-sm text-white/90 mt-1 flex-wrap">
                  <Star className="fill-warning text-warning h-4 w-4" />
                  <span className="font-semibold">{provider.rating.toFixed(1)}</span>
                  <span className="text-white/75">({provider.reviewCount} avaliações)</span>
                  <span className="text-white/50">•</span>
                  <span className="truncate text-white/90">{cats.join(' • ')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Logo flutuante */}
        <div className="container flex justify-end">
          <img
            src={provider.logo}
            alt={provider.name}
            className="h-20 w-20 rounded-full ring-4 ring-background bg-card object-cover shadow-md -mt-10 relative z-10"
          />
        </div>
      </section>

      {/* Barra de stats */}
      <section className="container border-b">
        <div className="relative">
          <div className="flex items-center gap-5 overflow-x-auto pb-4 pt-4 pr-10 sm:pr-0 [&::-webkit-scrollbar]:hidden snap-x snap-mandatory sm:snap-none" style={{ scrollbarWidth: 'none' }}>
            <div className="flex items-center gap-2 shrink-0 snap-start">
              <span className="text-3xl font-bold leading-none">{provider.rating.toFixed(1)}</span>
              <div className="flex flex-col">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3 w-3 ${i < Math.round(provider.rating) ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{provider.reviewCount} avaliações</span>
              </div>
            </div>
            <div className="h-10 w-px bg-border shrink-0" />
            <div className="shrink-0 snap-start">
              <p className="text-xs text-muted-foreground">Faixa de preço</p>
              <p className="text-success font-bold text-lg leading-tight">
                R$ {provider.priceRange.min}{provider.priceRange.max ? ` – ${provider.priceRange.max}` : ''}
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                por {formatPriceUnit(provider.priceRange.unit)}
              </p>
            </div>
            <div className="h-10 w-px bg-border shrink-0" />
            <div className="shrink-0 snap-start">
              <p className="text-xs text-muted-foreground">Disponibilidade</p>
              <Badge variant="secondary" className="gap-1 mt-0.5">
                <Calendar className="h-3 w-3" /> {availLabel}
              </Badge>
            </div>
          </div>
          {/* Indicador de scroll (mobile) */}
          <div className="sm:hidden pointer-events-none absolute top-0 right-0 h-full w-12 bg-gradient-to-l from-background via-background/80 to-transparent flex items-center justify-end pr-1">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center animate-pulse">
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </section>


      <main className="container py-6 space-y-6">
        {/* Sobre */}
        <section className="bg-card border rounded-xl p-4">
          <h3 className="font-semibold mb-2">Sobre</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{provider.bio}</p>
          {provider.priceRange.note && <p className="text-xs text-muted-foreground mt-2">{provider.priceRange.note}</p>}
          {provider.availability.note && <p className="text-xs text-muted-foreground mt-1">{provider.availability.note}</p>}
        </section>

        {/* Verificação de dados — Em breve */}
        <section className="bg-card border rounded-xl p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
            <BadgeCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">Verificação de dados</h3>
              <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px]">Em breve</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Em breve mostraremos aqui os dados verificados deste prestador.
            </p>
          </div>
        </section>

        {/* Galeria + Vídeos */}
        {slides.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Galeria de trabalhos</h3>
              {slideCount > 1 && (
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => emblaApi?.scrollPrev()}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => emblaApi?.scrollNext()}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex gap-3">
                {slides.map((s, i) => (
                  <div key={i} className="shrink-0 basis-2/3 sm:basis-1/2 md:basis-1/3 min-w-0">
                    {s.kind === 'image' ? (
                      <img src={s.src} alt={`Trabalho ${i + 1}`} loading="lazy" className="aspect-[4/3] w-full object-cover rounded-xl border" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveVideo(s.src)}
                        className="relative aspect-[4/3] w-full rounded-xl border overflow-hidden bg-muted group"
                      >
                        <video src={s.src} className="h-full w-full object-cover" muted preload="metadata" />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition flex items-center justify-center">
                          <span className="h-12 w-12 rounded-full bg-white/95 text-foreground flex items-center justify-center shadow-lg">
                            <Play className="h-5 w-5 fill-current ml-0.5" />
                          </span>
                        </div>
                        <Badge className="absolute top-2 left-2 bg-black/60 text-white border-0">Vídeo</Badge>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {slideCount > 1 && (
              <div className="flex justify-center gap-1.5 mt-3">
                {Array.from({ length: slideCount }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => emblaApi?.scrollTo(i)}
                    className={`h-1.5 rounded-full transition-all ${i === selectedIdx ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            )}
            {activeVideo && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setActiveVideo(null)}>
                <video src={activeVideo} controls autoPlay className="max-h-[85vh] max-w-full rounded-lg" onClick={e => e.stopPropagation()} />
              </div>
            )}
          </section>
        )}

        {/* Área de atendimento */}
        <section>
          <Collapsible open={mapOpen} onOpenChange={setMapOpen}>
            <CollapsibleTrigger className="w-full flex items-center justify-between gap-3 bg-card border rounded-xl p-3 hover:bg-muted/40 transition text-left">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">
                  <span className="font-medium">Área de atendimento</span>
                  <span className="text-muted-foreground"> • {provider.serviceArea.city}{provider.serviceArea.radiusKm && ` • ${provider.serviceArea.radiusKm} km`}</span>
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${mapOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div ref={mapRef} className="h-44 w-full rounded-lg overflow-hidden border bg-muted mt-3" />
            </CollapsibleContent>
          </Collapsible>
          {provider.serviceArea.neighborhoods && provider.serviceArea.neighborhoods.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Bairros já atendidos
              </p>
              <div className="flex flex-wrap gap-1.5">
                {provider.serviceArea.neighborhoods.map(n => (
                  <Badge key={n} variant="secondary" className="bg-primary/10 text-primary border border-primary/20">{n}</Badge>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Avaliações */}
        <section>
          <h3 className="font-semibold mb-3">Avaliações ({reviews.length})</h3>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há avaliações públicas.</p>
          ) : (
            <>
              <div className="bg-card border rounded-xl p-4 mb-3 grid grid-cols-[auto_1fr] gap-6 items-center">
                <div className="text-center">
                  <p className="text-5xl font-bold leading-none">{provider.rating.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground mt-1">de 5</p>
                  <div className="flex gap-0.5 justify-center mt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < Math.round(provider.rating) ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{reviews.length} avaliações</p>
                  {reviews.length > 0 && (
                    <p className="text-[11px] mt-1 font-semibold text-success">
                      {Math.round((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100)}% recomenda
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  {distribution.map(d => (
                    <div key={d.star} className="flex items-center gap-2 text-xs">
                      <span className="w-3 text-muted-foreground">{d.star}</span>
                      <Star className="h-3 w-3 fill-warning text-warning shrink-0" />
                      <Progress value={d.pct} className="h-1.5 flex-1" />
                      <span className="w-6 text-right text-muted-foreground tabular-nums">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {commentsVis.showComments ? (
                <div className="space-y-3">
                  {reviews.map(r => (
                    <div key={r.id} className="bg-card border rounded-xl p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                            {initials(r.customerName)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{r.customerName}</p>
                            <p className="text-xs text-muted-foreground">{format(parseISO(r.date), "dd MMM yyyy", { locale: ptBR })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2.5">{r.comment}</p>
                      {r.photos && r.photos.length > 0 && (
                        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mt-2 -mx-1 px-1">
                          {r.photos.map((src, i) => (
                            <img key={i} src={src} alt="" loading="lazy"
                              className="h-16 w-16 rounded-md object-cover border shrink-0" />
                          ))}
                        </div>
                      )}
                      {r.reply && (
                        <div className="mt-3 bg-primary/5 border-l-2 border-primary rounded-r-lg p-3">
                          <p className="text-xs font-medium text-primary mb-0.5">Resposta do prestador</p>
                          <p className="text-sm text-muted-foreground">{r.reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/20 p-4 flex items-center gap-3 text-sm text-muted-foreground">
                  <EyeOff className="h-4 w-4 shrink-0" />
                  <p>
                    Comentários indisponíveis no momento.
                    {commentsVis.hiddenReason === 'inactive' && ' A nota em estrelas continua refletindo o desempenho.'}
                  </p>
                </div>
              )}
            </>
          )}
        </section>

        {/* Dados legais */}
        {(provider.address || provider.cnpj) && (
          <p className="text-xs text-muted-foreground pt-2 border-t">
            {provider.address && <span>{provider.address}</span>}
            {provider.address && provider.cnpj && <span> • </span>}
            {provider.cnpj && <span>CNPJ {provider.cnpj}</span>}
          </p>
        )}
      </main>

      {/* CTA fixo — contato é o coração do modelo */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur-lg shadow-[0_-8px_24px_-8px_hsl(var(--foreground)/0.15)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-2xl items-stretch gap-2 px-3">
          <Button variant="outline" size="lg" className="gap-2 shrink-0 px-4" onClick={() => onContact('phone')} aria-label="Ligar">
            <Phone className="h-5 w-5" />
            <span className="hidden sm:inline">Ligar</span>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 shrink-0 px-4 border-primary/40 text-primary hover:bg-primary/10"
            onClick={handleBookingClick}
            aria-label="Agendar"
          >
            <Calendar className="h-5 w-5" />
            <span className="hidden sm:inline">Agendar</span>
          </Button>
          <Button
            size="lg"
            className="flex-1 gap-2 bg-[hsl(var(--whatsapp))] text-[hsl(var(--whatsapp-foreground))] hover:bg-[hsl(var(--whatsapp))]/90 shadow-lg shadow-[hsl(var(--whatsapp))]/25 font-semibold text-base ring-2 ring-[hsl(var(--whatsapp))]/20"
            onClick={() => onContact('whatsapp')}
          >
            <BrandIcon name="whatsapp" variant="mono" size={22} className="text-[hsl(var(--whatsapp-foreground))]" />
            Falar no WhatsApp
          </Button>
        </div>
      </div>

      {provider && <BookingSheet provider={provider} open={bookingOpen} onOpenChange={setBookingOpen} />}

      <Dialog open={authOpen} onOpenChange={(o) => { setAuthOpen(o); if (!o) { setAuthErr(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
              <LogIn className="h-5 w-5" />
            </div>
            <DialogTitle className="text-center">Faça login para agendar</DialogTitle>
            <DialogDescription className="text-center">
              Precisamos identificar você antes de reservar um horário com {provider.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAuthSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="pp-email" className="text-xs">E-mail</Label>
              <Input id="pp-email" type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="voce@email.com" autoFocus />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pp-pwd" className="text-xs">Senha</Label>
              <Input id="pp-pwd" type="password" value={authPwd} onChange={(e) => setAuthPwd(e.target.value)} placeholder="••••••••" />
            </div>
            {authErr && <p className="text-xs text-destructive">{authErr}</p>}
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="ghost" onClick={() => setAuthOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={authLoading}>{authLoading ? 'Entrando...' : 'Entrar e agendar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

