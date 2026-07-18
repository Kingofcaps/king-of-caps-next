export type PaymentMethod = "cash_on_delivery" | "mobile_money" | "card";
export type PaymentStatus = "pending" | "paid" | "failed";
export type OrderStatus = "new" | "pending" | "awaiting_payment" | "confirmed" | "preparing" | "delivered" | "cancelled";

export type Order = {
  id: string;
  order_number: string;
  product_id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string;
  customer_city: string;
  customer_note: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  fedapay_transaction_id: string | null;
  stock_reserved_at: string | null;
  notifications_sent_at: string | null;
  created_at: string;
};

type NewOrder = Omit<Order, "id" | "created_at">;

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase n’est pas configuré. Ajoutez SUPABASE_SERVICE_ROLE_KEY côté serveur.");
  }

  return { url, serviceRoleKey };
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const rawError = await response.text();
    let errorDetails: {
      code?: string;
      message?: string;
      details?: string | null;
      hint?: string | null;
    } = {};

    try {
      errorDetails = JSON.parse(rawError) as typeof errorDetails;
    } catch {
      errorDetails = { message: rawError };
    }

    console.error("Supabase a refusé une requête orders :", {
      status: response.status,
      code: errorDetails.code ?? null,
      message: errorDetails.message ?? null,
      details: errorDetails.details ?? null,
      hint: errorDetails.hint ?? null,
    });

    throw new Error(`Supabase a refusé la requête (${response.status}).`);
  }

  return response;
}

export async function createOrderNumber() {
  const response = await supabaseRequest("rpc/next_order_number", {
    method: "POST",
    body: JSON.stringify({}),
  });
  const orderNumber = await response.json();

  if (typeof orderNumber !== "string" || !orderNumber) {
    throw new Error("Impossible de générer le numéro de commande.");
  }

  return orderNumber;
}

export async function createOrder(order: NewOrder) {
  const response = await supabaseRequest("orders", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(order),
  });
  const [createdOrder] = (await response.json()) as Order[];
  return createdOrder;
}

export async function listOrders() {
  const response = await supabaseRequest("orders?select=*&order=created_at.desc");
  return (await response.json()) as Order[];
}

export async function getOrderByNumber(orderNumber: string) {
  const response = await supabaseRequest(`orders?order_number=eq.${encodeURIComponent(orderNumber)}&select=*&limit=1`);
  const [order] = (await response.json()) as Order[];
  return order ?? null;
}

export async function getOrder(id: string) {
  const response = await supabaseRequest(`orders?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
  const [order] = (await response.json()) as Order[];
  return order ?? null;
}

export async function deleteOrder(id: string) {
  const existingOrder = await getOrder(id);
  if (!existingOrder) return null;

  await supabaseRequest(`orders?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  return existingOrder;
}

export async function updateOrder(id: string, updates: Partial<Pick<Order, "payment_status" | "order_status">>) {
  const response = await supabaseRequest(`orders?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(updates),
  });
  const [order] = (await response.json()) as Order[];
  return order;
}

export async function updateOrderUnlessCancelled(id: string, orderStatus: OrderStatus) {
  const response = await supabaseRequest(`orders?id=eq.${encodeURIComponent(id)}&order_status=neq.cancelled`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ order_status: orderStatus }),
  });
  const [order] = (await response.json()) as Order[];
  return order ?? null;
}

export async function updateOrderByNumber(orderNumber: string, updates: Partial<Pick<Order, "payment_status" | "order_status">>) {
  const response = await supabaseRequest(`orders?order_number=eq.${encodeURIComponent(orderNumber)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(updates),
  });
  const [order] = (await response.json()) as Order[];
  return order;
}

type FedaPayTransition = {
  processed: boolean;
  order: Order;
};

export async function approveFedaPayOrder(transactionId: string, eventId: string) {
  const response = await supabaseRequest("rpc/approve_fedapay_order", {
    method: "POST",
    body: JSON.stringify({ p_transaction_id: transactionId, p_event_id: eventId }),
  });
  return (await response.json()) as FedaPayTransition;
}

export async function failFedaPayOrder(transactionId: string, eventId: string, eventName: "transaction.declined" | "transaction.canceled") {
  const response = await supabaseRequest("rpc/fail_fedapay_order", {
    method: "POST",
    body: JSON.stringify({
      p_transaction_id: transactionId,
      p_event_id: eventId,
      p_event_name: eventName,
    }),
  });
  return (await response.json()) as FedaPayTransition;
}

export async function markOrderNotificationsSent(id: string) {
  const response = await supabaseRequest(`orders?id=eq.${encodeURIComponent(id)}&notifications_sent_at=is.null`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ notifications_sent_at: new Date().toISOString() }),
  });
  const [order] = (await response.json()) as Order[];
  return order ?? null;
}

export async function markOrderStockReserved(id: string) {
  const response = await supabaseRequest(`orders?id=eq.${encodeURIComponent(id)}&stock_reserved_at=is.null`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ stock_reserved_at: new Date().toISOString() }),
  });
  const [order] = (await response.json()) as Order[];
  return order ?? null;
}
