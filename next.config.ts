import type { NextConfig } from "next";

/**
 * Next.js configuration for the OKB Command Center.
 *
 * Security headers are applied globally. Image optimization is enabled for
 * future remote tile/asset providers. `serverExternalPackages` keeps native
 * server-only libraries (Prisma, pino) out of the client bundle.
 */
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
];

const legacyCommandPaths = [
  "dashboard",
  "flood-monitoring",
  "incidents",
  "critical-areas",
  "flood-prone",
  "drainages",
  "roads",
  "waterways",
  "projects",
  "equipment",
  "weather",
  "reports",
  "analytics",
  "users",
  "settings",
] as const;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "pino", "pino-pretty"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion", "maplibre-gl"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.basemaps.cartocdn.com" },
      { protocol: "https", hostname: "tile.openstreetmap.org" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/activity",
        destination: "/dredger-status",
        permanent: true,
      },
      ...legacyCommandPaths.map((path) => ({
        source: `/${path}`,
        destination: path === "dashboard" ? "/command" : `/command/${path}`,
        permanent: false,
      })),
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
