import { notifyNewOrder, sendCustomerOrderConfirmation } from "@/app/lib/order-notifications";
import {
  approvePayDunyaOrder,
  claimOrderNotifications,
  failPayDunyaOrder,
  getOrder,
  getOrderByPayDunyaToken,
} from "@/app/lib/orders";
import { verifyPayDunyaPayment } from "@/app/lib/paydunya";
import { processPayDunyaPayment } from "@/app/lib/payment-workflows";

export async function processPayDunyaOrder(token: string) {
  return processPayDunyaPayment(token, {
    verifyPayment: async (invoiceToken) => {
      const [payment, order] = await Promise.all([
        verifyPayDunyaPayment(invoiceToken),
        getOrderByPayDunyaToken(invoiceToken),
      ]);
      if (!order) throw new Error("Commande PayDunya introuvable.");
      if (payment.totalAmount !== order.total_amount || payment.orderNumber !== order.order_number || payment.currency !== "XOF") {
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
        console.error(`Échec de la notification administrateur pour la commande ${order.order_number}.`, results[0].reason);
      }
      if (results[1].status === "rejected") {
        console.error(`Échec de la confirmation client pour la commande ${order.order_number}.`, results[1].reason);
      }
    },
  });
}
