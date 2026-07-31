import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, CheckCircle2, ChefHat, Package, Bike, Home as HomeIcon, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { goBack } from '@/lib/goBack';

type Step = 'received' | 'preparing' | 'ready' | 'in_transit' | 'delivered';

const STEPS: { key: Step; label: string; Icon: typeof CheckCircle2 }[] = [
  { key: 'received', label: 'Recebido', Icon: CheckCircle2 },
  { key: 'preparing', label: 'Preparando', Icon: ChefHat },
  { key: 'ready', label: 'Pronto', Icon: Package },
  { key: 'in_transit', label: 'A caminho', Icon: Bike },
  { key: 'delivered', label: 'Entregue', Icon: HomeIcon },
];

const STEP_SECONDS: Record<Step, number> = {
  received: 6,
  preparing: 12,
  ready: 6,
  in_transit: 20,
  delivered: 0,
};

const TOTAL_ETA_MIN = 28;

const STORE: [number, number] = [-23.5610, -46.6560];
const CLIENT: [number, number] = [-23.5489, -46.6388];

export default function AcompanharPedido() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();

  const [stepIdx, setStepIdx] = useState(0);
  const [stepElapsed, setStepElapsed] = useState(0);
  const [etaMin, setEtaMin] = useState(TOTAL_ETA_MIN);

  useEffect(() => {
    const t = setInterval(() => {
      setStepElapsed(prev => {
        const cur = STEPS[stepIdx].key;
        const dur = STEP_SECONDS[cur];
        if (dur === 0) return prev;
        if (prev + 1 >= dur) {
          setStepIdx(i => Math.min(i + 1, STEPS.length - 1));
          return 0;
        }
        return prev + 1;
      });
      setEtaMin(prev => (prev > 1 ? prev - 1 / 30 : 1));
    }, 1000);
    return () => clearInterval(t);
  }, [stepIdx]);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false, scrollWheelZoom: false }).setView(STORE, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const storeIcon = L.divIcon({
      className: '',
      html: `<div style="position:relative;display:flex;align-items:center;justify-content:center">
        <span style="position:absolute;inset:-10px;border-radius:9999px;background:hsl(var(--warning)/0.25);animation:ulPulse 2s ease-out infinite"></span>
        <div style="position:relative;background:hsl(var(--warning));color:hsl(var(--warning-foreground));border-radius:9999px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25);font-size:16px">🏪</div>
      </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    const clientIcon = L.divIcon({
      className: '',
      html: `<div style="position:relative;display:flex;align-items:center;justify-content:center">
        <span style="position:absolute;inset:-10px;border-radius:9999px;background:hsl(var(--success)/0.25);animation:ulPulse 2s ease-out infinite"></span>
        <div style="position:relative;background:hsl(var(--success));color:hsl(var(--success-foreground));border-radius:9999px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25);font-size:16px">🏠</div>
      </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    L.marker(STORE, { icon: storeIcon }).addTo(map);
    L.marker(CLIENT, { icon: clientIcon }).addTo(map);

    map.fitBounds(L.latLngBounds([STORE, CLIENT]), { padding: [60, 60] });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  const isDelivered = STEPS[stepIdx].key === 'delivered';
  const currentStep = STEPS[stepIdx];

  const etaText = useMemo(() => {
    if (isDelivered) return 'Entregue';
    const m = Math.max(1, Math.round(etaMin));
    return `Chega em ~${m} min`;
  }, [etaMin, isDelivered]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <style>{`@keyframes ulPulse{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.6);opacity:0}}`}</style>

      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="container flex items-center gap-3 py-3">
          <Button variant="ghost" size="icon" onClick={() => goBack(navigate, '/historico')} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Pedido</p>
            <h1 className="text-sm font-semibold truncate">{orderId ?? 'ORD-000000'}</h1>
          </div>
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
            isDelivered ? 'bg-success/10 text-success' : 'bg-info/10 text-info'
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', isDelivered ? 'bg-success' : 'bg-info')} />
            {etaText}
          </span>
        </div>
      </header>

      <div className="relative h-[42vh] min-h-[280px] w-full bg-muted">
        <div ref={mapRef} className="absolute inset-0" aria-label="Mapa: estabelecimento e endereço de entrega" />
      </div>

      <main className="container py-5 space-y-4 flex-1">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-1">
              {STEPS.map((s, i) => {
                const done = i <= stepIdx;
                const active = i === stepIdx;
                const Icon = s.Icon;
                return (
                  <div key={s.key} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                    <div className={cn(
                      'h-9 w-9 rounded-full flex items-center justify-center transition-colors',
                      done ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground',
                      active && !isDelivered && 'ring-4 ring-info/25 bg-info text-info-foreground animate-pulse'
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={cn(
                      'text-[10px] sm:text-xs text-center leading-tight truncate w-full',
                      done ? 'text-foreground font-medium' : 'text-muted-foreground'
                    )}>{s.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 rounded-md bg-muted/60 px-3 py-2 text-sm">
              <span className="font-medium">{currentStep.label}.</span>{' '}
              <span className="text-muted-foreground">
                {currentStep.key === 'received' && 'O restaurante confirmou seu pedido.'}
                {currentStep.key === 'preparing' && 'Seu pedido está sendo preparado com carinho.'}
                {currentStep.key === 'ready' && 'Pronto! Aguardando o entregador.'}
                {currentStep.key === 'in_transit' && 'Seu pedido saiu para entrega e está a caminho.'}
                {currentStep.key === 'delivered' && 'Pedido entregue. Bom apetite!'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              Para proteger a privacidade do entregador, não exibimos sua localização em tempo real nem o trajeto percorrido.
              Você acompanha as etapas e o tempo estimado de chegada.
            </div>
          </CardContent>
        </Card>

        {isDelivered && (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Pedido entregue!</p>
                <p className="text-xs text-muted-foreground">Avalie sua experiência e ajude outros clientes.</p>
              </div>
              <Button size="sm" onClick={() => navigate('/historico')}>Avaliar</Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
