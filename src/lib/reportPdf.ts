import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const BUSINESS = "Cardápio Digital";
const COLORS = {
  ink: [17, 24, 39] as [number, number, number],
  panel: [31, 41, 55] as [number, number, number],
  yellow: [255, 199, 0] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  muted: [107, 114, 128] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  soft: [248, 250, 252] as [number, number, number],
};

const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const formatDateTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString("pt-BR");

export interface ReportSale {
  id: number;
  name: string;
  total: number;
  method: string;
  createdAt: number;
  items: { name: string; qty: number; price: number; detail?: string }[];
}

export interface ReportExpense {
  id: number;
  description: string;
  amount: number;
  createdAt: number;
}

export interface ReportPdfData {
  businessName?: string;
  periodLabel: string;
  sales: ReportSale[];
  expenses: ReportExpense[];
  pendingCommands: number;
  includeItems?: boolean;
  includeCharts?: boolean;
}

type PdfWithTable = jsPDF & { lastAutoTable?: { finalY: number } };

export function generateReportPdf({
  businessName = BUSINESS,
  periodLabel,
  sales,
  expenses,
  pendingCommands,
  includeItems = true,
  includeCharts = true,
}: ReportPdfData) {
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const profit = totalSales - totalExpenses;
  const marginValue = totalSales > 0 ? (profit / totalSales) * 100 : 0;
  const averageTicket = sales.length ? totalSales / sales.length : 0;
  const generatedAt = new Date().toLocaleString("pt-BR");

  const doc = new jsPDF({ unit: "mm", format: "a4" }) as PdfWithTable;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;

  const setText = (color: [number, number, number]) => doc.setTextColor(...color);
  const lastY = () => doc.lastAutoTable?.finalY ?? 0;
  const ensureSpace = (currentY: number, required: number) => {
    if (currentY + required <= pageH - 18) return currentY;
    doc.addPage();
    return 18;
  };
  const sectionTitle = (title: string, currentY: number, description?: string) => {
    const y = ensureSpace(currentY, description ? 17 : 12);
    doc.setFillColor(...COLORS.yellow);
    doc.roundedRect(margin, y, 2.2, description ? 11 : 7, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setText(COLORS.ink);
    doc.text(title, margin + 5, y + 5);
    if (description) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.2);
      setText(COLORS.muted);
      doc.text(description, margin + 5, y + 9.5);
    }
    return y + (description ? 14 : 10);
  };
  const metricCard = (
    x: number,
    y: number,
    width: number,
    label: string,
    value: string,
    accent: [number, number, number],
  ) => {
    doc.setFillColor(...COLORS.soft);
    doc.setDrawColor(...COLORS.line);
    doc.roundedRect(x, y, width, 22, 2.2, 2.2, "FD");
    doc.setFillColor(...accent);
    doc.roundedRect(x, y, 2.3, 22, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setText(COLORS.muted);
    doc.text(label.toUpperCase(), x + 6, y + 7);
    doc.setFontSize(value.length > 15 ? 11.2 : 13);
    setText(COLORS.ink);
    doc.text(value, x + 6, y + 16);
  };
  const emptyState = (message: string, currentY: number) => {
    const y = ensureSpace(currentY, 17);
    doc.setFillColor(...COLORS.soft);
    doc.setDrawColor(...COLORS.line);
    doc.roundedRect(margin, y, contentW, 13, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(COLORS.muted);
    doc.text(message, pageW / 2, y + 8, { align: "center" });
    return y + 13;
  };
  const tableBase = {
    theme: "plain" as const,
    styles: {
      font: "helvetica",
      fontSize: 8.6,
      cellPadding: 2.4,
      textColor: COLORS.ink,
      lineColor: COLORS.line,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: COLORS.panel,
      textColor: COLORS.white,
      fontStyle: "bold" as const,
      fontSize: 8.5,
      cellPadding: 2.6,
    },
    alternateRowStyles: { fillColor: COLORS.soft },
    margin: { left: margin, right: margin, top: 16, bottom: 16 },
  };

  // Cabeçalho com a identidade preto e amarelo do sistema.
  doc.setFillColor(...COLORS.ink);
  doc.rect(0, 0, pageW, 48, "F");
  doc.setFillColor(...COLORS.yellow);
  doc.roundedRect(margin, 12, 14, 14, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  setText(COLORS.ink);
  doc.text("CD", margin + 7, 20.5, { align: "center" });
  doc.setFontSize(16);
  setText(COLORS.white);
  doc.text(businessName, margin + 19, 17.5);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text("Relatório financeiro e operacional", margin + 19, 23.5);
  doc.setFillColor(...COLORS.yellow);
  doc.roundedRect(pageW - margin - 50, 12, 50, 14, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  setText(COLORS.ink);
  doc.text("PERÍODO ANALISADO", pageW - margin - 46, 17);
  doc.setFontSize(10);
  doc.text(periodLabel, pageW - margin - 46, 22.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Gerado em ${generatedAt}`, margin, 39);

  let y = 55;
  y = sectionTitle("Visão geral", y, "Os principais números do período selecionado");
  const gap = 3;
  const cardW = (contentW - gap * 3) / 4;
  metricCard(margin, y, cardW, "Faturamento", brl(totalSales), COLORS.yellow);
  metricCard(margin + cardW + gap, y, cardW, "Custos", brl(totalExpenses), COLORS.red);
  metricCard(margin + (cardW + gap) * 2, y, cardW, "Resultado", brl(profit), profit >= 0 ? COLORS.green : COLORS.red);
  metricCard(margin + (cardW + gap) * 3, y, cardW, "Margem", `${marginValue.toFixed(1)}%`, profit >= 0 ? COLORS.green : COLORS.red);
  y += 27;

  doc.setFillColor(...COLORS.soft);
  doc.setDrawColor(...COLORS.line);
  doc.roundedRect(margin, y, contentW, 13, 2, 2, "FD");
  const quickMetrics = [
    ["VENDAS", String(sales.length)],
    ["TICKET MÉDIO", brl(averageTicket)],
    ["COMANDAS PENDENTES", String(pendingCommands)],
  ];
  quickMetrics.forEach(([label, value], index) => {
    const blockW = contentW / 3;
    const x = margin + blockW * index;
    if (index) {
      doc.setDrawColor(...COLORS.line);
      doc.line(x, y + 2.5, x, y + 10.5);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    setText(COLORS.muted);
    doc.text(label, x + blockW / 2, y + 4.8, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(COLORS.ink);
    doc.text(value, x + blockW / 2, y + 10, { align: "center" });
  });
  y += 20;

  if (includeCharts) {
    const methods = new Map<string, number>();
    sales.forEach((sale) => methods.set(sale.method || "Não informado", (methods.get(sale.method || "Não informado") || 0) + sale.total));
    y = sectionTitle("Formas de pagamento", y, "Distribuição do faturamento por meio de recebimento");
    if (methods.size) {
      autoTable(doc, {
        ...tableBase,
        startY: y,
        head: [["FORMA DE PAGAMENTO", "VALOR", "PARTICIPAÇÃO"]],
        body: Array.from(methods.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([method, total]) => [
            method,
            brl(total),
            `${totalSales > 0 ? ((total / totalSales) * 100).toFixed(1) : "0.0"}%`,
          ]),
        columnStyles: { 1: { halign: "right", fontStyle: "bold" }, 2: { halign: "right" } },
      });
      y = lastY() + 7;
    } else {
      y = emptyState("Nenhum pagamento registrado neste período.", y);
      y += 7;
    }
  }

  if (includeItems) {
    const grouped = new Map<string, { qty: number; revenue: number }>();
    sales.flatMap((sale) => sale.items).forEach((item) => {
      const previous = grouped.get(item.name) || { qty: 0, revenue: 0 };
      grouped.set(item.name, {
        qty: previous.qty + item.qty,
        revenue: previous.revenue + item.qty * item.price,
      });
    });
    const ranking = Array.from(grouped.entries()).sort((a, b) => b[1].revenue - a[1].revenue);

    y = sectionTitle("Produtos vendidos", y, "Quantidade e receita gerada por produto");
    if (ranking.length) {
      autoTable(doc, {
        ...tableBase,
        startY: y,
        head: [["PRODUTO", "QUANTIDADE", "RECEITA"]],
        body: ranking.map(([name, data]) => [name, String(data.qty), brl(data.revenue)]),
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right", fontStyle: "bold" } },
      });
      y = lastY() + 7;
    } else {
      y = emptyState("Nenhum produto vendido neste período.", y);
      y += 7;
    }

    const sortedSales = [...sales].sort((a, b) => b.createdAt - a.createdAt);
    const saleRows = sortedSales.flatMap((sale) =>
      sale.items.map((item) => [
        formatDateTime(sale.createdAt),
        sale.name,
        item.name,
        item.detail || "-",
        String(item.qty),
        brl(item.qty * item.price),
        sale.method || "-",
      ]),
    );
    y = sectionTitle("Vendas detalhadas", y, "Itens registrados nas comandas finalizadas");
    if (saleRows.length) {
      autoTable(doc, {
        ...tableBase,
        startY: y,
        head: [["DATA/HORA", "MESA", "PRODUTO", "PONTO / OBS.", "QTD", "VALOR", "PGTO"]],
        body: saleRows,
        styles: { ...tableBase.styles, fontSize: 7.5, cellPadding: 1.8 },
        columnStyles: { 4: { halign: "right" }, 5: { halign: "right", fontStyle: "bold" } },
      });
      y = lastY() + 7;
    } else {
      y = emptyState("Nenhuma venda detalhada neste período.", y);
      y += 7;
    }
  }

  y = sectionTitle("Custos detalhados", y, "Despesas registradas no período");
  const sortedExpenses = [...expenses].sort((a, b) => b.createdAt - a.createdAt);
  if (sortedExpenses.length) {
    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [["DATA", "DESCRIÇÃO", "VALOR"]],
      body: sortedExpenses.map((expense) => [formatDate(expense.createdAt), expense.description, brl(expense.amount)]),
      columnStyles: { 2: { halign: "right", fontStyle: "bold" } },
    });
  } else {
    emptyState("Nenhum custo registrado neste período.", y);
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.line);
    doc.line(margin, pageH - 13, pageW - margin, pageH - 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setText(COLORS.muted);
    doc.text(businessName, margin, pageH - 8);
    doc.text(`Página ${page} de ${pages}`, pageW - margin, pageH - 8, { align: "right" });
  }

  const safe = periodLabel.replace(/[^\w-]+/g, "-");
  doc.save(`relatorio-${safe}.pdf`);
  return doc;
}
