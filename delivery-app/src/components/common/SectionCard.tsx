import { LucideIcon, ChevronDown } from 'lucide-react';
import { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type Accent = 'primary' | 'success' | 'info' | 'warning' | 'destructive' | 'muted';

const ACCENT: Record<Accent, { bg: string; text: string; ring: string }> = {
  primary:     { bg: 'bg-primary/10',     text: 'text-primary',     ring: 'ring-primary/20' },
  success:     { bg: 'bg-success/10',     text: 'text-success',     ring: 'ring-success/20' },
  info:        { bg: 'bg-info/10',        text: 'text-info',        ring: 'ring-info/20' },
  warning:     { bg: 'bg-warning/10',     text: 'text-warning',     ring: 'ring-warning/20' },
  destructive: { bg: 'bg-destructive/10', text: 'text-destructive', ring: 'ring-destructive/20' },
  muted:       { bg: 'bg-muted',          text: 'text-muted-foreground', ring: 'ring-border' },
};

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  accent?: Accent;
  action?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  summary?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({
  icon: Icon, title, subtitle, accent = 'primary', action,
  collapsible = false, defaultOpen = true, summary, children, className,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const a = ACCENT[accent];

  const header = (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ring-1', a.bg, a.ring)}>
        <Icon className={cn('h-4 w-4', a.text)} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-sm leading-tight">{title}</h3>
        {(subtitle || (!open && summary)) && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {!open && summary ? summary : subtitle}
          </p>
        )}
      </div>
    </div>
  );

  if (!collapsible) {
    return (
      <section className={cn('bg-card border rounded-xl shadow-sm overflow-hidden', className)}>
        <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
          {header}
          {action}
        </div>
        <div className="p-4 space-y-4">{children}</div>
      </section>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}
      className={cn('bg-card border rounded-xl shadow-sm overflow-hidden', className)}>
      <CollapsibleTrigger asChild>
        <button type="button" className="w-full flex items-center gap-2 p-4 hover:bg-muted/40 transition-colors text-left border-b data-[state=closed]:border-b-0">
          {header}
          {action}
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', open && 'rotate-180')} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 space-y-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
