import { useState } from 'react';
import { Receipt, Printer, Eye, FileText, Search, MapPin, Clock, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { mockVendorOrders, mockStoreSettings, VendorOrderDetail } from '@/data/mockData';
import { toast } from 'sonner';

const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function ReceiptPreview({
  order,
  open,
  onClose,
  autoPrint,
}: {
  order: VendorOrderDetail | null;
  open: boolean;
  onClose: () => void;
  autoPrint?: boolean;
}) {
  if (!order) return null;

  const seed = parseInt(order.id.replace(/\D/g, '').slice(-2) || '1', 10);
  const lat = -23.55 + seed * 0.001;
  const lng = -46.63 - seed * 0.001;
  const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;

  const handlePrint = () => {
    window.print();
    toast.success('Enviado para a impressora');
  };

  if (autoPrint && open) {
    setTimeout(handlePrint, 250);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <DialogHeader className="p-4 border-b print:hidden">
          <DialogTitle className="flex items-center justify-between gap-2">
            <span className="text-base">Comanda {order.id}</span>
            <Button size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" /> Imprimir
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Thermal 80mm receipt */}
        <div className="receipt-print bg-card text-foreground font-mono text-[12px] leading-relaxed p-5 max-h-[75vh] overflow-y-auto">
          {/* Header */}
          <div className="text-center space-y-0.5 mb-3">
            <div className="font-bold text-[14px] uppercase tracking-wide">
              {mockStoreSettings.name}
            </div>
            <div className="text-[10px] text-muted-foreground">
              CNPJ {mockStoreSettings.cnpj}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {mockStoreSettings.address}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Tel {mockStoreSettings.phone}
            </div>
          </div>

          <div className="border-t border-dashed border-foreground/60 my-3" />

          {/* Order meta */}
          <div className="flex items-center justify-between font-bold">
            <span>PEDIDO {order.id}</span>
            <span>{hhmm(order.createdAt)}</span>
          </div>
          <div className="text-[11px] mt-1">
            <span className="font-bold">Cliente:</span> {order.customer}
          </div>
          <div className="text-[11px]">
            <span className="font-bold">Tel:</span> {order.customerPhone}
          </div>

          <div className="border-t border-dashed border-foreground/60 my-3" />

          {/* Items */}
          <div className="space-y-2">
            <div className="font-bold text-[11px] uppercase tracking-wider">Itens</div>
            {order.items.map((item, i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex justify-between gap-2">
                  <span className="flex-1">
                    <span className="font-bold">{item.qty}×</span> {item.name}
                  </span>
                  <span className="font-bold">{brl(item.qty * item.unitPrice)}</span>
                </div>
                {item.modifiers?.map((m, k) => (
                  <div
                    key={k}
                    className={`text-[10px] pl-4 ${
                      m.type === 'removal' ? 'italic' : ''
                    }`}
                  >
                    {m.type === 'removal' ? '– sem' : '+'} {m.label}
                    {m.qty && m.qty > 1 ? ` ×${m.qty}` : ''}
                  </div>
                ))}
                {item.note && (
                  <div className="text-[10px] pl-4 italic">obs: {item.note}</div>
                )}
              </div>
            ))}
            {order.observation && (
              <div className="text-[10px] italic mt-2 border-t border-dashed border-foreground/40 pt-2">
                Observação do pedido: {order.observation}
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-foreground/60 my-3" />

          {/* Totals */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{brl(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxa entrega ({order.distanceKm} km)</span>
              <span>{brl(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-bold text-[15px] pt-1 border-t border-dashed border-foreground/60 mt-1">
              <span>TOTAL</span>
              <span>{brl(order.total)}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span>Pagamento</span>
              <span className="font-bold uppercase">{order.paymentMethod}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-foreground/60 my-3" />

          {/* Delivery */}
          <div className="space-y-1">
            <div className="font-bold text-[11px] uppercase tracking-wider">Entrega</div>
            <div>{order.address}</div>
            <div className="text-[11px]">
              <span className="font-bold">Bairro:</span> {order.neighborhood}
            </div>
          </div>

          {/* QR */}
          <div className="flex flex-col items-center my-4">
            <div className="p-2 bg-background rounded">
              <QRCodeSVG value={mapsUrl} size={128} level="M" />
            </div>
            <div className="text-[10px] mt-1.5 font-bold">Escaneie para navegar</div>
            <div className="text-[9px] text-muted-foreground break-all text-center px-2">
              {mapsUrl}
            </div>
          </div>

          <div className="border-t border-dashed border-foreground/60 my-3" />

          {/* Motoboy fields */}
          <div className="space-y-2 text-[11px]">
            <div>
              <div className="font-bold text-[10px] uppercase tracking-wider mb-1">
                Motoboy
              </div>
              <div className="border-b border-foreground h-4" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="text-[10px] uppercase tracking-wider mb-1">Saída</div>
                <div className="border-b border-foreground h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider mb-1">Entrega</div>
                <div className="border-b border-foreground h-4" />
              </div>
            </div>
          </div>

          <div className="text-center text-[9px] mt-4 italic text-muted-foreground">
            *** Documento não fiscal ***
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeliveryReceiptsView() {
  const [selected, setSelected] = useState<VendorOrderDetail | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [query, setQuery] = useState('');

  const acceptedOrders = mockVendorOrders.filter((o) =>
    ['preparing', 'ready', 'in_transit', 'delivered'].includes(o.status),
  );

  const filtered = acceptedOrders.filter((o) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      o.id.toLowerCase().includes(q) ||
      o.customer.toLowerCase().includes(q) ||
      o.neighborhood.toLowerCase().includes(q)
    );
  });

  const openView = (o: VendorOrderDetail) => {
    setAutoPrint(false);
    setSelected(o);
  };
  const openPrint = (o: VendorOrderDetail) => {
    setAutoPrint(true);
    setSelected(o);
  };

  return (
    <div className="space-y-4">
      {/* Subtle note */}
      <p className="text-xs text-muted-foreground">
        Comanda para entrega — documento não fiscal, uso interno.
      </p>

      {/* Search */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por pedido, cliente ou bairro"
          className="pl-9"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed p-10 text-center">
          <Receipt className="h-10 w-10 mx-auto text-muted-foreground/60" />
          <p className="mt-3 font-medium text-sm">Nenhum pedido aceito ainda</p>
          <p className="text-xs text-muted-foreground mt-1">
            Assim que aceitar pedidos, as comandas aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((order) => (
            <div
              key={order.id}
              className="bg-card rounded-xl border p-4 hover:border-primary/40 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Receipt className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{order.id}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {order.items.length}{' '}
                        {order.items.length === 1 ? 'item' : 'itens'}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mt-0.5 truncate">
                      {order.customer}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {order.neighborhood} · {order.address}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:flex-col sm:items-end sm:text-right shrink-0 pl-14 sm:pl-0">
                  <p className="font-bold text-base">{brl(order.total)}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {hhmm(order.createdAt)}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => openView(order)}
                >
                  <Eye className="h-4 w-4 mr-1.5" /> Visualizar
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => openPrint(order)}
                >
                  <Printer className="h-4 w-4 mr-1.5" /> Imprimir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ReceiptPreview
        order={selected}
        open={!!selected}
        autoPrint={autoPrint}
        onClose={() => {
          setSelected(null);
          setAutoPrint(false);
        }}
      />
    </div>
  );
}

function InvoiceComingSoonView() {
  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border p-8 sm:p-12 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold">
          Emissão de nota fiscal — em breve
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
          Por enquanto o foco é a comanda de entrega, para você despachar pedidos com
          agilidade. A emissão de nota fiscal chegará em uma próxima atualização.
        </p>
        <Badge variant="secondary" className="mt-4">
          Em breve
        </Badge>
      </div>

      {/* Mock listing, marked as coming soon */}
      <div className="bg-card rounded-xl border">
        <div className="p-4 border-b flex items-center justify-between gap-2">
          <div>
            <h4 className="font-semibold text-sm">Notas emitidas</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Prévia da lista que aparecerá aqui.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">
            Em breve
          </Badge>
        </div>
        <div className="divide-y opacity-60 pointer-events-none select-none">
          {[
            { n: '000.123.456', order: 'ORD-001', v: 63.8 },
            { n: '000.123.457', order: 'ORD-002', v: 124.7 },
            { n: '000.123.458', order: 'ORD-006', v: 113.8 },
          ].map((r) => (
            <div key={r.n} className="flex items-center gap-3 p-4">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">NFC-e {r.n}</p>
                <p className="text-xs text-muted-foreground">Pedido {r.order}</p>
              </div>
              <p className="font-semibold text-sm shrink-0">{brl(r.v)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReceiptsTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Recibos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Imprima a comanda que vai com o motoboy na entrega.
        </p>
      </div>

      <Tabs defaultValue="delivery">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="delivery" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" /> Comanda de entrega
          </TabsTrigger>
          <TabsTrigger value="invoice" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Nota fiscal
            <Badge variant="secondary" className="ml-1 text-[9px] px-1.5 py-0">
              Em breve
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="delivery" className="mt-4">
          <DeliveryReceiptsView />
        </TabsContent>

        <TabsContent value="invoice" className="mt-4">
          <InvoiceComingSoonView />
        </TabsContent>
      </Tabs>

      {/* Print styles for thermal 80mm */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .receipt-print, .receipt-print * { visibility: visible; }
          .receipt-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 4mm;
            color: #000 !important;
            background: #fff !important;
            font-family: 'Courier New', monospace;
            max-height: none !important;
            overflow: visible !important;
          }
          .receipt-print .text-muted-foreground { color: #000 !important; }
          .receipt-print .border-foreground,
          .receipt-print .border-foreground\\/60,
          .receipt-print .border-foreground\\/40 { border-color: #000 !important; }
        }
      `}</style>
    </div>
  );
}
