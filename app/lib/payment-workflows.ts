export type OnlinePaymentMethod = "mobile_money" | "card";
export type VerifiedPaymentStatus = "pending" | "completed" | "cancelled" | "failed";

export function isOnlinePaymentMethod(value: string): value is OnlinePaymentMethod {
  return value === "mobile_money" || value === "card";
}

type CheckoutServices<Order> = {
  createCashOnDeliveryOrder: () => Promise<Order>;
  reserveCashOnDeliveryStock: (order: Order) => Promise<void>;
  notifyCashOnDelivery: (order: Order) => Promise<void>;
  createOnlineInvoice: (paymentMethod: OnlinePaymentMethod) => Promise<{ token: string; url: string }>;
  createAwaitingPaymentOrder: (token: string) => Promise<Order>;
  reserveOnlineStock: (order: Order) => Promise<void>;
};

export async function startOrderPayment<Order>(
  paymentMethod: "cash_on_delivery" | OnlinePaymentMethod,
  services: CheckoutServices<Order>,
) {
  if (paymentMethod === "cash_on_delivery") {
    const order = await services.createCashOnDeliveryOrder();
    await services.reserveCashOnDeliveryStock(order);
    await services.notifyCashOnDelivery(order);
    return { kind: "cash_on_delivery" as const, order };
  }

  const invoice = await services.createOnlineInvoice(paymentMethod);
  const order = await services.createAwaitingPaymentOrder(invoice.token);
  await services.reserveOnlineStock(order);
  return { kind: "online" as const, order, checkoutUrl: invoice.url };
}

type PaymentTransition<Order> = {
  processed: boolean;
  order: Order;
};

type ConfirmationServices<Order> = {
  verifyPayment: (token: string) => Promise<{ status: VerifiedPaymentStatus }>;
  approveOrder: (token: string) => Promise<PaymentTransition<Order>>;
  failOrder: (token: string, status: "cancelled" | "failed") => Promise<PaymentTransition<Order>>;
  claimNotifications: (order: Order) => Promise<boolean>;
  sendNotifications: (order: Order) => Promise<void>;
};

export async function processPayDunyaPayment<Order>(
  token: string,
  services: ConfirmationServices<Order>,
) {
  const payment = await services.verifyPayment(token);

  if (payment.status === "completed") {
    const transition = await services.approveOrder(token);
    if (transition.processed && await services.claimNotifications(transition.order)) {
      await services.sendNotifications(transition.order);
    }
    return { status: "completed" as const, order: transition.order };
  }

  if (payment.status === "cancelled" || payment.status === "failed") {
    const transition = await services.failOrder(token, payment.status);
    return { status: payment.status, order: transition.order };
  }

  return { status: "pending" as const, order: null };
}
