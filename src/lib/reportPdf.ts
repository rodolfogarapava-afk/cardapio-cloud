import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const BUSINESS = "Burguer House";
const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
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

// Gera um relatório PDF completo (A4, letra legível) com resumo financeiro,
// ranking de produtos, vendas detalhadas e custos — para consulta fora do app.
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
  const margem = totalSales > 0 ? ((profit / totalSales) * 100).toFixed(1) : "0";

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(businessName, pageW / 2, 18, { align: "center" });
  doc.setFontSize(13);
  doc.text("Relatório de Vendas e Custos", pageW / 2, 26, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Período: ${periodLabel}`, pageW / 2, 33, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, pageW / 2, 39, { align: "center" });
  doc.setTextColor(0);

  // Resumo
  autoTable(doc, {
    startY: 44,
    head: [["Resumo do período", ""]],
    body: [
      ["Vendas (bruto)", brl(totalSales)],
      ["Custos", `- ${brl(totalExpenses)}`],
      ["Lucro (líquido)", brl(profit)],
      ["Margem de lucro", `${margem}%`],
      ["Nº de vendas", String(sales.length)],
      ["Comandas pendentes", String(pendingCommands)],
    ],
    theme: "grid",
    styles: { fontSize: 11, cellPadding: 2.5 },
    headStyles: { fillColor: [223, 166, 32], textColor: 30, fontSize: 12 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    margin: { left: margin, right: margin },
  });

  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  if (includeCharts) {
    const methods = new Map<string, number>();
    sales.forEach((sale) => methods.set(sale.method, (methods.get(sale.method) || 0) + sale.total));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Resumo por forma de pagamento", margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: [["Forma de pagamento", "Valor", "Participação"]],
      body: methods.size
        ? Array.from(methods.entries()).map(([method, total]) => [
            method,
            brl(total),
            `${totalSales > 0 ? ((total / totalSales) * 100).toFixed(1) : "0.0"}%`,
          ])
        : [["-", brl(0), "0.0%"]],
      theme: "striped",
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [55, 65, 81], textColor: 255 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
      margin: { left: margin, right: margin },
    });
  }

  // Produtos vendidos
  if (includeItems) {
    const grouped = new Map<string, { qty: number; revenue: number }>();
    sales
      .flatMap((sale) => sale.items)
      .forEach((item) => {
        const old = grouped.get(item.name) || { qty: 0, revenue: 0 };
        grouped.set(item.name, {
          qty: old.qty + item.qty,
          revenue: old.revenue + item.qty * item.price,
        });
      });
    const ranking = Array.from(grouped.entries()).sort((a, b) => b[1].revenue - a[1].revenue);

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Produtos vendidos", margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: [["Produto", "Qtd", "Receita"]],
      body: ranking.length
        ? ranking.map(([name, data]) => [name, String(data.qty), brl(data.revenue)])
        : [["-", "-", "Nenhuma venda no período"]],
      theme: "striped",
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [55, 65, 81], textColor: 255 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
      margin: { left: margin, right: margin },
    });

    // Vendas detalhadas (uma linha por item)
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Vendas detalhadas", margin, y);
    const sortedSales = [...sales].sort((a, b) => a.createdAt - b.createdAt);
    const saleRows = sortedSales.flatMap((sale) =>
      sale.items.map((item) => [
        formatDateTime(sale.createdAt),
        sale.name,
        item.name,
        item.detail || "-",
        String(item.qty),
        brl(item.qty * item.price),
        sale.method,
      ]),
    );
    autoTable(doc, {
      startY: y + 2,
      head: [["Data/Hora", "Mesa", "Produto", "Ponto / Obs.", "Qtd", "Valor", "Pgto"]],
      body: saleRows.length ? saleRows : [["-", "-", "-", "-", "-", "-", "-"]],
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 1.6 },
      headStyles: { fillColor: [55, 65, 81], textColor: 255 },
      columnStyles: { 4: { halign: "right" }, 5: { halign: "right" } },
      margin: { left: margin, right: margin },
    });
  }

  // Custos detalhados
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Custos detalhados", margin, y);
  const sortedExpenses = [...expenses].sort((a, b) => a.createdAt - b.createdAt);
  autoTable(doc, {
    startY: y + 2,
    head: [["Data", "Descrição", "Valor"]],
    body: sortedExpenses.length
      ? sortedExpenses.map((expense) => [
          formatDate(expense.createdAt),
          expense.description,
          brl(expense.amount),
        ])
      : [["-", "Nenhum custo no período", "-"]],
    theme: "striped",
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [55, 65, 81], textColor: 255 },
    columnStyles: { 2: { halign: "right" } },
    margin: { left: margin, right: margin },
  });

  // Rodapé com numeração
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `${businessName}  •  página ${i} de ${pages}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" },
    );
  }

  const safe = periodLabel.replace(/[^\w-]+/g, "-");
  doc.save(`relatorio-${safe}.pdf`);
}
