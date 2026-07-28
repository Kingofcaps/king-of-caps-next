import type { Order } from "@/app/lib/orders";
import type { ShopSale } from "@/app/lib/shop-sales";

export function isRevenueOrder(order: Order) {
  return order.order_status !== "cancelled"
    && (order.payment_status === "paid"
      || (order.payment_method === "cash_on_delivery" && order.order_status === "delivered"));
}

export function occurredInRange(value: string, start: Date | null, end: Date | null = null) {
  const date = new Date(value);
  return (!start || date >= start) && (!end || date < end);
}

export function xofRevenue(
  orders: Order[],
  shopSales: ShopSale[],
  start: Date | null = null,
  end: Date | null = null,
) {
  const onlineRevenue = orders
    .filter(isRevenueOrder)
    .filter((order) => order.payment_currency === "XOF" && occurredInRange(order.created_at, start, end))
    .reduce((total, order) => total + order.payment_total_amount, 0);
  const shopRevenue = shopSales
    .filter((sale) => occurredInRange(sale.sold_at, start, end))
    .reduce((total, sale) => total + sale.total_price, 0);
  return onlineRevenue + shopRevenue;
}

export function totalSalesCount(orders: Order[], shopSales: ShopSale[]) {
  return orders.filter(isRevenueOrder).length + shopSales.length;
}
