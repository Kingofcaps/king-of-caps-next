import { getProducts, type Product } from "@/app/lib/products";
import { listStockMovements, type StockMovement } from "@/app/lib/stock-movements";
import StockHistory from "./StockHistory";

export const dynamic = "force-dynamic";

export default async function StockHistoryPage() {
  let movements: StockMovement[] = [];
  let products: Product[] = [];
  let loadError = "";

  try {
    [movements, products] = await Promise.all([
      listStockMovements(),
      getProducts(),
    ]);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Impossible de charger l’historique du stock.";
  }

  return <StockHistory initialMovements={movements} products={products} loadError={loadError} />;
}
