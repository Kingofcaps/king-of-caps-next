import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminToken } from "@/app/lib/admin-auth";
import AdminLogin from "./AdminLogin";
import AdminShell from "./AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!isAuthenticated) return <AdminLogin />;

  return <AdminShell>{children}</AdminShell>;
}
