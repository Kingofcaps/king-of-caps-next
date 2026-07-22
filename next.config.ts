import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const localNetworkOrigins = Object.values(networkInterfaces()).flatMap((addresses) =>
  (addresses ?? [])
    .filter((address) => address.family === "IPv4" && !address.internal)
    .map((address) => address.address),
);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const productImageRemotePatterns = supabaseUrl
  ? [{
      protocol: "https" as const,
      hostname: new URL(supabaseUrl).hostname,
      port: "",
      pathname: "/storage/v1/object/public/**",
      search: "",
    }]
  : [];

const nextConfig: NextConfig = {
  allowedDevOrigins: [...new Set([
    "127.0.0.1",
    "admin.kingofcaps.bj",
    ...localNetworkOrigins,
  ])],
  images: { remotePatterns: productImageRemotePatterns },
};

export default nextConfig;
