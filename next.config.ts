import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const localNetworkOrigins = Object.values(networkInterfaces()).flatMap((addresses) =>
  (addresses ?? [])
    .filter((address) => address.family === "IPv4" && !address.internal)
    .map((address) => address.address),
);

const nextConfig: NextConfig = {
  allowedDevOrigins: [...new Set([
    "127.0.0.1",
    "admin.kingofcaps.bj",
    ...localNetworkOrigins,
  ])],
};

export default nextConfig;
