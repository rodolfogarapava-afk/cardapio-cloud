import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Restaurant } from '@/types';
import { MapPin, Phone, Clock, Wallet, BadgeCheck } from 'lucide-react';
import { BrandIcon } from '@/components/common/BrandIcon';

interface Props {
  open: boolean;
  onClose: () => void;
  restaurant: Restaurant;
}

const igUrl = (h?: string) => h ? (h.startsWith('http') ? h : `https://instagram.com/${h.replace('@', '')}`) : '';
const fbUrl = (h?: string) => h ? (h.startsWith('http') ? h : `https://facebook.com/${h}`) : '';

export function RestaurantInfoModal({ open, onClose, restaurant }: Props) {
  const { name, description, address, phone, deliveryTime, prepTime, minOrder, socials, verified } = restaurant;
  const hasSocials = socials && (socials.instagram || socials.facebook);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            {name}
            {verified && <BadgeCheck className="h-4 w-4 text-success" />}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {description && <p className="text-muted-foreground">{description}</p>}


          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <span>{address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>Tempo médio de preparo: <span className="font-medium text-foreground">{prepTime || deliveryTime}</span></span>
            </div>
            {minOrder > 0 && (
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Pedido mínimo: <span className="font-medium text-foreground">R$ {minOrder.toFixed(2).replace('.', ',')}</span></span>
              </div>
            )}
          </div>

          {hasSocials && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Redes sociais</p>
              <div className="flex flex-wrap gap-2">
                {socials?.instagram && (
                  <a href={igUrl(socials.instagram)} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-2 rounded-md border border-[hsl(var(--brand-instagram))]/40 px-3 py-1.5 text-[hsl(var(--brand-instagram))] hover:bg-[hsl(var(--brand-instagram))]/10 transition-colors font-medium">
                    <BrandIcon name="instagram" size={16} /> Instagram
                  </a>
                )}
                {socials?.facebook && (
                  <a href={fbUrl(socials.facebook)} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-2 rounded-md border border-[hsl(var(--brand-facebook))]/40 px-3 py-1.5 text-[hsl(var(--brand-facebook))] hover:bg-[hsl(var(--brand-facebook))]/10 transition-colors font-medium">
                    <BrandIcon name="facebook" size={16} /> Facebook
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
