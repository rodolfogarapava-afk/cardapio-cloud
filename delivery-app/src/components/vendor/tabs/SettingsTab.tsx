import { useRef, useState } from 'react';
import { Store, Save, Clock, Coffee, Plus, Trash2, X, ChevronDown, Pencil, Image as ImageIcon, Link as LinkIcon, Upload, CircleDot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { mockStoreSettings } from '@/data/mockData';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ScheduledBreak } from '@/types';
import { BrandIcon } from '@/components/common/BrandIcon';

export function SettingsTab() {
  const [schedule, setSchedule] = useState(mockStoreSettings.schedule);
  const [acceptingOrders, setAcceptingOrders] = useState(mockStoreSettings.acceptingOrders);
  const [logo, setLogo] = useState<string | undefined>(mockStoreSettings.logo);
  const [banner, setBanner] = useState<string | undefined>(mockStoreSettings.banner);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [storeInfo, setStoreInfo] = useState({
    name: mockStoreSettings.name,
    slug: mockStoreSettings.slug,
    cnpj: mockStoreSettings.cnpj,
    phone: mockStoreSettings.phone,
    email: mockStoreSettings.email,
    address: mockStoreSettings.address,
    prepTime: mockStoreSettings.prepTime || '',
    minOrderValue: mockStoreSettings.minOrderValue,
    instagram: mockStoreSettings.socials?.instagram || '',
    facebook: mockStoreSettings.socials?.facebook || '',
  });
  const [showBreakForm, setShowBreakForm] = useState(false);
  const [editingBreakId, setEditingBreakId] = useState<string | null>(null);
  const [breakForm, setBreakForm] = useState<Partial<ScheduledBreak>>({
    label: '',
    startTime: '14:00',
    endTime: '14:30',
    active: true,
    daysOfWeek: [1, 2, 3, 4, 5],
  });

  const handleImagePick = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void,
    label: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setter(url);
    toast({ title: `${label} atualizado(a)` });
    e.target.value = '';
  };

  const handleSave = () => {
    Object.assign(mockStoreSettings, {
      ...storeInfo,
      acceptingOrders,
      logo,
      banner,
      schedule,
      socials: { instagram: storeInfo.instagram, facebook: storeInfo.facebook },
    });
    toast({ title: 'Alterações salvas!' });
  };

  const toggleAccepting = (val: boolean) => {
    setAcceptingOrders(val);
    toast({ title: val ? 'Loja aberta' : 'Loja fechada' });
  };


  const handleSlugChange = (value: string) => {
    const sanitized = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 50);
    setStoreInfo(prev => ({ ...prev, slug: sanitized }));
  };

  const toggleDayOpen = (dayIndex: number) => {
    setSchedule(prev => ({
      ...prev,
      days: prev.days.map(d => 
        d.dayIndex === dayIndex ? { ...d, isOpen: !d.isOpen } : d
      ),
    }));
  };

  const updateDayTime = (dayIndex: number, field: 'openTime' | 'closeTime', value: string) => {
    setSchedule(prev => ({
      ...prev,
      days: prev.days.map(d => 
        d.dayIndex === dayIndex ? { ...d, [field]: value } : d
      ),
    }));
  };

  const toggleBreakActive = (breakId: string) => {
    setSchedule(prev => ({
      ...prev,
      breaks: prev.breaks.map(b => 
        b.id === breakId ? { ...b, active: !b.active } : b
      ),
    }));
  };

  const removeBreak = (breakId: string) => {
    setSchedule(prev => ({
      ...prev,
      breaks: prev.breaks.filter(b => b.id !== breakId),
    }));
    toast({ title: 'Pausa removida' });
  };

  const startEditBreak = (brk: ScheduledBreak) => {
    setEditingBreakId(brk.id);
    setBreakForm({
      label: brk.label,
      startTime: brk.startTime,
      endTime: brk.endTime,
      active: brk.active,
      daysOfWeek: [...brk.daysOfWeek],
    });
    setShowBreakForm(true);
  };

  const toggleFormDay = (dayIndex: number) => {
    setBreakForm(prev => {
      const days = prev.daysOfWeek || [];
      if (days.includes(dayIndex)) {
        return { ...prev, daysOfWeek: days.filter(d => d !== dayIndex) };
      }
      return { ...prev, daysOfWeek: [...days, dayIndex].sort() };
    });
  };

  const saveBreak = () => {
    if (!breakForm.label?.trim()) {
      toast({ title: 'Digite um nome para a pausa', variant: 'destructive' });
      return;
    }
    if (!breakForm.daysOfWeek?.length) {
      toast({ title: 'Selecione pelo menos um dia', variant: 'destructive' });
      return;
    }

    if (editingBreakId) {
      setSchedule(prev => ({
        ...prev,
        breaks: prev.breaks.map(b => 
          b.id === editingBreakId 
            ? { ...b, label: breakForm.label!, startTime: breakForm.startTime!, endTime: breakForm.endTime!, daysOfWeek: breakForm.daysOfWeek! }
            : b
        ),
      }));
      toast({ title: 'Pausa atualizada!' });
    } else {
      const breakItem: ScheduledBreak = {
        id: `brk-${Date.now()}`,
        label: breakForm.label!,
        startTime: breakForm.startTime!,
        endTime: breakForm.endTime!,
        active: true,
        daysOfWeek: breakForm.daysOfWeek!,
      };
      setSchedule(prev => ({
        ...prev,
        breaks: [...prev.breaks, breakItem],
      }));
      toast({ title: 'Pausa adicionada!' });
    }

    resetForm();
  };

  const resetForm = () => {
    setBreakForm({
      label: '',
      startTime: '14:00',
      endTime: '14:30',
      active: true,
      daysOfWeek: [1, 2, 3, 4, 5],
    });
    setEditingBreakId(null);
    setShowBreakForm(false);
  };

  const getDayLabels = (days: number[]) => {
    const labels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    if (days.length === 7) return 'Todos';
    if (JSON.stringify(days) === JSON.stringify([1, 2, 3, 4, 5])) return 'Seg–Sex';
    if (JSON.stringify(days) === JSON.stringify([0, 6])) return 'Fim de sem.';
    return days.map(d => labels[d]).join('');
  };

  const orderedDays = [...schedule.days].sort((a, b) => {
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.indexOf(a.dayIndex) - order.indexOf(b.dayIndex);
  });

  const activeBreaks = schedule.breaks.filter(b => b.active).length;

  return (
    <div className="space-y-3">
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleImagePick(e, setLogo, 'Logo')}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleImagePick(e, setBanner, 'Capa')}
      />

      <div className="flex justify-end">
        <Button size="sm" className="h-8 gap-2" onClick={handleSave}>
          <Save className="h-3.5 w-3.5" /> Salvar
        </Button>
      </div>

      {/* Status */}
      <div
        className={cn(
          'rounded-lg border p-3 flex items-center justify-between transition-colors',
          acceptingOrders ? 'bg-success/5 border-success/30' : 'bg-muted/40',
        )}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center',
              acceptingOrders ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground',
            )}
          >
            <CircleDot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium leading-tight">
              Loja {acceptingOrders ? 'Aberta' : 'Fechada'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {acceptingOrders ? 'Recebendo novos pedidos' : 'Pedidos pausados'}
            </p>
          </div>
        </div>
        <Switch checked={acceptingOrders} onCheckedChange={toggleAccepting} />
      </div>

      {/* Informações do Estabelecimento */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {logo ? (
                  <img src={logo} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{storeInfo.name || 'Nome do estabelecimento'}</p>
                <p className="text-xs text-muted-foreground">Informações básicas</p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            {/* Banner + Logo */}
            <div className="relative h-24 bg-muted border-t">
              {banner ? (
                <img src={banner} alt="Capa" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-2 right-2 h-7 text-xs gap-1"
                onClick={() => bannerInputRef.current?.click()}
              >
                <Upload className="h-3 w-3" />
                Alterar capa
              </Button>
            </div>

            <div className="px-3 -mt-6 relative z-10 flex items-end gap-2">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="group relative h-12 w-12 rounded-lg bg-card border-2 border-background flex items-center justify-center overflow-hidden shadow-sm"
                aria-label="Alterar logo"
              >
                {logo ? (
                  <img src={logo} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="absolute inset-0 bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Upload className="h-4 w-4 text-foreground" />
                </span>
              </button>
              <span className="text-[10px] text-muted-foreground pb-1">Clique no logo para trocar</span>
            </div>


            {/* Form */}
            <div className="px-3 pb-3 pt-3 space-y-3">
              {/* Nome */}
              <div className="space-y-1">
                <Label htmlFor="store-name" className="text-xs">
                  Nome do estabelecimento <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="store-name"
                  value={storeInfo.name}
                  onChange={(e) => setStoreInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Sabor & Arte Delivery"
                  className="h-8 text-sm"
                />
              </div>

              {/* Link personalizado */}
              <div className="space-y-1">
                <Label htmlFor="store-slug" className="text-xs">
                  Link personalizado <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-0">
                  <span className="h-8 px-2 flex items-center text-xs text-muted-foreground bg-muted border border-r-0 rounded-l-md shrink-0">
                    delivery/
                  </span>
                  <Input
                    id="store-slug"
                    value={storeInfo.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="meu-restaurante"
                    className="h-8 text-sm rounded-l-none"
                    maxLength={50}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Apenas letras minúsculas, números e hífens. Máx. 50 caracteres. ({storeInfo.slug.length}/50)
                </p>
              </div>

              {/* CNPJ */}
              <div className="space-y-1">
                <Label htmlFor="store-cnpj" className="text-xs">
                  CNPJ <span className="text-muted-foreground font-normal">(opcional — para emissão de nota fiscal)</span>
                </Label>
                <Input
                  id="store-cnpj"
                  value={storeInfo.cnpj}
                  onChange={(e) => setStoreInfo(prev => ({ ...prev, cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                  className="h-8 text-sm"
                />
              </div>

              {/* Telefone + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="store-phone" className="text-xs">
                    Telefone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="store-phone"
                    value={storeInfo.phone}
                    onChange={(e) => setStoreInfo(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(00) 0000-0000"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="store-email" className="text-xs">
                    E-mail <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="store-email"
                    type="email"
                    value={storeInfo.email}
                    onChange={(e) => setStoreInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contato@exemplo.com"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-1">
                <Label htmlFor="store-address" className="text-xs">
                  Endereço <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="store-address"
                  value={storeInfo.address}
                  onChange={(e) => setStoreInfo(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Rua, número - Bairro, Cidade - UF"
                  className="h-8 text-sm"
                />
              </div>

              {/* Tempo de preparo + Pedido mínimo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="store-prep" className="text-xs">Tempo médio de preparo</Label>
                  <Input
                    id="store-prep"
                    value={storeInfo.prepTime}
                    onChange={(e) => setStoreInfo(prev => ({ ...prev, prepTime: e.target.value }))}
                    placeholder="Ex: 20-30 min"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="store-min" className="text-xs">Pedido mínimo (R$)</Label>
                  <Input
                    id="store-min"
                    type="number"
                    min={0}
                    step="0.01"
                    value={storeInfo.minOrderValue}
                    onChange={(e) => setStoreInfo(prev => ({ ...prev, minOrderValue: parseFloat(e.target.value) || 0 }))}
                    placeholder="0,00"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Redes sociais */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <Collapsible>
          <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <LinkIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Redes sociais</p>
                <p className="text-xs text-muted-foreground">Mostradas no cardápio do cliente</p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-3 pt-0 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="store-ig" className="text-xs flex items-center gap-1.5">
                  <BrandIcon name="instagram" size={14} /> Instagram
                </Label>
                <Input
                  id="store-ig"
                  value={storeInfo.instagram}
                  onChange={(e) => setStoreInfo(prev => ({ ...prev, instagram: e.target.value }))}
                  placeholder="@seurestaurante ou URL completa"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="store-fb" className="text-xs flex items-center gap-1.5">
                  <BrandIcon name="facebook" size={14} /> Facebook
                </Label>
                <Input
                  id="store-fb"
                  value={storeInfo.facebook}
                  onChange={(e) => setStoreInfo(prev => ({ ...prev, facebook: e.target.value }))}
                  placeholder="página ou URL completa"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Horários + Pausas */}
      <div className="bg-card rounded-xl border">
        <Tabs defaultValue="hours" className="w-full">
          <div className="border-b px-3">
            <TabsList className="h-10 bg-transparent gap-4 p-0">
              <TabsTrigger 
                value="hours" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-sm"
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Horários
              </TabsTrigger>
              <TabsTrigger 
                value="breaks" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-sm gap-1.5"
              >
                <Coffee className="h-3.5 w-3.5" />
                Pausas
                {activeBreaks > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">{activeBreaks}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="hours" className="p-3 mt-0">
            <div className="space-y-1">
              {orderedDays.map((day) => (
                <div key={day.dayIndex} className="flex items-center gap-2 py-1">
                  <Switch 
                    checked={day.isOpen} 
                    onCheckedChange={() => toggleDayOpen(day.dayIndex)}
                    className="scale-75"
                  />
                  <span className={cn("w-8 text-xs font-medium", !day.isOpen && "text-muted-foreground")}>
                    {day.dayShort}
                  </span>
                  {day.isOpen ? (
                    <div className="flex items-center gap-1 flex-1">
                      <Input
                        type="time"
                        value={day.openTime}
                        onChange={(e) => updateDayTime(day.dayIndex, 'openTime', e.target.value)}
                        className="h-7 w-[90px] text-xs"
                      />
                      <span className="text-muted-foreground text-[10px]">–</span>
                      <Input
                        type="time"
                        value={day.closeTime}
                        onChange={(e) => updateDayTime(day.dayIndex, 'closeTime', e.target.value)}
                        className="h-7 w-[90px] text-xs"
                      />
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Fechado</span>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="breaks" className="p-3 mt-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-muted-foreground">Bloqueia pedidos nestes horários</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs gap-1 px-2"
                onClick={() => { resetForm(); setShowBreakForm(true); }}
              >
                <Plus className="h-3 w-3" /> Nova
              </Button>
            </div>

            {schedule.breaks.length === 0 && !showBreakForm ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma pausa</p>
            ) : (
              <div className="space-y-1">
                {schedule.breaks.map((brk) => (
                  <div
                    key={brk.id}
                    className={cn(
                      "flex items-center gap-1.5 py-1 group",
                      !brk.active && "opacity-50"
                    )}
                  >
                    <Switch
                      checked={brk.active}
                      onCheckedChange={() => toggleBreakActive(brk.id)}
                      className="scale-[0.65]"
                    />
                    <span className="text-xs font-medium flex-1 truncate">{brk.label}</span>
                    <span className="text-[10px] text-muted-foreground">{brk.startTime}–{brk.endTime}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{getDayLabels(brk.daysOfWeek)}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100"
                      onClick={() => startEditBreak(brk)}
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => removeBreak(brk.id)}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {showBreakForm && (
              <div className="mt-2 p-2 bg-muted/40 rounded border border-dashed space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium">{editingBreakId ? 'Editar' : 'Nova'} pausa</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={resetForm}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <Input
                    placeholder="Nome"
                    value={breakForm.label}
                    onChange={(e) => setBreakForm(prev => ({ ...prev, label: e.target.value }))}
                    className="h-7 flex-1 min-w-[100px] text-xs"
                  />
                  <Input
                    type="time"
                    value={breakForm.startTime}
                    onChange={(e) => setBreakForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="h-7 w-[80px] text-xs"
                  />
                  <span className="text-[10px]">–</span>
                  <Input
                    type="time"
                    value={breakForm.endTime}
                    onChange={(e) => setBreakForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="h-7 w-[80px] text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((label, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleFormDay(idx)}
                        className={cn(
                          "h-5 w-5 rounded text-[9px] font-medium",
                          breakForm.daysOfWeek?.includes(idx) ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={resetForm}>Cancelar</Button>
                    <Button size="sm" className="h-6 text-xs px-2" onClick={saveBreak}>
                      {editingBreakId ? 'Salvar' : 'Adicionar'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
