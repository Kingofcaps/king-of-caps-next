export type BoutiqueSale = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  payment_method: "Non précisé";
  sold_at: string;
  source_stock_movement_id: string;
  created_at: string;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase n’est pas configuré. Ajoutez SUPABASE_SERVICE_ROLE_KEY côté serveur.");
  }

  return { url, serviceRoleKey };
}

export async function listBoutiqueSales() {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(
    `${url}/rest/v1/boutique_sales?select=*&order=sold_at.desc`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase a refusé la requête de ventes boutique (${response.status}).`);
  }

  return (await response.json()) as BoutiqueSale[];
}

