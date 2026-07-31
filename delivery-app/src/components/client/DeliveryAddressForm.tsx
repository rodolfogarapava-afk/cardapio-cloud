import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DeliveryAddress } from '@/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface DeliveryAddressFormProps {
  address: DeliveryAddress | null;
  onSave: (address: DeliveryAddress) => void;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    town?: string;
    state?: string;
  };
}

export function DeliveryAddressForm({ address, onSave }: DeliveryAddressFormProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showForm, setShowForm] = useState(!!address);

  const [form, setForm] = useState<DeliveryAddress>(
    address || {
      street: '',
      number: '',
      quadra: '',
      lote: '',
      neighborhood: '',
      complement: '',
      aptBloco: '',
      referencePoint: '',
      city: '',
      state: '',
    }
  );

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const setMarker = useCallback((lat: number, lng: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    }
    map.setView([lat, lng], 16);
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}`
      );
      const data: NominatimResult = await res.json();
      setSearchQuery(data.display_name);
      setForm(prev => ({
        ...prev,
        street: data.address.road || prev.street,
        number: data.address.house_number || prev.number,
        neighborhood: data.address.suburb || prev.neighborhood,
        city: data.address.city || data.address.town || prev.city,
        state: data.address.state || prev.state,
        lat,
        lng,
      }));
    } catch {
      setForm(prev => ({ ...prev, lat, lng }));
    }
    setShowForm(true);
  }, []);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initLat = address?.lat ?? -15.7801;
    const initLng = address?.lng ?? -47.9292;
    const initZoom = address?.lat ? 16 : 4;

    const map = L.map(mapRef.current, {
      center: [initLat, initLng],
      zoom: initZoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    if (address?.lat && address?.lng) {
      markerRef.current = L.marker([address.lat, address.lng]).addTo(map);
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      setMarker(e.latlng.lat, e.latlng.lng);
      reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;

    // Force resize after mount (sheet animation)
    setTimeout(() => map.invalidateSize(), 300);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}&countrycodes=br`
      );
      const data: NominatimResult[] = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => handleSearch(value), 500);
  };

  const selectResult = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setMarker(lat, lng);
    setSearchResults([]);
    setSearchQuery(result.display_name);
    setShowForm(true);

    setForm(prev => ({
      ...prev,
      street: result.address.road || '',
      number: result.address.house_number || '',
      neighborhood: result.address.suburb || '',
      city: result.address.city || result.address.town || '',
      state: result.address.state || '',
      lat,
      lng,
    }));
  };

  const updateField = (field: keyof DeliveryAddress, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const isValid = (form.lat && form.lng) || form.street;

  const handleSave = () => {
    if (!isValid) return;
    onSave(form);
  };

  return (
    <div className="border-b border-border px-5 py-4 space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs font-semibold text-foreground">Endereço de entrega</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar endereço..."
          value={searchQuery}
          onChange={e => handleSearchInput(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
        {searching && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
        )}

        {searchResults.length > 0 && (
          <div className="absolute z-[9999] left-0 right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map((r, i) => (
              <button
                key={i}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors border-b border-border last:border-0"
                onClick={() => selectResult(r)}
              >
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className="rounded-lg overflow-hidden border border-border"
        style={{ height: 180 }}
      />
      <p className="text-[10px] text-muted-foreground">Clique no mapa ou busque para definir a localização</p>

      {/* Address details form */}
      {showForm && (
        <>
          <button
            className="flex items-center gap-1 text-xs font-medium text-primary"
            onClick={() => setShowForm(false)}
          >
            Detalhes do endereço
            <ChevronUp className="h-3 w-3" />
          </button>

          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <Label className="text-[11px]">Rua / Avenida</Label>
              <Input value={form.street} onChange={e => updateField('street', e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[11px]">Nº *</Label>
              <Input value={form.number} onChange={e => updateField('number', e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[11px]">Quadra</Label>
              <Input value={form.quadra || ''} onChange={e => updateField('quadra', e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[11px]">Lote</Label>
              <Input value={form.lote || ''} onChange={e => updateField('lote', e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[11px]">Bairro *</Label>
              <Input value={form.neighborhood} onChange={e => updateField('neighborhood', e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[11px]">Complemento</Label>
              <Input value={form.complement || ''} onChange={e => updateField('complement', e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[11px]">Apto/Bloco/Casa</Label>
              <Input value={form.aptBloco || ''} onChange={e => updateField('aptBloco', e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="col-span-2">
              <Label className="text-[11px]">Ponto de referência *</Label>
              <Input value={form.referencePoint} onChange={e => updateField('referencePoint', e.target.value)} className="h-8 text-xs" placeholder="Ex: Próximo ao mercado..." />
            </div>
            <div>
              <Label className="text-[11px]">Cidade *</Label>
              <Input value={form.city} onChange={e => updateField('city', e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[11px]">Estado *</Label>
              <Input value={form.state} onChange={e => updateField('state', e.target.value)} className="h-8 text-xs" />
            </div>
          </div>

          <div className="sticky bottom-0 bg-background pt-2 pb-1">
            <Button
              size="sm"
              className="w-full h-9 text-xs font-semibold"
              disabled={!isValid}
              onClick={handleSave}
            >
              Confirmar endereço
            </Button>
          </div>
        </>
      )}

      {!showForm && !address && (
        <button
          className="flex items-center gap-1 text-xs font-medium text-primary"
          onClick={() => setShowForm(true)}
        >
          Preencher detalhes do endereço
          <ChevronDown className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
