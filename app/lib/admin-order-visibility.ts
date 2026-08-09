import type { Order } from "./orders";

type OrderPaymentState = Pick<Order, "payment_method" | "payment_status">;

export function isUnconfirmedPayDunyaOrder(order: OrderPaymentState) {
  return order.payment_method !== "cash_on_delivery" && order.payment_status !== "paid";
}

export function isMainAdminOrder(order: OrderPaymentState) {
  return !isUnconfirmedPayDunyaOrder(order);
}
