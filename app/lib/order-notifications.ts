import { Resend } from "resend";
import type { Order } from "@/app/lib/orders";
import { formatDualPrice } from "@/app/lib/prices";
import { isValidEmail } from "@/app/lib/validation";

const CUSTOMER_EMAIL_FROM = "KING OF CAPS <commandes@kingofcaps.bj>";
const STOREFRONT_URL = "https://www.kingofcaps.bj";
const WHATSAPP_URL = "https://wa.me/22950687515";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;",
  })[character] ?? character);
}

function getResendApiKey() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("La clé Resend n’est pas configurée.");
  }

  return apiKey;
}

function getNotificationConfig() {
  const apiKey = getResendApiKey();
  const notificationEmail = process.env.ORDER_NOTIFICATION_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!notificationEmail || !from) {
    throw new Error("La notification e-mail n’est pas configurée.");
  }

  return { apiKey, notificationEmail, from };
}

function orderItemLines(order: Order) {
  if (!order.order_items?.length) {
    return [`${order.product_name} × ${order.quantity} — ${formatDualPrice(order.total_amount)}`];
  }
  return order.order_items.map((item) => `${item.product_name} × ${item.quantity} — ${formatDualPrice(item.line_total)}`);
}

function orderItemsHtml(order: Order) {
  return orderItemLines(order).map((line) => `<li>${escapeHtml(line)}</li>`).join("");
}

export async function notifyNewOrder(order: Order) {
  const { apiKey, notificationEmail, from } = getNotificationConfig();
  const customerName = `${order.customer_first_name} ${order.customer_last_name}`;
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send(
    {
      from,
      to: [notificationEmail],
      subject: `Nouvelle commande ${order.order_number}`,
      text: [
        `Commande : ${order.order_number}`,
        `Client : ${customerName}`,
        `Téléphone : ${order.customer_phone}`,
        "Articles :",
        ...orderItemLines(order).map((line) => `- ${line}`),
        `Total : ${formatDualPrice(order.total_amount)}`,
        `Paiement : ${order.payment_method}`,
      ].join("\n"),
      html: `<h1>Nouvelle commande ${escapeHtml(order.order_number)}</h1><p><strong>Client :</strong> ${escapeHtml(customerName)}</p><p><strong>Téléphone :</strong> ${escapeHtml(order.customer_phone)}</p><p><strong>Articles :</strong></p><ul>${orderItemsHtml(order)}</ul><p><strong>Total :</strong> ${escapeHtml(formatDualPrice(order.total_amount))}</p><p><strong>Paiement :</strong> ${escapeHtml(order.payment_method)}</p>`,
    },
    { idempotencyKey: `admin-order-${order.id}` },
  );

  if (error) throw new Error(error.message);
}

function paymentMethodLabel(method: Order["payment_method"]) {
  if (method === "cash_on_delivery") return "Paiement à la livraison";
  if (method === "mobile_money") return "Mobile Money";
  return "Carte bancaire";
}

function paymentStatusLabel(status: Order["payment_status"]) {
  if (status === "paid") return "Payé";
  if (status === "failed") return "Échec";
  return "En attente";
}

function customerEmailText(order: Order) {
  const customerName = order.customer_first_name.trim() || order.customer_last_name.trim();
  return [
    `Bonjour ${customerName},`,
    "",
    "Merci pour votre commande chez KING OF CAPS.",
    `Numéro de commande : ${order.order_number}`,
    "Articles :",
    ...orderItemLines(order).map((line) => `- ${line}`),
    `Total : ${formatDualPrice(order.total_amount)}`,
    `Mode de paiement : ${paymentMethodLabel(order.payment_method)}`,
    `Statut du paiement : ${paymentStatusLabel(order.payment_status)}`,
    `Adresse de livraison : ${order.customer_address}`,
    `Ville ou arrondissement : ${order.customer_city}`,
    `Téléphone : ${order.customer_phone}`,
    "",
    "Notre équipe vous contactera rapidement afin de confirmer la livraison.",
    `Voir KING OF CAPS : ${STOREFRONT_URL}`,
    `WhatsApp : ${WHATSAPP_URL}`,
    "",
    "Plus qu’une casquette, une identité.",
  ].join("\n");
}

function customerEmailHtml(order: Order) {
  const customerName = escapeHtml(order.customer_first_name.trim() || order.customer_last_name.trim());
  const orderNumber = escapeHtml(order.order_number);
  const total = escapeHtml(formatDualPrice(order.total_amount));
  const paymentMethod = escapeHtml(paymentMethodLabel(order.payment_method));
  const paymentStatus = escapeHtml(paymentStatusLabel(order.payment_status));
  const address = escapeHtml(order.customer_address);
  const city = escapeHtml(order.customer_city);
  const phone = escapeHtml(order.customer_phone);

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      @media only screen and (max-width: 620px) {
        .email-shell { padding: 18px 10px !important; }
        .email-card { border-radius: 16px !important; }
        .email-padding { padding-left: 22px !important; padding-right: 22px !important; }
        .email-title { font-size: 25px !important; line-height: 32px !important; }
        .detail-label, .detail-value { display: block !important; width: 100% !important; text-align: left !important; }
        .detail-value { padding-top: 5px !important; }
      }
    </style>
  </head>
  <body style="margin:0;background:#f5f5f3;color:#171717;font-family:Arial,Helvetica,sans-serif;">
    <div class="email-shell" style="padding:36px 14px;background:#f5f5f3;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr><td align="center">
          <table class="email-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #e8e4d9;border-radius:24px;overflow:hidden;">
            <tr><td class="email-padding" style="padding:28px 34px;background:#090909;text-align:center;">
              <div style="font-size:12px;font-weight:700;letter-spacing:4px;color:#d4af37;">KING OF CAPS</div>
              <div style="margin-top:8px;font-size:12px;color:#d4d4d4;">Cotonou, Bénin</div>
            </td></tr>
            <tr><td class="email-padding" style="padding:34px 38px 16px;">
              <div style="font-size:13px;font-weight:700;letter-spacing:2px;color:#b08a1f;">COMMANDE CONFIRMÉE</div>
              <h1 class="email-title" style="margin:12px 0 0;font-size:30px;line-height:38px;color:#090909;">Bonjour ${customerName},</h1>
              <p style="margin:16px 0 0;font-size:16px;line-height:25px;color:#525252;">Merci pour votre commande chez <strong style="color:#090909;">KING OF CAPS</strong>.</p>
            </td></tr>
            <tr><td class="email-padding" style="padding:18px 38px;">
              <div style="padding:18px 20px;border-radius:14px;background:#f8f6ef;border:1px solid #ece4c9;">
                <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#8c711f;">NUMÉRO DE COMMANDE</div>
                <div style="margin-top:7px;font-size:21px;font-weight:800;color:#090909;">${orderNumber}</div>
              </div>
            </td></tr>
            <tr><td class="email-padding" style="padding:8px 38px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                ${emailDetailRow("Articles", `<ul style="margin:0;padding-left:18px;">${orderItemsHtml(order)}</ul>`)}
                ${emailDetailRow("Total", total, true)}
                ${emailDetailRow("Mode de paiement", paymentMethod)}
                ${emailDetailRow("Statut du paiement", paymentStatus)}
                ${emailDetailRow("Adresse de livraison", address)}
                ${emailDetailRow("Ville ou arrondissement", city)}
                ${emailDetailRow("Numéro de téléphone", phone)}
              </table>
            </td></tr>
            <tr><td class="email-padding" style="padding:10px 38px 30px;">
              <p style="margin:0;font-size:15px;line-height:24px;color:#525252;">Notre équipe vous contactera rapidement afin de confirmer la livraison.</p>
              <div style="padding-top:24px;text-align:center;">
                <a href="${STOREFRONT_URL}" style="display:inline-block;padding:14px 25px;border-radius:10px;background:#090909;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;">Voir KING OF CAPS</a>
              </div>
            </td></tr>
            <tr><td class="email-padding" style="padding:24px 38px;background:#090909;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:21px;color:#d4d4d4;">Besoin d’aide ? <a href="${WHATSAPP_URL}" style="color:#d4af37;text-decoration:none;font-weight:700;">WhatsApp : +229 50 68 75 15</a></p>
              <p style="margin:13px 0 0;font-size:14px;font-weight:700;color:#ffffff;">Plus qu’une casquette, une identité.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </div>
  </body>
</html>`;
}

function emailDetailRow(label: string, value: string, highlighted = false) {
  return `<tr>
    <td class="detail-label" style="padding:13px 8px;border-bottom:1px solid #ececec;font-size:13px;color:#737373;">${escapeHtml(label)}</td>
    <td class="detail-value" style="padding:13px 8px;border-bottom:1px solid #ececec;text-align:right;font-size:${highlighted ? "16px" : "13px"};font-weight:${highlighted ? "800" : "700"};color:${highlighted ? "#b08a1f" : "#171717"};">${value}</td>
  </tr>`;
}

export async function sendCustomerOrderConfirmation(order: Order) {
  const customerEmail = order.customer_email?.trim().toLowerCase() ?? "";
  if (!isValidEmail(customerEmail)) {
    throw new Error("L’adresse e-mail client est invalide.");
  }

  const resend = new Resend(getResendApiKey());
  const { error } = await resend.emails.send(
    {
      from: CUSTOMER_EMAIL_FROM,
      to: [customerEmail],
      subject: `Confirmation de votre commande KING OF CAPS — ${order.order_number}`,
      text: customerEmailText(order),
      html: customerEmailHtml(order),
    },
    { idempotencyKey: `customer-order-${order.id}` },
  );

  if (error) throw new Error(error.message);
}
