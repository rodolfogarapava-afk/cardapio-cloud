import { Badge } from '@/components/ui/badge';
import { ShieldCheck, IdCard, Building2, FileCheck2, MapPin } from 'lucide-react';

const items = [
  { label: 'Identidade', hint: 'Selfie + RG/CNH', Icon: IdCard },
  { label: 'CNPJ', hint: 'Cartão CNPJ válido', Icon: Building2 },
  { label: 'Documentos profissionais', hint: 'Comprovantes da atividade', Icon: FileCheck2 },
  { label: 'Endereço', hint: 'Comprovante de residência', Icon: MapPin },
];

export function VerificationTab() {
  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-xl p-6 sm:p-8 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-full bg-success/10 text-success flex items-center justify-center">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <h3 className="font-semibold text-lg">Verificação de dados</h3>
            <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px]">Em breve</Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Em breve você poderá verificar identidade, CNPJ, documentos profissionais e endereço
            para exibir um selo de confiança no seu perfil público.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2 opacity-60 pointer-events-none select-none">
        {items.map(({ label, hint, Icon }) => (
          <div key={label} className="flex items-center gap-3 rounded-lg border bg-background p-3">
            <div className="h-9 w-9 rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground truncate">{hint}</p>
            </div>
            <span className="text-[11px] text-muted-foreground">Em breve</span>
          </div>
        ))}
      </div>
    </div>
  );
}
