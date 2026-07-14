export type PaymentMethod = "cash_on_delivery" | "mobile_money" | "card";
export type PaymentStatus = "pending" | "paid" | "failed";
export type OrderStatus = "new" | "confirmed" | "preparing" | "delivered" | "cancelled";

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
    throw new Error(`Supabase a refusé la requête (${response.status}).`);
  }

  return response;
}

export function parsePrice(price: string) {
  const amount = Number(price.replace(/[^\d]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function formatPrice(amount: number) {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} F`;
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
