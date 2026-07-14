import AdminDashboard from "../AdminDashboard";

export const dynamic = "force-dynamic";

export default function AdminOrdersPage() {
  return <AdminDashboard initialProducts={[]} view="orders" />;
}
