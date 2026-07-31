import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useBanners, upsertBanner, removeBanner, toggleBanner, newBannerId,
  PromoBanner, TONE_PRESETS,
} from '@/data/banners';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CTA_OPTIONS = [
  { value: '/alimentacao', label: 'Alimentação' },
  { value: '/servicos', label: 'Serviços' },
  { value: '/ver-tudo', label: 'Ver tudo' },
  { value: '/', label: 'Home' },
];

const empty = (): PromoBanner => ({
  id: newBannerId(),
  title: '',
  subtitle: '',
  image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&h=300&fit=crop',
  ctaText: 'Ver mais',
  ctaHref: '/alimentacao',
  tone: TONE_PRESETS[0].value,
  active: true,
});

export function MarketingTab() {
  const banners = useBanners();
  const [editing, setEditing] = useState<PromoBanner | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openNew = () => { setEditing(empty()); setIsNew(true); };
  const openEdit = (b: PromoBanner) => { setEditing({ ...b }); setIsNew(false); };

  const save = () => {
    if (!editing) return;
    if (!editing.title.trim()) { toast.error('Título é obrigatório'); return; }
    upsertBanner(editing);
    toast.success(isNew ? 'Banner criado' : 'Banner atualizado');
    setEditing(null);
  };

  const onDelete = (id: string) => {
    removeBanner(id);
    toast.success('Banner removido');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm text-muted-foreground">
            {banners.filter(b => b.active).length} ativo(s) de {banners.length} total
          </p>
          <p className="text-xs text-muted-foreground/70">
            Banners exibidos na home de alimentação para todos os clientes.
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo banner
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {banners.map(b => (
          <div key={b.id} className="bg-card rounded-xl border overflow-hidden">
            <div className="relative h-32">
              <img src={b.image} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
              <div className={cn('absolute inset-0 bg-gradient-to-r', b.tone)} />
              <div className="relative h-full flex flex-col justify-center px-4 text-primary-foreground max-w-[70%]">
                <h4 className="font-bold text-base drop-shadow leading-tight">{b.title || 'Sem título'}</h4>
                <p className="text-xs mt-0.5 opacity-90 line-clamp-2 drop-shadow">{b.subtitle}</p>
              </div>
              {!b.active && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-background/95 text-foreground text-[10px]">Oculto</Badge>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between p-3 gap-2">
              <div className="text-xs text-muted-foreground truncate">
                {b.ctaText} <ArrowRight className="inline h-3 w-3" /> {b.ctaHref}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => toggleBanner(b.id)} title={b.active ? 'Ocultar' : 'Exibir'}>
                  {b.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(b)} title="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(b.id)} title="Remover">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle>{isNew ? 'Novo banner' : 'Editar banner'}</DialogTitle>
                <DialogDescription>
                  As alterações refletem imediatamente na home do cliente.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="b-title">Título</Label>
                  <Input id="b-title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="b-subtitle">Subtítulo</Label>
                  <Textarea id="b-subtitle" rows={2} value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="b-image" className="flex items-center gap-1">
                    <ImageIcon className="h-3.5 w-3.5" /> URL da imagem
                  </Label>
                  <Input id="b-image" value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="b-cta-text">CTA</Label>
                    <Input id="b-cta-text" value={editing.ctaText} onChange={(e) => setEditing({ ...editing, ctaText: e.target.value })} />
                  </div>
                  <div>
                    <Label>Destino</Label>
                    <Select value={editing.ctaHref} onValueChange={(v) => setEditing({ ...editing, ctaHref: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CTA_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Tom (cor de destaque)</Label>
                  <Select value={editing.tone} onValueChange={(v) => setEditing({ ...editing, tone: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TONE_PRESETS.map(t => <SelectItem key={t.id} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between bg-muted/40 p-3 rounded-md">
                  <div>
                    <p className="text-sm font-medium">Visível na home</p>
                    <p className="text-xs text-muted-foreground">Desligue para ocultar sem apagar.</p>
                  </div>
                  <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
                </div>

                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-2">Pré-visualização</p>
                  <div className="relative h-28 rounded-lg overflow-hidden border">
                    <img src={editing.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <div className={cn('absolute inset-0 bg-gradient-to-r', editing.tone)} />
                    <div className="relative h-full flex flex-col justify-center px-4 text-primary-foreground max-w-[70%]">
                      <h4 className="font-bold text-base drop-shadow leading-tight">{editing.title || 'Título'}</h4>
                      <p className="text-xs mt-0.5 opacity-90 line-clamp-2 drop-shadow">{editing.subtitle}</p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button onClick={save}>{isNew ? 'Criar' : 'Salvar'}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
