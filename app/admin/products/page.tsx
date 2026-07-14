import { getProducts } from "@/app/lib/products";
import AdminDashboard from "../AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  return <AdminDashboard initialProducts={await getProducts()} view="products" />;
}
