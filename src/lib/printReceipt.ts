// Recibos são enviados como bytes ESC/POS crus para uma ponte HTTP local
// (print-helper/print-helper.ps1) que roda no PC do caixa e repassa em modo
// RAW ao spooler do Windows. Esse caminho é necessário porque a impressão
// gráfica normal (window.print() -> driver) trava com 0 páginas em várias
// impressoras térmicas clone, enquanto o modo RAW imprime corretamente.
//
// O site pode estar hospedado na Vercel, mas a ponte sempre roda no notebook
// Windows conectado por USB à impressora da própria loja.
// 19100 e a porta atual. 9100 permanece como fallback para notebooks que
// ainda nao reinstalaram o agente antigo.
const PRINT_HELPER_BASE_URLS = ["http://127.0.0.1:19100", "http://127.0.0.1:9100"];
const PAPER_WIDTH_CHARS = 32;

export interface ReceiptItem {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
  /** Categoria usada para encaminhar o item ao ponto de preparo correto. */
  category?: string;
  /** Ponto da carne / observação. Impresso sob o item quando presente. */
  notes?: string;
}

export interface ReceiptData {
  customer: string;
  items: ReceiptItem[];
  total: number;
  paymentMethod?: string;
}

const QUANTITY_PRECISION = 1000;
const MONEY_PRECISION = 100;
const COMBINING_DIACRITICS = /[\u0300-\u036f]/g;

/**
 * Evita que erros binarios do JavaScript (ex.: 14.9 / 14.9 resultar em
 * 0.9999999999999999) sejam gravados ou impressos no cupom.
 */
export function normalizeReceiptQuantity(value: unknown): number {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  const rounded = Math.round(quantity * QUANTITY_PRECISION) / QUANTITY_PRECISION;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function formatReceiptQuantity(value: unknown): string {
  const quantity = normalizeReceiptQuantity(value);
  if (Number.isInteger(quantity)) return String(quantity);
  return quantity.toLocaleString('pt-BR', {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

export function roundReceiptMoney(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  const rounded = Math.round((amount + Number.EPSILON) * MONEY_PRECISION) / MONEY_PRECISION;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function normalizeReceiptItems(items: ReceiptItem[]): ReceiptItem[] {
  return items.map((item) => {
    const qty = normalizeReceiptQuantity(item.qty);
    const unitPrice = roundReceiptMoney(item.unitPrice);
    const suppliedTotal = Number(item.total);
    const total = roundReceiptMoney(Number.isFinite(suppliedTotal) ? suppliedTotal : qty * unitPrice);
    return { ...item, qty, unitPrice, total };
  });
}

export function normalizeOrderChanges(changes: OrderChange[]): OrderChange[] {
  return changes.map((change) => ({ ...change, qty: normalizeReceiptQuantity(change.qty) }));
}

function stripAccents(value: string) {
  return value.normalize('NFD').replace(COMBINING_DIACRITICS, '')
    .replace(/[×·•–—]/g, (character) => character === '×' ? 'x' : character === '·' || character === '•' ? '-' : '-')
    .replace(/[^\x20-\x7E\n\r\t]/g, '');
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
  const safeItems = normalizeReceiptItems(items);
  const safeTotal = roundReceiptMoney(total);
  b.init();

  b.align('center');
  b.line(`${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`);
  b.divider();

  b.align('left');
  b.bold(true);
  b.line(`Mesa/Cliente: ${customer}`);
  b.bold(false);
  b.divider();

  for (const item of safeItems) {
    b.line(`${formatReceiptQuantity(item.qty)}x ${item.name}`);
    if (item.notes) b.line(`  > ${item.notes}`);
    b.line(padLine(`  R$ ${item.unitPrice.toFixed(2)} un.`, `R$ ${item.total.toFixed(2)}`));
  }
  b.divider();

  b.doubleSize(true);
  b.bold(true);
  b.line(padLine('TOTAL', `R$ ${safeTotal.toFixed(2)}`, Math.floor(PAPER_WIDTH_CHARS / 2)));
  b.doubleSize(false);
  b.bold(false);
  if (paymentMethod) b.line(padLine('Pagamento', paymentMethod));
  b.divider();

  const notes = safeItems.map((item) => item.notes).filter((note): note is string => Boolean(note));
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
  /** Categoria usada para encaminhar a alteracao a impressora correta. */
  category?: string;
  /** Ponto da carne / observação do item. */
  notes?: string;
}

// Via do PEDIDO (cozinha/churrasqueira): impressa no momento em que o pedido é
// salvo, com foco em produto + ponto da carne + observação — NÃO mostra preço.
// Serve para o preparo sair certo e reduzir erro/retorno do cliente.
function buildOrderTicketEscPos({
  customer,
  waiter,
  items,
  total,
}: {
  customer: string;
  waiter?: string;
  items: ReceiptItem[];
  /** Total da comanda (soma dos itens deste pedido inicial). */
  total?: number;
}): Uint8Array {
  const now = new Date();
  const b = new EscPosBuilder();
  const safeItems = normalizeReceiptItems(items);
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
  if (waiter) b.line(`Garcom: ${waiter}`);
  b.divider();

  for (const item of safeItems) {
    b.bold(true);
    b.line(`${formatReceiptQuantity(item.qty)}x ${item.name}`);
    b.bold(false);
    if (item.notes) b.line(`   >> ${item.notes}`);
  }
  b.divider();

  if (total !== undefined) {
    b.bold(true);
    b.line(padLine('Total', `R$ ${roundReceiptMoney(total).toFixed(2)}`));
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
  waiter,
  changes,
  newTotal,
}: {
  customer: string;
  waiter?: string;
  changes: OrderChange[];
  /** Novo total da comanda já com a mudança aplicada. */
  newTotal?: number;
}): Uint8Array {
  const b = new EscPosBuilder();
  const safeChanges = normalizeOrderChanges(changes);
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
  if (waiter) b.line(`Garcom: ${waiter}`);

  const removed = safeChanges.filter((c) => c.type === 'removido');
  const added = safeChanges.filter((c) => c.type === 'adicionado');

  const renderGroup = (title: string, list: OrderChange[]) => {
    if (!list.length) return;
    b.line('');
    b.bold(true);
    b.line(title);
    b.bold(false);
    b.line('-'.repeat(PAPER_WIDTH_CHARS));
    for (const change of list) {
      b.line(`${formatReceiptQuantity(change.qty)}x ${change.name}`);
      if (change.notes) b.line(`   >> ${change.notes}`);
    }
  };

  renderGroup('SAIU (removido)', removed);
  renderGroup('ENTROU (adicionado)', added);

  if (newTotal !== undefined) {
    b.line('');
    b.bold(true);
    b.line(padLine('Novo total', `R$ ${roundReceiptMoney(newTotal).toFixed(2)}`));
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

export type PrinterRoutePayload = {
  printer1?: { data: string; itemCount: number };
  printer2?: { data: string; itemCount: number };
  /** Compatibilidade com agentes instalados antes do roteamento configuravel. */
  skewers?: { data: string; itemCount: number };
  sides?: { data: string; itemCount: number };
};

const isSkewerCategory = (category?: string) =>
  stripAccents(category || '').trim().toLocaleLowerCase('pt-BR').includes('espet');

const normalizeCategory = (category?: string) =>
  stripAccents(category || '').trim().toLocaleLowerCase('pt-BR');

function goesToPrinterOne(category: string | undefined, printerOneCategories?: string[]) {
  if (!printerOneCategories) return isSkewerCategory(category);
  const selected = new Set(printerOneCategories.map(normalizeCategory));
  return selected.has(normalizeCategory(category));
}

function compatibleRoutes(printer1?: { data: string; itemCount: number }, printer2?: { data: string; itemCount: number }): PrinterRoutePayload {
  return {
    ...(printer1 ? { printer1, skewers: printer1 } : {}),
    ...(printer2 ? { printer2, sides: printer2 } : {}),
  };
}

function buildOrderRoutesBase64(data: { customer: string; waiter?: string; items: ReceiptItem[]; total?: number }, printerOneCategories?: string[]): PrinterRoutePayload {
  const printer1Items = data.items.filter((item) => goesToPrinterOne(item.category, printerOneCategories));
  const printer2Items = data.items.filter((item) => !goesToPrinterOne(item.category, printerOneCategories));
  const printer1 = printer1Items.length ? { data: bytesToBase64(buildOrderTicketEscPos({ ...data, items: printer1Items })), itemCount: printer1Items.length } : undefined;
  const printer2 = printer2Items.length ? { data: bytesToBase64(buildOrderTicketEscPos({ ...data, items: printer2Items })), itemCount: printer2Items.length } : undefined;
  return compatibleRoutes(printer1, printer2);
}

function buildUpdateRoutesBase64(data: { customer: string; waiter?: string; changes: OrderChange[]; newTotal?: number }, printerOneCategories?: string[]): PrinterRoutePayload {
  const printer1Changes = data.changes.filter((change) => goesToPrinterOne(change.category, printerOneCategories));
  const printer2Changes = data.changes.filter((change) => !goesToPrinterOne(change.category, printerOneCategories));
  const printer1 = printer1Changes.length ? { data: bytesToBase64(buildOrderUpdateEscPos({ ...data, changes: printer1Changes })), itemCount: printer1Changes.length } : undefined;
  const printer2 = printer2Changes.length ? { data: bytesToBase64(buildOrderUpdateEscPos({ ...data, changes: printer2Changes })), itemCount: printer2Changes.length } : undefined;
  return compatibleRoutes(printer1, printer2);
}

async function sendToPrintHelper(bytes: Uint8Array, routes?: PrinterRoutePayload) {
  let connectionError: unknown;
  for (const baseUrl of PRINT_HELPER_BASE_URLS) {
    let helperResponded = false;
    try {
      const res = await fetch(`${baseUrl}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: bytesToBase64(bytes), ...(routes ? { routes } : {}) }),
      });
      helperResponded = true;
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail?.error || `HTTP ${res.status}`);
      }
      return;
    } catch (error) {
      // Se o agente respondeu, a solicitacao chegou ate ele. Nao tente a
      // porta antiga, pois isso poderia imprimir o mesmo pedido duas vezes.
      if (helperResponded) throw error;
      connectionError = error;
    }
  }
  throw connectionError instanceof Error ? connectionError : new Error("Agente local indisponivel");
}

export async function getPrintHelperStatus() {
  let connectionError: unknown;
  for (const baseUrl of PRINT_HELPER_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}/status`, { signal: AbortSignal.timeout(3500) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ ok: boolean; printer?: string | null; printers?: string[] }>;
    } catch (error) {
      connectionError = error;
    }
  }
  throw connectionError instanceof Error ? connectionError : new Error("Agente local indisponivel");
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
export async function sendOrderTicketToPrinter(data: { customer: string; waiter?: string; items: ReceiptItem[]; total?: number }) {
  const bytes = buildOrderTicketEscPos(data);
  await sendToPrintHelper(bytes, buildOrderRoutesBase64(data));
}

export function buildOrderTicketBase64(data: { customer: string; waiter?: string; items: ReceiptItem[]; total?: number }) {
  return bytesToBase64(buildOrderTicketEscPos(data));
}

export function buildOrderTicketRoutesBase64(data: { customer: string; waiter?: string; items: ReceiptItem[]; total?: number }, printerOneCategories?: string[]) {
  return buildOrderRoutesBase64(data, printerOneCategories);
}

export function buildReceiptBase64(data: ReceiptData) {
  return bytesToBase64(buildReceiptEscPos(data));
}

export function buildOrderUpdateBase64(data: { customer: string; waiter?: string; changes: OrderChange[]; newTotal?: number }) {
  return bytesToBase64(buildOrderUpdateEscPos(data));
}

export function buildOrderUpdateRoutesBase64(data: { customer: string; waiter?: string; changes: OrderChange[]; newTotal?: number }, printerOneCategories?: string[]) {
  return buildUpdateRoutesBase64(data, printerOneCategories);
}

/**
 * Envia só o bloco de ATUALIZAÇÃO (item removido/adicionado numa edição de
 * comanda já aberta) para a impressora térmica via ponte local.
 */
export async function sendOrderUpdateToPrinter(data: { customer: string; waiter?: string; changes: OrderChange[]; newTotal?: number }) {
  const bytes = buildOrderUpdateEscPos(data);
  await sendToPrintHelper(bytes, buildUpdateRoutesBase64(data));
}
