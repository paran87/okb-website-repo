import type { NextConfig } from "next";
import blobManifest from "./lib/config/river-basin-blob.json";

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
  "flood-prone",
  "drainages",
  "roads",
  "river-basin",
  "waterways",
  "pumping-stations",
  "equipment",
  "weather",
  "reports",
  "analytics",
  "users",
  "settings",
] as const;

/**
 * River basin studies live in Vercel Blob. Blob rejects the CORS preflight a
 * browser sends for `Range` requests, so the viewer reads them from this same
 * origin and Vercel forwards (and edge-caches) the bytes.
 */
const studyBlobOrigin = (() => {
  const first = Object.values(blobManifest as Record<string, string>)[0];
  return first ? new URL(first).origin : null;
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "pino", "pino-pretty"],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "maplibre-gl",
    ],
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
        destination: "/",
        permanent: true,
      },
      {
        source: "/dredger-status",
        destination: "/",
        permanent: false,
      },
      {
        source: "/dredger-status/:path*",
        destination: "/",
        permanent: false,
      },
      {
        source: "/operations",
        destination: "/command/pumping-stations",
        permanent: false,
      },
      {
        source: "/command/operations",
        destination: "/command/pumping-stations",
        permanent: false,
      },
      ...legacyCommandPaths.map((path) => ({
        source: `/${path}`,
        destination: path === "dashboard" ? "/command" : `/command/${path}`,
        permanent: false,
      })),
    ];
  },
  async rewrites() {
    const rewrites = [];
    if (studyBlobOrigin) {
      rewrites.push({
        source: "/studies/:file",
        destination: `${studyBlobOrigin}/river-basin-studies/:file`,
      });
    }
    return rewrites;
  },
  async headers() {
    return [
      {
        source: "/waterway-tiles/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/studies/:file",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
