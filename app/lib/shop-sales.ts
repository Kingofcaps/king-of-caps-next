import { productRecordToProduct, type Product, type ProductRecord } from "@/app/lib/products";
import type { ShopPaymentMethod, ShopSaleDraft } from "@/app/lib/shop-sale-workflow";

export type ShopSale = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  payment_method: ShopPaymentMethod | "Non précisé";
  sold_at: string;
  source_movement_id: string;
  request_id: string | null;
  created_at: string;
};

export type RecordShopSaleResult = {
  created: boolean;
  sale: ShopSale;
  product: Product;
};

type RpcShopSaleResult = Omit<RecordShopSaleResult, "product"> & {
  product: ProductRecord;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase n’est pas configuré. Ajoutez SUPABASE_SERVICE_ROLE_KEY côté serveur.");
  }

  return { url, serviceRoleKey };
}

async function shopSalesRequest(path: string, init: RequestInit = {}) {
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
    let message = `Supabase a refusé la requête de vente boutique (${response.status}).`;
    try {
      const payload = JSON.parse(rawError) as { message?: string };
      if (payload.message) message = payload.message;
    } catch {
      // La réponse non JSON n'apporte pas de message exploitable.
    }
    throw new Error(message);
  }

  return response;
}

export async function listShopSales() {
  const response = await shopSalesRequest("shop_sales?select=*&order=sold_at.desc");
  return (await response.json()) as ShopSale[];
}

export async function recordShopSale(draft: ShopSaleDraft) {
  const response = await shopSalesRequest("rpc/record_shop_sale", {
    method: "POST",
    body: JSON.stringify({
      p_product_id: draft.productId,
      p_quantity: draft.quantity,
      p_unit_price: draft.unitPrice,
      p_payment_method: draft.paymentMethod,
      p_request_id: draft.requestId,
    }),
  });
  const result = (await response.json()) as RpcShopSaleResult;
  return { ...result, product: productRecordToProduct(result.product) };
}
