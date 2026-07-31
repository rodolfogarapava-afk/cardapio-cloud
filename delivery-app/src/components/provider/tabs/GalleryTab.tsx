import { useRef } from 'react';
import { Plus, Trash2, Image as ImageIcon, User, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceProvider } from '@/types';
import { SectionCard } from '../SectionCard';

interface Props { provider: ServiceProvider; onChange: (p: ServiceProvider) => void; }

export function GalleryTab({ provider, onChange }: Props) {
  const photoInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const urls = Array.from(files).map(f => URL.createObjectURL(f));
    onChange({ ...provider, photos: [...provider.photos, ...urls] });
  };
  const removePhoto = (i: number) => onChange({ ...provider, photos: provider.photos.filter((_, idx) => idx !== i) });
  const setSingle = (key: 'logo' | 'banner', f: File | null) => {
    if (!f) return;
    onChange({ ...provider, [key]: URL.createObjectURL(f) });
  };

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <SectionCard icon={User} title="Logo / Avatar" accent="info" subtitle="Usado nas listagens e no seu perfil">
          <div className="flex flex-col items-center gap-3">
            <img src={provider.logo} alt="logo" className="h-28 w-28 rounded-full object-cover ring-4 ring-info/10 border shadow-sm" />
            <input ref={logoInput} type="file" accept="image/*" hidden onChange={e => setSingle('logo', e.target.files?.[0] || null)} />
            <Button variant="outline" size="sm" onClick={() => logoInput.current?.click()} className="gap-2">
              <ImageIcon className="h-4 w-4" /> Trocar logo
            </Button>
          </div>
        </SectionCard>

        <SectionCard icon={Layers} title="Banner de capa" accent="primary" subtitle="Aparece no topo do seu perfil público">
          {provider.banner ? (
            <img src={provider.banner} alt="banner" className="h-28 w-full object-cover rounded-lg border shadow-sm" />
          ) : (
            <div className="h-28 w-full rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground text-sm bg-muted/30">
              <ImageIcon className="h-5 w-5 mr-2" /> Sem banner
            </div>
          )}
          <input ref={bannerInput} type="file" accept="image/*" hidden onChange={e => setSingle('banner', e.target.files?.[0] || null)} />
          <Button variant="outline" size="sm" onClick={() => bannerInput.current?.click()} className="gap-2 w-full">
            <ImageIcon className="h-4 w-4" /> Trocar banner
          </Button>
        </SectionCard>
      </div>

      <SectionCard
        icon={ImageIcon}
        title="Galeria de trabalhos"
        accent="success"
        subtitle={`${provider.photos.length} ${provider.photos.length === 1 ? 'foto' : 'fotos'} publicadas`}
        action={
          <>
            <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={e => addPhotos(e.target.files)} />
            <Button size="sm" onClick={() => photoInput.current?.click()} className="gap-2 mr-2">
              <Plus className="h-4 w-4" /> Adicionar fotos
            </Button>
          </>
        }
      >
        {provider.photos.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/20">
            <ImageIcon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-medium">Sem fotos ainda</p>
            <p className="text-xs text-muted-foreground mt-1">Fotos de trabalhos anteriores aumentam a confiança do cliente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {provider.photos.map((src, i) => (
              <div key={i} className="relative group overflow-hidden rounded-lg border shadow-sm">
                <img src={src} alt={`foto ${i+1}`} className="aspect-square w-full object-cover transition-transform group-hover:scale-105" />
                <button onClick={() => removePhoto(i)}
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/95 border shadow flex items-center justify-center text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
