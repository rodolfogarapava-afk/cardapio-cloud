import { useMemo, useState } from 'react';
import {
  Check, X, FileText, Building2, User, Clock, ShieldCheck,
  LayoutGrid, List as ListIcon, GripVertical, ArrowRight, ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useKycApplications, setApplicationStatus, KycApplication, KycStatus } from '@/data/kyc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusColors: Record<KycStatus, string> = {
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
};
const statusLabels: Record<KycStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Recusado',
};

const columnMeta: Record<KycStatus, { label: string; hint: string; accent: string; ring: string }> = {
  pending:  { label: 'Pendentes',  hint: 'Aguardando revisão',   accent: 'bg-warning',     ring: 'ring-warning/30' },
  approved: { label: 'Aprovados',  hint: 'Ativos na plataforma', accent: 'bg-success',     ring: 'ring-success/30' },
  rejected: { label: 'Recusados',  hint: 'Documentos negados',   accent: 'bg-destructive', ring: 'ring-destructive/30' },
};

const daysAgo = (iso: string) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'hoje';
  if (d === 1) return '1 dia';
  return `${d} dias`;
};

export function OnboardingTab() {
  const all = useKycApplications();
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [filter, setFilter] = useState<KycStatus | 'all'>('pending');
  const [openApp, setOpenApp] = useState<KycApplication | null>(null);
  const [rejecting, setRejecting] = useState<KycApplication | null>(null);
  const [reason, setReason] = useState('');
  const [dragOverCol, setDragOverCol] = useState<KycStatus | null>(null);

  const filtered = useMemo(
    () => (filter === 'all' ? all : all.filter(a => a.status === filter)),
    [all, filter],
  );

  const byStatus: Record<KycStatus, KycApplication[]> = {
    pending: all.filter(a => a.status === 'pending'),
    approved: all.filter(a => a.status === 'approved'),
    rejected: all.filter(a => a.status === 'rejected'),
  };
  const pendingCount = byStatus.pending.length;

  const approve = (app: KycApplication) => {
    setApplicationStatus(app.id, 'approved');
    toast.success(`${app.name} aprovado`);
    setOpenApp(null);
  };
  const reject = () => {
    if (!rejecting) return;
    setApplicationStatus(rejecting.id, 'rejected', reason || 'Documentação insuficiente');
    toast.success(`${rejecting.name} recusado`);
    setRejecting(null);
    setReason('');
    setOpenApp(null);
  };
  const moveTo = (app: KycApplication, target: KycStatus) => {
    if (app.status === target) return;
    if (target === 'rejected') { setRejecting(app); return; }
    setApplicationStatus(app.id, target, target === 'approved' ? undefined : app.reason);
    toast.success(`${app.name} → ${statusLabels[target]}`);
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDrop = (e: React.DragEvent, target: KycStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const id = e.dataTransfer.getData('text/plain');
    const app = all.find(a => a.id === id);
    if (app) moveTo(app, target);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="text-2xl font-bold">{byStatus.pending.length}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Aprovados</p>
          <p className="text-2xl font-bold text-success">{byStatus.approved.length}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Recusados</p>
          <p className="text-2xl font-bold text-destructive">{byStatus.rejected.length}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {view === 'kanban' ? 'Arraste os cartões entre colunas para mover o funil.' : 'Filtre por status para revisar em lista.'}
        </p>
        <div className="inline-flex rounded-lg border bg-card p-1">
          <button
            onClick={() => setView('kanban')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              view === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Kanban
          </button>
          <button
            onClick={() => setView('list')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <ListIcon className="h-3.5 w-3.5" /> Lista
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['pending', 'approved', 'rejected'] as KycStatus[]).map(col => {
            const meta = columnMeta[col];
            const items = byStatus[col];
            const isOver = dragOverCol === col;
            return (
              <div
                key={col}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                onDragLeave={() => setDragOverCol(prev => (prev === col ? null : prev))}
                onDrop={(e) => onDrop(e, col)}
                className={cn(
                  'rounded-xl border bg-muted/30 p-3 min-h-[240px] transition-all',
                  isOver && 'ring-2 bg-muted/60',
                  isOver && meta.ring,
                )}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', meta.accent)} />
                    <h4 className="font-semibold text-sm">{meta.label}</h4>
                    <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{meta.hint}</span>
                </div>
                <div className="space-y-2">
                  {items.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                      Solte aqui
                    </div>
                  )}
                  {items.map(app => (
                    <div
                      key={app.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, app.id)}
                      onClick={() => setOpenApp(app)}
                      className="group bg-card rounded-lg border p-3 cursor-grab active:cursor-grabbing hover:shadow-sm hover:border-primary/40 transition-all"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                        <div className={cn(
                          'h-8 w-8 rounded-md flex items-center justify-center shrink-0',
                          app.kind === 'vendor' ? 'bg-primary/10 text-primary' : 'bg-accent/40 text-accent-foreground',
                        )}>
                          {app.kind === 'vendor' ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{app.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {app.category} · {app.city}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                              {app.kind === 'vendor' ? 'Lojista' : 'Prestador'}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" /> {daysAgo(app.submittedAt)}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <FileText className="h-2.5 w-2.5" /> {app.documents.length}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100">
                        {col !== 'pending' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); moveTo(app, 'pending'); }}
                            className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
                            title="Voltar para Pendente"
                          >
                            <ArrowLeft className="h-3 w-3" /> Pendente
                          </button>
                        )}
                        <div className="flex-1" />
                        {col === 'pending' && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveTo(app, 'rejected'); }}
                              className="text-[10px] text-destructive hover:underline"
                            >
                              Recusar
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveTo(app, 'approved'); }}
                              className="text-[10px] text-success hover:underline inline-flex items-center gap-0.5"
                            >
                              Aprovar <ArrowRight className="h-3 w-3" />
                            </button>
                          </>
                        )}
                        {col === 'approved' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); moveTo(app, 'rejected'); }}
                            className="text-[10px] text-destructive hover:underline"
                          >
                            Recusar
                          </button>
                        )}
                        {col === 'rejected' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); moveTo(app, 'approved'); }}
                            className="text-[10px] text-success hover:underline inline-flex items-center gap-0.5"
                          >
                            Aprovar <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Tabs value={filter} onValueChange={(v) => setFilter(v as KycStatus | 'all')}>
          <TabsList>
            <TabsTrigger value="pending">Pendentes ({pendingCount})</TabsTrigger>
            <TabsTrigger value="approved">Aprovados</TabsTrigger>
            <TabsTrigger value="rejected">Recusados</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>
          <TabsContent value={filter} className="mt-4">
            <div className="bg-card rounded-xl border divide-y">
              {filtered.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Nenhum cadastro nesta fila.
                </div>
              )}
              {filtered.map(app => (
                <div key={app.id} className="flex items-start sm:items-center gap-4 p-4 flex-col sm:flex-row">
                  <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
                    <div className={cn(
                      'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                      app.kind === 'vendor' ? 'bg-primary/10 text-primary' : 'bg-accent/40 text-accent-foreground',
                    )}>
                      {app.kind === 'vendor' ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium truncate">{app.name}</h4>
                        <Badge variant="secondary" className="text-[10px]">
                          {app.kind === 'vendor' ? 'Lojista' : 'Prestador'}
                        </Badge>
                        <Badge className={cn('text-xs', statusColors[app.status])}>{statusLabels[app.status]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {app.category} • {app.city} • {app.document}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(app.submittedAt).toLocaleDateString('pt-BR')} · {app.documents.length} documento(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={() => setOpenApp(app)} className="flex-1 sm:flex-none">
                      <FileText className="h-4 w-4 mr-1" /> Revisar
                    </Button>
                    {app.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => approve(app)} className="flex-1 sm:flex-none">
                          <Check className="h-4 w-4 mr-1" /> Aprovar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setRejecting(app)} className="flex-1 sm:flex-none">
                          <X className="h-4 w-4 mr-1" /> Recusar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!openApp} onOpenChange={(o) => !o && setOpenApp(null)}>
        <DialogContent className="max-w-lg">
          {openApp && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  {openApp.name}
                </DialogTitle>
                <DialogDescription>
                  Revisão de cadastro · {openApp.kind === 'vendor' ? 'Lojista' : 'Prestador'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-muted-foreground">Razão social</p><p>{openApp.legalName}</p></div>
                  <div><p className="text-xs text-muted-foreground">Documento</p><p>{openApp.document}</p></div>
                  <div><p className="text-xs text-muted-foreground">E-mail</p><p className="truncate">{openApp.email}</p></div>
                  <div><p className="text-xs text-muted-foreground">Telefone</p><p>{openApp.phone}</p></div>
                  <div><p className="text-xs text-muted-foreground">Categoria</p><p>{openApp.category}</p></div>
                  <div><p className="text-xs text-muted-foreground">Cidade</p><p>{openApp.city}</p></div>
                </div>

                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Documentos enviados</p>
                  <div className="space-y-1.5">
                    {openApp.documents.map((d, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/40 rounded-md text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{d.label}</span>
                          <span className="text-muted-foreground">{d.file}</span>
                        </div>
                        <span className="text-muted-foreground">{d.uploadedAt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {openApp.reason && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Motivo da recusa</p>
                    <p className="text-sm text-destructive">{openApp.reason}</p>
                  </div>
                )}
              </div>

              {openApp.status === 'pending' && (
                <DialogFooter className="gap-2">
                  <Button variant="destructive" onClick={() => setRejecting(openApp)}>
                    <X className="h-4 w-4 mr-1" /> Recusar
                  </Button>
                  <Button onClick={() => approve(openApp)}>
                    <Check className="h-4 w-4 mr-1" /> Aprovar
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejecting} onOpenChange={(o) => { if (!o) { setRejecting(null); setReason(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recusar cadastro</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa. O parceiro será notificado.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Ex.: Documentação ilegível, CNPJ inativo, categoria fora do escopo..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejecting(null); setReason(''); }}>Cancelar</Button>
            <Button variant="destructive" onClick={reject}>Confirmar recusa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
