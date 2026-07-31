import { useEffect, useRef, useState } from 'react';
import { X, MapPin, Map as MapIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ServiceProvider } from '@/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SectionCard } from '../SectionCard';

interface Props { provider: ServiceProvider; onChange: (p: ServiceProvider) => void; }

export function ServiceAreaTab({ provider, onChange }: Props) {
  const area = provider.serviceArea;
  const [newHood, setNewHood] = useState('');
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const set = (patch: Partial<typeof area>) => onChange({ ...provider, serviceArea: { ...area, ...patch } });

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const lat = area.lat ?? -23.55, lng = area.lng ?? -46.633;
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([lat, lng], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    L.marker([lat, lng]).addTo(map);
    circleRef.current = L.circle([lat, lng], { radius: (area.radiusKm ?? 10) * 1000, color: 'hsl(var(--primary))', fillOpacity: 0.1 }).addTo(map);
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (circleRef.current && area.radiusKm) circleRef.current.setRadius(area.radiusKm * 1000);
  }, [area.radiusKm]);

  const addHood = () => {
    if (!newHood.trim()) return;
    set({ neighborhoods: [...(area.neighborhoods || []), newHood.trim()] });
    setNewHood('');
  };
  const rmHood = (n: string) => set({ neighborhoods: (area.neighborhoods || []).filter(x => x !== n) });

  return (
    <div className="space-y-5">
      <SectionCard icon={MapPin} title="Área de atendimento" accent="warning" subtitle="Cidade, raio e bairros que você atende">
        <div className="space-y-1.5">
          <Label>Cidade</Label>
          <Input value={area.city} onChange={e => set({ city: e.target.value })} />
        </div>

        <div className="space-y-2 rounded-lg bg-warning/5 border border-warning/20 p-3">
          <Label>Raio de atendimento: <span className="font-bold text-warning tabular-nums">{area.radiusKm ?? 10} km</span></Label>
          <Slider value={[area.radiusKm ?? 10]} min={1} max={50} step={1} onValueChange={v => set({ radiusKm: v[0] })} />
        </div>

        <div className="space-y-2">
          <Label>Bairros atendidos</Label>
          <div className="flex gap-2">
            <Input value={newHood} onChange={e => setNewHood(e.target.value)} placeholder="Adicionar bairro" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addHood())} />
            <Button type="button" onClick={addHood}>Adicionar</Button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(area.neighborhoods || []).length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum bairro cadastrado ainda.</p>
            )}
            {(area.neighborhoods || []).map(n => (
              <Badge key={n} variant="secondary" className="bg-primary/10 text-primary border border-primary/20 gap-1">
                {n}
                <button onClick={() => rmHood(n)}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={MapIcon} title="Mapa da região" accent="info" subtitle="Preview do raio de atendimento no mapa">
        <div ref={mapRef} className="h-72 w-full rounded-lg overflow-hidden border bg-muted shadow-sm" />
      </SectionCard>
    </div>
  );
}
