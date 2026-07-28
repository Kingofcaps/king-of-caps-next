export const stockMovementTypes = [
  "creation",
  "increase",
  "decrease",
  "restock",
  "product_edit",
  "order_deduction",
  "order_cancellation",
  "shop_sale",
] as const;

export type StockMovementType = (typeof stockMovementTypes)[number];

export type StockMovement = {
  id: string;
  product_id: string;
  product_name: string;
  movement_type: StockMovementType;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  note: string | null;
  migrated_to_boutique_sale_at: string | null;
  created_at: string;
};

type NewStockMovement = {
  productId: string;
  productName: string;
  movementType: StockMovementType;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  note?: string;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase n’est pas configuré. Ajoutez SUPABASE_SERVICE_ROLE_KEY côté serveur.");
  }

  return { url, serviceRoleKey };
}

async function stockMovementsRequest(path: string, init: RequestInit = {}) {
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
    throw new Error(`Supabase a refusé la requête d’historique du stock (${response.status}).`);
  }

  return response;
}

export async function recordStockMovement(movement: NewStockMovement) {
  await stockMovementsRequest("stock_movements", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      product_id: movement.productId,
      product_name: movement.productName,
      movement_type: movement.movementType,
      quantity_change: movement.quantityChange,
      previous_quantity: movement.previousQuantity,
      new_quantity: movement.newQuantity,
      note: movement.note?.trim() || null,
    }),
  });
}

export async function recordStockMovementSafely(movement: NewStockMovement) {
  try {
    await recordStockMovement(movement);
  } catch (error) {
    console.error("Impossible d’enregistrer le mouvement de stock :", error);
  }
}

export async function listStockMovements() {
  const response = await stockMovementsRequest(
    "stock_movements?select=*&order=created_at.desc&limit=1000",
  );
  return (await response.json()) as StockMovement[];
}
