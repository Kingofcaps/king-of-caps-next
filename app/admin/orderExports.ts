import type { Order } from "@/app/lib/orders";
import { formatDualPrice } from "@/app/lib/prices";

export type ExportDateFilter = "all" | "today" | "week" | "month" | "custom";

const paymentLabels = { cash_on_delivery: "Paiement à la livraison", mobile_money: "Mobile Money", card: "Carte bancaire" } as const;
const paymentStatusLabels = { pending: "En attente", paid: "Payé", failed: "Échec" } as const;
const orderStatusLabels = { new: "Nouvelle", confirmed: "Confirmée", preparing: "En préparation", delivered: "Livrée", cancelled: "Annulée" } as const;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function isRevenueOrder(order: Order) {
  return order.order_status !== "cancelled" && (order.payment_status === "paid" || (order.payment_method === "cash_on_delivery" && order.order_status === "delivered"));
}

function download(blob: Blob, fileName: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function filterOrdersForExport(orders: Order[], filter: ExportDateFilter, startDate: string, endDate: string) {
  const now = new Date();
  const today = startOfDay(now);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const customStart = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const customEnd = endDate ? new Date(`${endDate}T23:59:59.999`) : null;

  return orders.filter((order) => {
    const createdAt = new Date(order.created_at);
    if (filter === "today") return createdAt >= today;
    if (filter === "week") return createdAt >= weekStart;
    if (filter === "month") return createdAt >= monthStart;
    if (filter === "custom") return (!customStart || createdAt >= customStart) && (!customEnd || createdAt <= customEnd);
    return true;
  });
}

export function totalExportRevenue(orders: Order[]) {
  return orders.filter(isRevenueOrder).reduce((total, order) => total + order.total_amount, 0);
}

function exportRows(orders: Order[]) {
  return orders.map((order) => [
    order.order_number,
    formatDate(order.created_at),
    `${order.customer_first_name} ${order.customer_last_name}`,
    order.customer_phone,
    order.product_name,
    order.quantity,
    order.total_amount,
    paymentLabels[order.payment_method],
    paymentStatusLabels[order.payment_status],
    orderStatusLabels[order.order_status],
    order.customer_address,
    order.customer_city,
  ]);
}

const headers = ["N° commande", "Date", "Client", "Téléphone", "Produit", "Quantité", "Total (F)", "Paiement", "Statut paiement", "Statut commande", "Adresse", "Ville / quartier"];

export async function exportOrdersXlsx(orders: Order[]) {
  const XLSX = await import("xlsx");
  const rows = exportRows(orders);
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  headers.forEach((_, column) => {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: column })] as typeof worksheet[string] & { s?: { font?: { bold?: boolean } } };
    if (cell) cell.s = { font: { bold: true } };
  });
  worksheet["!cols"] = headers.map((header, column) => ({ wch: Math.min(42, Math.max(header.length + 2, ...rows.map((row) => String(row[column] ?? "").length + 2))) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Commandes");
  const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  download(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `king-of-caps-commandes-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportOrdersPdf(orders: Order[]) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const document = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const exportDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date());
  const revenue = totalExportRevenue(orders);

  autoTable(document, {
    head: [headers],
    body: exportRows(orders).map((row) => row.map((cell, index) => index === 6 ? formatDualPrice(Number(cell)) : String(cell))),
    startY: 31,
    margin: { top: 31, left: 8, right: 8, bottom: 12 },
    styles: { fontSize: 6.6, cellPadding: 1.5, overflow: "linebreak" },
    headStyles: { fillColor: [201, 162, 39], textColor: [0, 0, 0], fontStyle: "bold" },
    didDrawPage: () => {
      document.setFontSize(15);
      document.setTextColor(0, 0, 0);
      document.text("KING OF CAPS — Export des commandes", 8, 11);
      document.setFontSize(8);
      document.setTextColor(90, 90, 90);
      document.text(`Exporté le ${exportDate}`, 8, 17);
      document.text(`Total commandes : ${orders.length}   |   Revenu : ${formatDualPrice(revenue)}`, 8, 22);
      document.text(`Page ${document.getNumberOfPages()}`, 285, 205, { align: "right" });
    },
  });
  document.save(`king-of-caps-commandes-${new Date().toISOString().slice(0, 10)}.pdf`);
}
