// Recibos são enviados como bytes ESC/POS crus para uma ponte HTTP local
// (print-helper/print-helper.ps1) que roda no PC do caixa e repassa em modo
// RAW ao spooler do Windows. Esse caminho é necessário porque a impressão
// gráfica normal (window.print() -> driver) trava com 0 páginas em várias
// impressoras térmicas clone, enquanto o modo RAW imprime corretamente.
//
// O site pode estar hospedado na Vercel, mas a ponte sempre roda no notebook
// Windows conectado por USB à impressora da própria loja.
const PRINT_HELPER_BASE_URL = "http://127.0.0.1:9100";
const PAPER_WIDTH_CHARS = 32;

export interface ReceiptItem {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
  /** Ponto da carne / observação. Impresso sob o item quando presente. */
  notes?: string;
}

export interface ReceiptData {
  customer: string;
  items: ReceiptItem[];
  total: number;
  paymentMethod?: string;
}

const COMBINING_DIACRITICS = new RegExp('[̀-ͯ]', 'g');

function stripAccents(value: string) {
  return value.normalize('NFD').replace(COMBINING_DIACRITICS, '');
}

function padLine(left: string, right: string, width = PAPER_WIDTH_CHARS) {
  const l = stripAccents(left);
  const r = stripAccents(right);
  const gap = Math.max(1, width - l.length - r.length);
  return l.length + r.length + 1 > width ? `${l.slice(0, width - r.length - 1)} ${r}` : `${l}${' '.repeat(gap)}${r}`;
}

const ESC = 0x1b;
const GS = 0x1d;

class EscPosBuilder {
  private chunks: Uint8Array[] = [];

  private push(...bytes: number[]) {
    this.chunks.push(new Uint8Array(bytes));
    return this;
  }

  init() {
    return this.push(ESC, 0x40);
  }

  align(mode: 'left' | 'center' | 'right') {
    return this.push(ESC, 0x61, mode === 'center' ? 1 : mode === 'right' ? 2 : 0);
  }

  bold(on: boolean) {
    return this.push(ESC, 0x45, on ? 1 : 0);
  }

  doubleSize(on: boolean) {
    return this.push(GS, 0x21, on ? 0x11 : 0x00);
  }

  text(value: string) {
    this.chunks.push(new TextEncoder().encode(stripAccents(value)));
    return this;
  }

  line(value = '') {
    this.text(value);
    return this.push(0x0a);
  }

  divider() {
    return this.line('-'.repeat(PAPER_WIDTH_CHARS));
  }

  feedLines(lines: number) {
    for (let i = 0; i < lines; i++) this.push(0x0a);
    return this;
  }

  build(): Uint8Array {
    const size = this.chunks.reduce((acc, c) => acc + c.length, 0);
    const out = new Uint8Array(size);
    let offset = 0;
    for (const chunk of this.chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }
}

function buildReceiptEscPos({ customer, items, total, paymentMethod }: ReceiptData): Uint8Array {
  const now = new Date();
  const b = new EscPosBuilder();
  b.init();

  b.align('center');
  b.line(`${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`);
  b.divider();

  b.align('left');
  b.bold(true);
  b.line(`Mesa/Cliente: ${customer}`);
  b.bold(false);
  b.divider();

  for (const item of items) {
    b.line(`${item.qty}x ${item.name}`);
    if (item.notes) b.line(`  > ${item.notes}`);
    b.line(padLine(`  R$ ${item.unitPrice.toFixed(2)} un.`, `R$ ${item.total.toFixed(2)}`));
  }
  b.divider();

  b.doubleSize(true);
  b.bold(true);
  b.line(padLine('TOTAL', `R$ ${total.toFixed(2)}`, Math.floor(PAPER_WIDTH_CHARS / 2)));
  b.doubleSize(false);
  b.bold(false);
  if (paymentMethod) b.line(padLine('Pagamento', paymentMethod));
  b.divider();

  const notes = items.map((item) => item.notes).filter((note): note is string => Boolean(note));
  if (notes.length > 0) {
    b.align('center');
    b.line(`Obs: ${notes.join(', ')}`);
  }
  b.feedLines(4);

  return b.build();
}

export interface OrderChange {
  type: 'removido' | 'adicionado';
  name: string;
  qty: number;
  /** Ponto da carne / observação do item. */
  notes?: string;
}

// Via do PEDIDO (cozinha/churrasqueira): impressa no momento em que o pedido é
// salvo, com foco em produto + ponto da carne + observação — NÃO mostra preço.
// Serve para o preparo sair certo e reduzir erro/retorno do cliente.
function buildOrderTicketEscPos({
  customer,
  items,
  total,
}: {
  customer: string;
  items: ReceiptItem[];
  /** Total da comanda (soma dos itens deste pedido inicial). */
  total?: number;
}): Uint8Array {
  const now = new Date();
  const b = new EscPosBuilder();
  b.init();

  b.align('center');
  b.doubleSize(true);
  b.bold(true);
  b.line('PEDIDO');
  b.doubleSize(false);
  b.bold(false);
  b.line(`${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`);
  b.divider();

  b.align('left');
  b.doubleSize(true);
  b.bold(true);
  b.line(`Mesa: ${customer}`);
  b.doubleSize(false);
  b.bold(false);
  b.divider();

  for (const item of items) {
    b.bold(true);
    b.line(`${item.qty}x ${item.name}`);
    b.bold(false);
    if (item.notes) b.line(`   >> ${item.notes}`);
  }
  b.divider();

  if (total !== undefined) {
    b.bold(true);
    b.line(padLine('Total', `R$ ${total.toFixed(2)}`));
    b.bold(false);
    b.divider();
  }

  b.feedLines(4);

  return b.build();
}

// Bloco de ATUALIZAÇÃO do pedido (item removido ou adicionado numa comanda já
// aberta). NÃO repete o pedido original — apenas continua na mesma via
// física, com só a mudança desta edição.
function buildOrderUpdateEscPos({
  customer,
  changes,
  newTotal,
}: {
  customer: string;
  changes: OrderChange[];
  /** Novo total da comanda já com a mudança aplicada. */
  newTotal?: number;
}): Uint8Array {
  const b = new EscPosBuilder();
  b.init();

  b.align('center');
  b.bold(true);
  b.doubleSize(true);
  b.line('PEDIDO ATUALIZADO');
  b.doubleSize(false);
  b.bold(false);
  const now = new Date();
  b.line(`${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`);
  b.divider();

  b.align('left');
  b.bold(true);
  b.line(`Mesa: ${customer}`);
  b.bold(false);

  const removed = changes.filter((c) => c.type === 'removido');
  const added = changes.filter((c) => c.type === 'adicionado');

  const renderGroup = (title: string, list: OrderChange[]) => {
    if (!list.length) return;
    b.line('');
    b.bold(true);
    b.line(title);
    b.bold(false);
    b.line('-'.repeat(PAPER_WIDTH_CHARS));
    for (const change of list) {
      b.line(`${change.qty}x ${change.name}`);
      if (change.notes) b.line(`   >> ${change.notes}`);
    }
  };

  renderGroup('SAIU (removido)', removed);
  renderGroup('ENTROU (adicionado)', added);

  if (newTotal !== undefined) {
    b.line('');
    b.bold(true);
    b.line(padLine('Novo total', `R$ ${newTotal.toFixed(2)}`));
    b.bold(false);
  }
  b.divider();
  b.feedLines(4);

  return b.build();
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function sendToPrintHelper(bytes: Uint8Array) {
  const res = await fetch(`${PRINT_HELPER_BASE_URL}/print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: bytesToBase64(bytes) }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.error || `HTTP ${res.status}`);
  }
}

export async function getPrintHelperStatus() {
  const response = await fetch(`${PRINT_HELPER_BASE_URL}/status`, { signal: AbortSignal.timeout(3500) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<{ ok: boolean; printer?: string | null }>;
}

export async function sendPrinterTest() {
  const builder = new EscPosBuilder();
  builder.init().align("center").bold(true).doubleSize(true).line("TESTE OK");
  builder.doubleSize(false).bold(false).line("Cardapio Cloud").line(new Date().toLocaleString("pt-BR")).feedLines(4);
  await sendToPrintHelper(builder.build());
}

/**
 * Envia o recibo do cliente (com preços e forma de pagamento) para a
 * impressora térmica via ponte local. Lança erro se a ponte não responder —
 * quem chamar decide o fallback (ex.: impressão pelo navegador).
 */
export async function sendReceiptToPrinter(data: ReceiptData) {
  const bytes = buildReceiptEscPos(data);
  await sendToPrintHelper(bytes);
}

/**
 * Envia a via de PEDIDO (cozinha) — sem preços, com foco em produto + ponto +
 * observação — para a impressora térmica via ponte local.
 */
export async function sendOrderTicketToPrinter(data: { customer: string; items: ReceiptItem[]; total?: number }) {
  const bytes = buildOrderTicketEscPos(data);
  await sendToPrintHelper(bytes);
}

/**
 * Envia só o bloco de ATUALIZAÇÃO (item removido/adicionado numa edição de
 * comanda já aberta) para a impressora térmica via ponte local.
 */
export async function sendOrderUpdateToPrinter(data: { customer: string; changes: OrderChange[]; newTotal?: number }) {
  const bytes = buildOrderUpdateEscPos(data);
  await sendToPrintHelper(bytes);
}
