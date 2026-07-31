import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type HubTone = 'food' | 'market' | 'services' | 'wellness' | 'beauty' | 'all';

const toneBg: Record<HubTone, string> = {
  food: 'bg-hub-food',
  market: 'bg-hub-market',
  services: 'bg-hub-services',
  wellness: 'bg-hub-wellness',
  beauty: 'bg-hub-beauty',
  all: 'bg-hub-all',
};

interface HubTileProps {
  to?: string;
  icon: LucideIcon;
  label: string;
  tone: HubTone;
  comingSoon?: boolean;
  index?: number;
  aspectClassName?: string;
}

export function HubTile({ to, icon: Icon, label, tone, comingSoon, index = 0, aspectClassName = 'aspect-square' }: HubTileProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.03, type: 'spring', stiffness: 260, damping: 24 }}
      className={cn(
        'relative w-full rounded-2xl overflow-hidden',
        aspectClassName,
        'flex flex-col items-center justify-center text-center p-4 sm:p-5 gap-3',
        'shadow-sm transition-[box-shadow,filter] duration-200',
        !comingSoon && 'hover:shadow-md hover:brightness-[1.05]',
        toneBg[tone],
        comingSoon && 'opacity-70 cursor-not-allowed',
      )}
    >
      {/* Profundidade sutil: clareia no topo, escurece embaixo */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20" />

      <Icon
        className="relative h-10 w-10 sm:h-12 sm:w-12 text-hub-foreground drop-shadow-sm"
        strokeWidth={2}
      />

      <div className="relative w-full flex flex-col items-center gap-1">
        <p className="text-hub-foreground text-base sm:text-lg font-semibold leading-tight tracking-tight">
          {label}
        </p>
        {comingSoon && (
          <span className="inline-block rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-hub-foreground">
            Em breve
          </span>
        )}
      </div>
    </motion.div>
  );

  if (!to || comingSoon) {
    return <div className="block">{content}</div>;
  }

  return (
    <Link to={to} aria-label={label} className="block">
      {content}
    </Link>
  );
}
