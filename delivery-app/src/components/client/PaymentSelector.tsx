import { CreditCard, Banknote, QrCode, CreditCardIcon } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PaymentMethod, PAYMENT_METHOD_LABELS } from '@/types';
import { cn } from '@/lib/utils';

interface PaymentSelectorProps {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  change?: number;
  onChangeAmountChange?: (value: number | undefined) => void;
  className?: string;
}

const paymentIcons: Record<PaymentMethod, React.ReactNode> = {
  pix: <QrCode className="h-5 w-5" />,
  credit_card: <CreditCard className="h-5 w-5" />,
  debit_card: <CreditCardIcon className="h-5 w-5" />,
  cash: <Banknote className="h-5 w-5" />,
};

export function PaymentSelector({
  value,
  onChange,
  change,
  onChangeAmountChange,
  className,
}: PaymentSelectorProps) {
  const methods: PaymentMethod[] = ['pix', 'credit_card', 'debit_card', 'cash'];

  return (
    <div className={cn('space-y-3', className)}>
      <RadioGroup
        value={value}
        onValueChange={v => onChange(v as PaymentMethod)}
        className="grid grid-cols-2 gap-3"
      >
        {methods.map(method => (
          <div key={method} className="h-full">
            <RadioGroupItem
              value={method}
              id={method}
              className="peer sr-only"
            />
            <Label
              htmlFor={method}
              className={cn(
                'flex h-full min-h-[92px] flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors text-center',
                'bg-card text-card-foreground',
                'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground',
                'hover:border-primary/70 hover:bg-muted/70'
              )}
            >
              {paymentIcons[method]}
              <span className="text-sm font-medium leading-tight">
                {PAYMENT_METHOD_LABELS[method]}
              </span>
            </Label>
          </div>
        ))}
      </RadioGroup>

      {/* Campo de troco para dinheiro */}
      {value === 'cash' && onChangeAmountChange && (
        <div className="space-y-2 pt-2">
          <Label htmlFor="change">Troco para quanto?</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              R$
            </span>
            <Input
              id="change"
              type="number"
              placeholder="0,00"
              className="pl-10"
              value={change || ''}
              onChange={e => {
                const val = parseFloat(e.target.value);
                onChangeAmountChange(isNaN(val) ? undefined : val);
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Deixe em branco se não precisar de troco
          </p>
        </div>
      )}
    </div>
  );
}
