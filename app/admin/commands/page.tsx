import AdminDashboard from "../AdminDashboard";

export const dynamic = "force-dynamic";

export default function AdminCommandsPage() {
  return <AdminDashboard initialProducts={[]} view="orders" />;
}
