import { useState } from 'react';
import { Plus, Copy, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { mockCoupons, Coupon } from '@/data/mockData';
import { toast } from 'sonner';

interface CouponFormData {
  code: string;
  discount: string;
  type: 'percentage' | 'fixed';
  minOrder: string;
  usageLimit: string;
  expiresAt: string;
}

const emptyForm: CouponFormData = {
  code: '', discount: '', type: 'percentage', minOrder: '', usageLimit: '', expiresAt: '',
};

function CouponFormDialog({ open, onClose, coupon, onSave }: {
  open: boolean; onClose: () => void; coupon: Coupon | null; onSave: (data: CouponFormData) => void;
}) {
  const [form, setForm] = useState<CouponFormData>(
    coupon ? {
      code: coupon.code, discount: coupon.discount.toString(), type: coupon.type,
      minOrder: coupon.minOrder.toString(), usageLimit: coupon.usageLimit.toString(),
      expiresAt: coupon.expiresAt,
    } : emptyForm
  );

  const update = (field: keyof CouponFormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const canSave = form.code && form.discount && form.expiresAt;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{coupon ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Código *</Label>
            <Input placeholder="PROMO10" value={form.code} onChange={e => update('code', e.target.value.toUpperCase())} className="h-9 text-sm font-mono" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo *</Label>
              <Select value={form.type} onValueChange={v => update('type', v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentual (%)</SelectItem>
                  <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Desconto *</Label>
              <Input type="number" placeholder={form.type === 'percentage' ? '10' : '5.00'} value={form.discount} onChange={e => update('discount', e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Pedido mínimo (R$)</Label>
              <Input type="number" placeholder="0" value={form.minOrder} onChange={e => update('minOrder', e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Limite de usos</Label>
              <Input type="number" placeholder="100" value={form.usageLimit} onChange={e => update('usageLimit', e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Válido até *</Label>
            <Input type="date" value={form.expiresAt} onChange={e => update('expiresAt', e.target.value)} className="h-9 text-sm" />
          </div>

          <Button className="w-full mt-2" disabled={!canSave} onClick={() => { onSave(form); onClose(); }}>
            {coupon ? 'Salvar alterações' : 'Criar cupom'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CouponsTab() {
  const [coupons, setCoupons] = useState(mockCoupons);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const active = coupons.filter(c => c.active && new Date(c.expiresAt) >= new Date());

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copiado: ${code}`);
  };

  const handleSave = (data: CouponFormData) => {
    if (editCoupon) {
      setCoupons(prev => prev.map(c => c.id === editCoupon.id ? {
        ...c, code: data.code, discount: parseFloat(data.discount) || 0,
        type: data.type, minOrder: parseFloat(data.minOrder) || 0,
        usageLimit: parseInt(data.usageLimit) || 100, expiresAt: data.expiresAt,
      } : c));
      toast.success('Cupom atualizado!');
    } else {
      const newCoupon: Coupon = {
        id: `CPN-${Date.now()}`, code: data.code,
        discount: parseFloat(data.discount) || 0, type: data.type,
        minOrder: parseFloat(data.minOrder) || 0, usageLimit: parseInt(data.usageLimit) || 100,
        usedCount: 0, expiresAt: data.expiresAt, active: true,
      };
      setCoupons(prev => [...prev, newCoupon]);
      toast.success('Cupom criado!');
    }
    setEditCoupon(null);
  };

  const toggleActive = (id: string) => {
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  const confirmDelete = () => {
    if (deleteId) {
      setCoupons(prev => prev.filter(c => c.id !== deleteId));
      toast.success('Cupom excluído');
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{active.length} cupons ativos</p>
        <Button size="sm" className="gap-2" onClick={() => { setEditCoupon(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4" /> Criar
        </Button>
      </div>

      <div className="bg-card rounded-xl border divide-y">
        {coupons.map(c => {
          const isExpired = new Date(c.expiresAt) < new Date();
          return (
            <div key={c.id} className={`flex items-center gap-4 p-4 ${(!c.active || isExpired) ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-sm font-mono font-bold">{c.code}</code>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copy(c.code)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  {c.active && !isExpired ? (
                    <Badge className="bg-success/10 text-success text-xs">Ativo</Badge>
                  ) : isExpired ? (
                    <Badge className="bg-destructive/10 text-destructive text-xs">Expirado</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Inativo</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.type === 'percentage' ? `${c.discount}% off` : `R$${c.discount} off`} • 
                  Mín R${c.minOrder} • {c.usedCount}/{c.usageLimit} usos
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>Até {new Date(c.expiresAt).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditCoupon(c); setModalOpen(true); }}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(c.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Switch checked={c.active} onCheckedChange={() => toggleActive(c.id)} />
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <CouponFormDialog
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditCoupon(null); }}
          coupon={editCoupon}
          onSave={handleSave}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cupom?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
