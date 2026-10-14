import { notifyNewOrder, sendCustomerOrderConfirmation } from "@/app/lib/order-notifications";
import {
  approvePayDunyaOrder,
  claimOrderNotifications,
  failPayDunyaOrder,
  getOrder,
  getOrderByPayDunyaToken,
} from "@/app/lib/orders";
import { safePayDunyaErrorName, verifyPayDunyaPayment } from "@/app/lib/paydunya";
import { processPayDunyaPayment } from "@/app/lib/payment-workflows";

export async function processPayDunyaOrder(token: string) {
  return processPayDunyaPayment(token, {
    verifyPayment: async (invoiceToken) => {
      const [payment, order] = await Promise.all([
        verifyPayDunyaPayment(invoiceToken),
        getOrderByPayDunyaToken(invoiceToken),
      ]);
      if (!order) throw new Error("Commande PayDunya introuvable.");
      if (payment.totalAmount !== order.payment_total_amount || payment.orderNumber !== order.order_number || payment.currency !== order.payment_currency || order.payment_currency !== "XOF") {
        throw new Error("La facture PayDunya ne correspond pas à la commande.");
      }
      return { status: payment.status };
    },
    approveOrder: approvePayDunyaOrder,
    failOrder: failPayDunyaOrder,
    claimNotifications: async (order) => Boolean(await claimOrderNotifications(order.id)),
    sendNotifications: async (order) => {
      const orderWithItems = await getOrder(order.id) ?? order;
      const results = await Promise.allSettled([
        notifyNewOrder(orderWithItems),
        sendCustomerOrderConfirmation(orderWithItems),
      ]);
      if (results[0].status === "rejected") {
        console.error("Échec de notification administrateur après paiement", {
          phase: "post_payment_notification",
          recipient: "admin",
          errorType: safePayDunyaErrorName(results[0].reason),
        });
      }
      if (results[1].status === "rejected") {
        console.error("Échec de confirmation client après paiement", {
          phase: "post_payment_notification",
          recipient: "customer",
          errorType: safePayDunyaErrorName(results[1].reason),
        });
      }
    },
  });
}
