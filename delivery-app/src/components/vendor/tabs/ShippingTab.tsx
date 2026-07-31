import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import {
  MapPin, Ruler, Building2, PencilRuler, Ban, Calculator,
  ChevronDown, ChevronUp, Plus, Trash2, Circle as CircleIcon, Square, Hexagon,
  Undo2, Eraser, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Mode = 'distance' | 'neighborhood' | 'draw';
type Tier = { id: string; km: number; fee: number };
type Hood = { id: string; name: string; fee: number };
type DrawShape = { id: string; kind: 'circle' | 'rect' | 'poly'; fee: number; label?: string };
type Blocked = { id: string; label: string };
type ConfirmAction =
  | { type: 'undo' }
  | { type: 'clear-shapes' }
  | { type: 'clear-blocked' }
  | { type: 'remove-shape'; id: string }
  | { type: 'remove-blocked'; id: string };

const uid = () => Math.random().toString(36).slice(2, 9);
const CENTER: [number, number] = [-23.55, -46.633];
const DELIVERY = 'hsl(var(--vendor, var(--primary)))';
const DANGER = 'hsl(var(--destructive))';

// ---- Fix leaflet-draw 1.0.4 "type is not defined" bug (readableArea) ----
// Known upstream bug with modern bundlers; override with a safe implementation.
(function patchLeafletDraw() {
  const GU = (L as any).GeometryUtil;
  if (!GU) return;
  GU.readableArea = function (area: number, isMetric: boolean) {
    if (isMetric === false) {
      const yards = area * 1.19599;
      if (yards >= 3097600) return (yards / 3097600).toFixed(2) + ' mi²';
      if (yards >= 4840) return (yards / 4840).toFixed(2) + ' acres';
      return Math.ceil(yards) + ' yd²';
    }
    if (area >= 1000000) return (area * 0.000001).toFixed(2) + ' km²';
    if (area >= 10000) return (area * 0.0001).toFixed(2) + ' ha';
    return Math.ceil(area) + ' m²';
  };
})();

// ---- Small collapsible card
function Section({
  icon: Icon, title, subtitle, open, onToggle, children, tone = 'default',
}: {
  icon: any; title: string; subtitle?: string; open: boolean; onToggle: () => void;
  children: React.ReactNode; tone?: 'default' | 'danger';
}) {
  return (
    <div className={cn(
      'bg-card border rounded-xl overflow-hidden transition-shadow',
      open && 'shadow-sm',
      tone === 'danger' && 'border-destructive/30',
    )}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
            tone === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground',
          )}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{title}</div>
            {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t">{children}</div>}
    </div>
  );
}

export function ShippingTab() {
  // ---- Mode + configs
  const [mode, setMode] = useState<Mode>('distance');
  const [radius, setRadius] = useState(8);
  const [baseFee, setBaseFee] = useState(5);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [hoods, setHoods] = useState<Hood[]>([
    { id: uid(), name: 'Centro', fee: 5 },
    { id: uid(), name: 'Jardins', fee: 7 },
  ]);
  const [newHood, setNewHood] = useState({ name: '', fee: '' });

  const [shapes, setShapes] = useState<DrawShape[]>([]);
  const [blocked, setBlocked] = useState<Blocked[]>([]);
  const [freeAbove, setFreeAbove] = useState<number>(0);
  const [freeEnabled, setFreeEnabled] = useState(false);

  const [simDist, setSimDist] = useState('');
  const [simHood, setSimHood] = useState('');

  const [openBlocked, setOpenBlocked] = useState(false);
  const [openExtras, setOpenExtras] = useState(false);

  const [drawing, setDrawing] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);

  // ---- Leaflet refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const distanceLayer = useRef<L.LayerGroup | null>(null);
  const drawLayer = useRef<L.FeatureGroup | null>(null);
  const blockedLayer = useRef<L.FeatureGroup | null>(null);
  const shapeMeta = useRef<Map<number, string>>(new Map()); // leafletId → shape.id
  const blockedMeta = useRef<Map<number, string>>(new Map());
  const activeHandler = useRef<any>(null);
  // history stack: last created shapes in order
  const history = useRef<{ target: 'delivery' | 'blocked'; id: string }[]>([]);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false }).setView(CENTER, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    L.marker(CENTER).addTo(map);

    distanceLayer.current = L.layerGroup().addTo(map);
    drawLayer.current = new L.FeatureGroup().addTo(map);
    blockedLayer.current = new L.FeatureGroup().addTo(map);

    map.on((L as any).Draw.Event.CREATED, (e: any) => {
      const activeMode = (map as any)._uselivreActiveDraw as 'delivery' | 'blocked' | undefined;
      const layer = e.layer as L.Layer;
      if (activeMode === 'blocked') {
        blockedLayer.current!.addLayer(layer);
        if ('setStyle' in layer) {
          (layer as any).setStyle({ color: DANGER, fillColor: DANGER, fillOpacity: 0.25, weight: 2 });
        }
        const id = uid();
        blockedMeta.current.set((layer as any)._leaflet_id, id);
        history.current.push({ target: 'blocked', id });
        setBlocked(b => [...b, { id, label: 'Área bloqueada' }]);
        toast.success('Zona bloqueada adicionada');
      } else {
        drawLayer.current!.addLayer(layer);
        const kind: DrawShape['kind'] =
          e.layerType === 'circle' ? 'circle' :
          e.layerType === 'rectangle' ? 'rect' : 'poly';
        if ('setStyle' in layer) {
          (layer as any).setStyle({ color: DELIVERY, fillColor: DELIVERY, fillOpacity: 0.15, weight: 2 });
        }
        const id = uid();
        shapeMeta.current.set((layer as any)._leaflet_id, id);
        history.current.push({ target: 'delivery', id });
        setShapes(s => [...s, { id, kind, fee: 6 }]);
        toast.success('Área de entrega desenhada');
      }
      activeHandler.current = null;
      setDrawing(false);
    });

    map.on((L as any).Draw.Event.DRAWSTOP, () => {
      activeHandler.current = null;
      setDrawing(false);
    });

    mapInstance.current = map;
    // Ensure proper sizing after layout settles (mobile/tab switches)
    const t = setTimeout(() => map.invalidateSize(), 150);
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Cancel drawing with Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelDraw();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render "distance" mode overlay
  useEffect(() => {
    const g = distanceLayer.current;
    if (!g) return;
    g.clearLayers();
    if (mode !== 'distance') return;
    L.circle(CENTER, {
      radius: radius * 1000,
      color: DELIVERY, fillColor: DELIVERY, fillOpacity: 0.08, weight: 2,
    }).addTo(g);
    tiers.forEach(t => {
      L.circle(CENTER, {
        radius: t.km * 1000,
        color: DELIVERY, fillColor: DELIVERY, fillOpacity: 0.05,
        weight: 1, dashArray: '4 4',
      }).addTo(g);
    });
    mapInstance.current?.fitBounds(L.latLng(CENTER).toBounds(radius * 2000));
  }, [mode, radius, tiers]);

  // Toggle draw-layer visibility by mode + fix size on mode change
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !drawLayer.current) return;
    if (mode === 'draw') {
      if (!map.hasLayer(drawLayer.current)) map.addLayer(drawLayer.current);
    } else {
      cancelDraw();
      if (map.hasLayer(drawLayer.current)) map.removeLayer(drawLayer.current);
    }
    setTimeout(() => map.invalidateSize(), 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ---- Draw helpers
  const cancelDraw = () => {
    if (activeHandler.current) {
      try { activeHandler.current.disable(); } catch { /* noop */ }
      activeHandler.current = null;
    }
    setDrawing(false);
  };

  const startDraw = (tool: 'circle' | 'rectangle' | 'polygon', target: 'delivery' | 'blocked') => {
    const map = mapInstance.current;
    if (!map) return;
    cancelDraw();
    (map as any)._uselivreActiveDraw = target;
    const color = target === 'blocked' ? DANGER : DELIVERY;
    const opts: any = {
      shapeOptions: { color, fillColor: color, fillOpacity: 0.15, weight: 2 },
      showArea: false,
      metric: true,
    };
    let handler: any;
    if (tool === 'circle') handler = new (L as any).Draw.Circle(map, opts);
    if (tool === 'rectangle') handler = new (L as any).Draw.Rectangle(map, opts);
    if (tool === 'polygon') handler = new (L as any).Draw.Polygon(map, { ...opts, allowIntersection: false });
    activeHandler.current = handler;
    handler?.enable();
    setDrawing(true);
    toast.info('Desenhe no mapa · Esc para cancelar');
  };

  const doRemoveShape = (id: string) => {
    const fg = drawLayer.current!;
    fg.eachLayer(l => {
      if (shapeMeta.current.get((l as any)._leaflet_id) === id) fg.removeLayer(l);
    });
    history.current = history.current.filter(h => h.id !== id);
    setShapes(s => s.filter(x => x.id !== id));
  };
  const doRemoveBlocked = (id: string) => {
    const fg = blockedLayer.current!;
    fg.eachLayer(l => {
      if (blockedMeta.current.get((l as any)._leaflet_id) === id) fg.removeLayer(l);
    });
    history.current = history.current.filter(h => h.id !== id);
    setBlocked(b => b.filter(x => x.id !== id));
  };

  const doUndo = () => {
    const last = history.current.pop();
    if (!last) return;
    if (last.target === 'delivery') {
      const fg = drawLayer.current!;
      fg.eachLayer(l => { if (shapeMeta.current.get((l as any)._leaflet_id) === last.id) fg.removeLayer(l); });
      setShapes(s => s.filter(x => x.id !== last.id));
    } else {
      const fg = blockedLayer.current!;
      fg.eachLayer(l => { if (blockedMeta.current.get((l as any)._leaflet_id) === last.id) fg.removeLayer(l); });
      setBlocked(b => b.filter(x => x.id !== last.id));
    }
    toast.success('Última ação desfeita');
  };

  const doClearShapes = () => {
    drawLayer.current?.clearLayers();
    shapeMeta.current.clear();
    history.current = history.current.filter(h => h.target !== 'delivery');
    setShapes([]);
    toast.success('Áreas de entrega removidas');
  };
  const doClearBlocked = () => {
    blockedLayer.current?.clearLayers();
    blockedMeta.current.clear();
    history.current = history.current.filter(h => h.target !== 'blocked');
    setBlocked([]);
    toast.success('Zonas bloqueadas removidas');
  };

  const runConfirm = () => {
    if (!confirm) return;
    switch (confirm.type) {
      case 'undo': doUndo(); break;
      case 'clear-shapes': doClearShapes(); break;
      case 'clear-blocked': doClearBlocked(); break;
      case 'remove-shape': doRemoveShape(confirm.id); toast.success('Área removida'); break;
      case 'remove-blocked': doRemoveBlocked(confirm.id); toast.success('Zona removida'); break;
    }
    setConfirm(null);
  };

  const confirmCopy: Record<ConfirmAction['type'], { title: string; desc: string }> = {
    'undo': { title: 'Desfazer última ação?', desc: 'A última forma desenhada será removida do mapa.' },
    'clear-shapes': { title: 'Limpar todas as áreas de entrega?', desc: 'Todas as áreas desenhadas serão apagadas. Essa ação não pode ser desfeita.' },
    'clear-blocked': { title: 'Limpar todas as zonas bloqueadas?', desc: 'Todas as zonas bloqueadas serão apagadas. Essa ação não pode ser desfeita.' },
    'remove-shape': { title: 'Remover esta área?', desc: 'A área de entrega será removida do mapa.' },
    'remove-blocked': { title: 'Remover esta zona bloqueada?', desc: 'A zona bloqueada será removida do mapa.' },
  };

  // ---- Simulator
  const simulate = (): string => {
    if (mode === 'distance') {
      const d = parseFloat(simDist.replace(',', '.'));
      if (!d || isNaN(d)) return '—';
      if (d > radius) return 'Fora da área de entrega';
      const tier = [...tiers].sort((a, b) => a.km - b.km).find(t => d <= t.km);
      const fee = tier?.fee ?? baseFee;
      if (freeEnabled && freeAbove > 0) return `R$ ${fee.toFixed(2)} · grátis acima de R$ ${freeAbove.toFixed(2)}`;
      return `R$ ${fee.toFixed(2)}`;
    }
    if (mode === 'neighborhood') {
      const match = hoods.find(h => h.name.toLowerCase() === simHood.trim().toLowerCase());
      if (!match) return simHood ? 'Bairro não atendido' : '—';
      return `R$ ${match.fee.toFixed(2)}`;
    }
    return 'Desenhe áreas no mapa e defina taxa por área';
  };

  const summary =
    mode === 'distance' ? `Por distância · ${radius} km · a partir de R$ ${baseFee.toFixed(2)}` :
    mode === 'neighborhood' ? `Por bairro · ${hoods.length} bairro(s)` :
    `Desenho no mapa · ${shapes.length} área(s)`;

  const canUndo = history.current.length > 0;

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Área de entrega
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{summary}</p>
        </div>
        <Button size="sm" onClick={() => toast.success('Configurações salvas')}>Salvar</Button>
      </div>

      {/* Mode selector */}
      <div className="bg-card border rounded-xl p-1.5 inline-flex flex-wrap gap-1 w-full sm:w-auto">
        {([
          { id: 'distance', label: 'Por distância', icon: Ruler },
          { id: 'neighborhood', label: 'Por bairro', icon: Building2 },
          { id: 'draw', label: 'Desenhar no mapa', icon: PencilRuler },
        ] as { id: Mode; label: string; icon: any }[]).map(o => {
          const active = mode === o.id;
          const Icon = o.icon;
          return (
            <button
              key={o.id}
              onClick={() => setMode(o.id)}
              className={cn(
                'flex-1 sm:flex-none px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors',
                active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <Icon className="h-4 w-4" /> {o.label}
            </button>
          );
        })}
      </div>

      {/* Map + controls */}
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-card border rounded-xl overflow-hidden relative isolate z-0">
          <div ref={mapRef} className="h-[360px] lg:h-[520px] w-full bg-muted" />
          {drawing && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-2 bg-card border shadow-md rounded-full pl-3 pr-1.5 py-1.5">
              <span className="text-xs font-medium">Desenhando…</span>
              <Button size="sm" variant="ghost" className="h-7 rounded-full text-xs" onClick={cancelDraw}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancelar
              </Button>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-3">
          {/* DISTANCE MODE */}
          {mode === 'distance' && (
            <div className="bg-card border rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                  <Ruler className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Por distância</div>
                  <div className="text-xs text-muted-foreground">Raio a partir da loja</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Raio máximo: <span className="font-semibold">{radius} km</span></Label>
                <Slider value={[radius]} min={1} max={30} step={1} onValueChange={v => setRadius(v[0])} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Taxa base (R$)</Label>
                  <Input type="number" step="0.5" value={baseFee} onChange={e => setBaseFee(+e.target.value || 0)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Distância máxima</Label>
                  <Input value={`${radius} km`} readOnly className="h-9 bg-muted" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Faixas por distância (opcional)</Label>
                  {tiers.length < 3 && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs"
                      onClick={() => setTiers(t => [...t, { id: uid(), km: Math.min(radius, (t[t.length - 1]?.km ?? 0) + 2), fee: baseFee + t.length + 1 }])}>
                      <Plus className="h-3 w-3 mr-1" /> Faixa
                    </Button>
                  )}
                </div>
                {tiers.length === 0 && <div className="text-xs text-muted-foreground">Sem faixas — cobra R$ {baseFee.toFixed(2)} em toda a área.</div>}
                {tiers.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-10">até</span>
                    <Input type="number" value={t.km} onChange={e => setTiers(list => list.map(x => x.id === t.id ? { ...x, km: +e.target.value } : x))} className="h-8 w-16" />
                    <span className="text-xs text-muted-foreground">km · R$</span>
                    <Input type="number" step="0.5" value={t.fee} onChange={e => setTiers(list => list.map(x => x.id === t.id ? { ...x, fee: +e.target.value } : x))} className="h-8 w-20" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      onClick={() => setTiers(list => list.filter(x => x.id !== t.id))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NEIGHBORHOOD MODE */}
          {mode === 'neighborhood' && (
            <div className="bg-card border rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Por bairro</div>
                  <div className="text-xs text-muted-foreground">Adicione bairros e taxas</div>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_100px_auto] gap-2">
                <Input placeholder="Nome do bairro" value={newHood.name}
                  onChange={e => setNewHood(h => ({ ...h, name: e.target.value }))} className="h-9" />
                <Input placeholder="R$" type="number" step="0.5" value={newHood.fee}
                  onChange={e => setNewHood(h => ({ ...h, fee: e.target.value }))} className="h-9" />
                <Button size="sm" className="h-9"
                  disabled={!newHood.name || !newHood.fee}
                  onClick={() => {
                    setHoods(h => [...h, { id: uid(), name: newHood.name.trim(), fee: +newHood.fee }]);
                    setNewHood({ name: '', fee: '' });
                    toast.success('Bairro adicionado');
                  }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto -mx-1 px-1">
                {hoods.length === 0 && <div className="text-xs text-muted-foreground py-4 text-center">Nenhum bairro adicionado.</div>}
                {hoods.map(h => (
                  <div key={h.id} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate flex-1">{h.name}</span>
                    <Input type="number" step="0.5" value={h.fee}
                      onChange={e => setHoods(list => list.map(x => x.id === h.id ? { ...x, fee: +e.target.value } : x))}
                      className="h-7 w-20 text-xs" />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={() => setHoods(list => list.filter(x => x.id !== h.id))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DRAW MODE */}
          {mode === 'draw' && (
            <div className="bg-card border rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                  <PencilRuler className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Desenhar no mapa</div>
                  <div className="text-xs text-muted-foreground">Círculos, quadrados ou polígonos</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" className="h-9" onClick={() => startDraw('circle', 'delivery')}>
                  <CircleIcon className="h-4 w-4 mr-1" /> Círculo
                </Button>
                <Button variant="outline" size="sm" className="h-9" onClick={() => startDraw('rectangle', 'delivery')}>
                  <Square className="h-4 w-4 mr-1" /> Quadrado
                </Button>
                <Button variant="outline" size="sm" className="h-9" onClick={() => startDraw('polygon', 'delivery')}>
                  <Hexagon className="h-4 w-4 mr-1" /> Polígono
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" className="h-9 text-xs" disabled={!canUndo}
                  onClick={() => setConfirm({ type: 'undo' })}>
                  <Undo2 className="h-4 w-4 mr-1" /> Desfazer última
                </Button>
                <Button variant="ghost" size="sm" className="h-9 text-xs text-destructive" disabled={shapes.length === 0}
                  onClick={() => setConfirm({ type: 'clear-shapes' })}>
                  <Eraser className="h-4 w-4 mr-1" /> Limpar tudo
                </Button>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {shapes.length === 0 && <div className="text-xs text-muted-foreground py-4 text-center">Nenhuma área desenhada.</div>}
                {shapes.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {s.kind === 'circle' ? 'Círculo' : s.kind === 'rect' ? 'Quadrado' : 'Polígono'} #{i + 1}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">R$</span>
                    <Input type="number" step="0.5" value={s.fee}
                      onChange={e => setShapes(list => list.map(x => x.id === s.id ? { ...x, fee: +e.target.value } : x))}
                      className="h-7 w-20 text-xs" />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={() => setConfirm({ type: 'remove-shape', id: s.id })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Blocked zones */}
      <Section
        icon={Ban}
        title="Zonas que não atendo"
        subtitle={blocked.length ? `${blocked.length} área(s) bloqueada(s)` : 'Marque áreas perigosas ou sem acesso'}
        open={openBlocked}
        onToggle={() => setOpenBlocked(v => !v)}
        tone="danger"
      >
        <div className="pt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="h-9" onClick={() => startDraw('circle', 'blocked')}>
              <CircleIcon className="h-4 w-4 mr-1 text-destructive" /> Círculo bloqueado
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={() => startDraw('polygon', 'blocked')}>
              <Hexagon className="h-4 w-4 mr-1 text-destructive" /> Polígono bloqueado
            </Button>
            <Button variant="ghost" size="sm" className="h-9 text-xs text-destructive" disabled={blocked.length === 0}
              onClick={() => setConfirm({ type: 'clear-blocked' })}>
              <Eraser className="h-4 w-4 mr-1" /> Limpar zonas
            </Button>
          </div>
          <div className="space-y-1.5">
            {blocked.length === 0 && <div className="text-xs text-muted-foreground py-2">Sem zonas bloqueadas.</div>}
            {blocked.map((b, i) => (
              <div key={b.id} className="flex items-center gap-2 bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                <Ban className="h-4 w-4 text-destructive shrink-0" />
                <Input value={b.label}
                  onChange={e => setBlocked(list => list.map(x => x.id === b.id ? { ...x, label: e.target.value } : x))}
                  placeholder={`Área #${i + 1}`}
                  className="h-7 text-xs bg-background" />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                  onClick={() => setConfirm({ type: 'remove-blocked', id: b.id })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Extras + Simulator */}
      <Section
        icon={Calculator}
        title="Extras e simulador"
        subtitle="Frete grátis condicional e teste de valores"
        open={openExtras}
        onToggle={() => setOpenExtras(v => !v)}
      >
        <div className="pt-3 grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Frete grátis condicional</div>
                <div className="text-xs text-muted-foreground">Isenta a taxa acima de um valor</div>
              </div>
              <Switch checked={freeEnabled} onCheckedChange={setFreeEnabled} />
            </div>
            {freeEnabled && (
              <div className="space-y-1.5">
                <Label className="text-xs">Grátis acima de (R$)</Label>
                <Input type="number" step="0.5" value={freeAbove} onChange={e => setFreeAbove(+e.target.value || 0)} className="h-9" />
              </div>
            )}
          </div>

          <div className="space-y-2 bg-muted/40 rounded-lg p-3">
            <div className="text-sm font-medium flex items-center gap-2"><Calculator className="h-4 w-4" /> Simulador</div>
            {mode === 'distance' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Distância (km)</Label>
                <Input placeholder="Ex: 4.5" value={simDist} onChange={e => setSimDist(e.target.value)} className="h-9 bg-background" />
              </div>
            )}
            {mode === 'neighborhood' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Bairro</Label>
                <Input placeholder="Ex: Centro" value={simHood} onChange={e => setSimHood(e.target.value)} className="h-9 bg-background" />
              </div>
            )}
            <div className="text-xs text-muted-foreground pt-1">Taxa estimada</div>
            <div className="text-lg font-semibold">{simulate()}</div>
          </div>
        </div>
      </Section>

      {/* Confirmation dialog for all destructive actions */}
      <AlertDialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm ? confirmCopy[confirm.type].title : ''}</AlertDialogTitle>
            <AlertDialogDescription>{confirm ? confirmCopy[confirm.type].desc : ''}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={runConfirm}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
