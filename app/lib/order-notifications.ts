import { Resend } from "resend";
import type { Order } from "@/app/lib/orders";
import { formatDualPrice } from "@/app/lib/prices";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;",
  })[character] ?? character);
}

function getNotificationConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const notificationEmail = process.env.ORDER_NOTIFICATION_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !notificationEmail || !from) {
    throw new Error("La notification e-mail n’est pas configurée.");
  }

  return { apiKey, notificationEmail, from };
}

export async function notifyNewOrder(order: Order) {
  const { apiKey, notificationEmail, from } = getNotificationConfig();
  const customerName = `${order.customer_first_name} ${order.customer_last_name}`;
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [notificationEmail],
    subject: `Nouvelle commande ${order.order_number}`,
    text: [
      `Commande : ${order.order_number}`,
      `Client : ${customerName}`,
      `Téléphone : ${order.customer_phone}`,
      `Produit : ${order.product_name}`,
      `Quantité : ${order.quantity}`,
      `Total : ${formatDualPrice(order.total_amount)}`,
      `Paiement : ${order.payment_method}`,
    ].join("\n"),
    html: `<h1>Nouvelle commande ${escapeHtml(order.order_number)}</h1><p><strong>Client :</strong> ${escapeHtml(customerName)}</p><p><strong>Téléphone :</strong> ${escapeHtml(order.customer_phone)}</p><p><strong>Produit :</strong> ${escapeHtml(order.product_name)}</p><p><strong>Quantité :</strong> ${order.quantity}</p><p><strong>Total :</strong> ${escapeHtml(formatDualPrice(order.total_amount))}</p><p><strong>Paiement :</strong> ${escapeHtml(order.payment_method)}</p>`,
  });

  if (error) throw new Error(error.message);
}
