import { BadgeCheck, FileCheck2, IdCard, Building2, MapPin, Clock, ThumbsUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { VerificationInfo } from '@/types';
import { cn } from '@/lib/utils';

interface TrustBadgesProps {
  verification?: VerificationInfo;
  size?: 'sm' | 'md';
  onDark?: boolean;
  className?: string;
}

const ITEMS: { key: keyof VerificationInfo; label: string; Icon: typeof BadgeCheck }[] = [
  { key: 'cnpj', label: 'CNPJ', Icon: Building2 },
  { key: 'documents', label: 'Documentos', Icon: FileCheck2 },
  { key: 'identity', label: 'Identidade', Icon: IdCard },
  { key: 'address', label: 'Endereço', Icon: MapPin },
];

export function TrustBadges({ verification, size = 'sm', onDark, className }: TrustBadgesProps) {
  if (!verification) return null;
  const active = ITEMS.filter(i => verification[i.key]);
  if (active.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {active.map(({ key, label, Icon }) => (
        <Badge
          key={key}
          variant="secondary"
          className={cn(
            'gap-1 border',
            onDark
              ? 'bg-success/25 text-success-foreground border-success/40 backdrop-blur'
              : 'bg-success/10 text-success border-success/30',
            size === 'md' && 'px-2.5 py-1'
          )}
        >
          <Icon className={cn(size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
          <span className="font-medium">{label}</span>
          <BadgeCheck className={cn(size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3', 'opacity-90')} />
        </Badge>
      ))}
    </div>
  );
}

export function ResponseTimeBadge({ minutes, onDark, className }: { minutes?: number; onDark?: boolean; className?: string }) {
  if (!minutes) return null;
  const label = minutes <= 10 ? 'Responde na hora' : minutes <= 30 ? `Responde rápido (~${minutes} min)` : `Responde em ~${minutes} min`;
  return (
    <Badge
      variant="secondary"
      className={cn(
        'gap-1 border',
        onDark
          ? 'bg-warning/25 text-warning-foreground border-warning/40 backdrop-blur'
          : 'bg-warning/10 text-warning border-warning/30',
        className
      )}
    >
      <Clock className="h-3 w-3" />
      <span className="font-medium">{label}</span>
    </Badge>
  );
}

export function RecommendBadge({ percent, onDark, className }: { percent: number; onDark?: boolean; className?: string }) {
  if (percent < 60) return null;
  return (
    <Badge
      variant="secondary"
      className={cn(
        'gap-1 border',
        onDark
          ? 'bg-primary/25 text-primary-foreground border-primary/40 backdrop-blur'
          : 'bg-primary/10 text-primary border-primary/30',
        className
      )}
    >
      <ThumbsUp className="h-3 w-3" />
      <span className="font-medium">{percent}% recomenda</span>
    </Badge>
  );
}
