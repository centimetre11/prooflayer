import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright", "@prisma/client", "prisma", "pg"],
};

export default nextConfig;
