import { UtensilsCrossed, ShoppingBasket, Pill, Store, type LucideIcon } from 'lucide-react';

export type VendorCategory = 'food' | 'market' | 'pharmacy' | 'other';

export interface VendorCategoryMeta {
  icon: LucideIcon;
  label: string;
  toneBg: string;
  toneText: string;
}

export const vendorCategoryMeta: Record<VendorCategory, VendorCategoryMeta> = {
  food:     { icon: UtensilsCrossed, label: 'Alimentação', toneBg: 'bg-primary/10',  toneText: 'text-primary' },
  market:   { icon: ShoppingBasket,  label: 'Mercado',     toneBg: 'bg-info/10',     toneText: 'text-info' },
  pharmacy: { icon: Pill,            label: 'Farmácia',    toneBg: 'bg-success/10',  toneText: 'text-success' },
  other:    { icon: Store,           label: 'Outro',       toneBg: 'bg-muted',       toneText: 'text-muted-foreground' },
};

export const vendorCategoryOptions: { value: VendorCategory; label: string }[] = [
  { value: 'food',     label: 'Alimentação' },
  { value: 'market',   label: 'Mercado' },
  { value: 'pharmacy', label: 'Farmácia' },
  { value: 'other',    label: 'Outro' },
];

export function getVendorMeta(category?: VendorCategory | null): VendorCategoryMeta {
  return vendorCategoryMeta[category ?? 'other'];
}
