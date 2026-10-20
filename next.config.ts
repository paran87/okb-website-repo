import type { NextConfig } from "next";
import studyStorage from "./lib/config/study-storage.json";

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
    // camera=(self): the flood report page (/report-flood) takes photos. It must be allowed on every page, because
    // opening it from a Command Center link keeps the document (and its policy) of the page it came from.
    value: "camera=(self), microphone=(), geolocation=(self)",
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
  "weather",
  "reports",
  "analytics",
  "operations",
  "settings",
] as const;

/**
 * River basin study PDFs are stored in Cloudflare R2 (lib/config/study-storage.json).
 * The viewer reads them from this same origin and Vercel forwards (and edge-caches)
 * the bytes, so no CORS preflight is involved. Empty until the PDFs are uploaded.
 */
const studyOrigin = studyStorage.origin || null;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "pino", "pino-pretty"],
  // Admin → Setup shows this SQL (read at runtime by app/api/admin/setup).
  outputFileTracingIncludes: {
    "/api/admin/setup": ["./supabase/migrations/20261014000000_okb_site_admin.sql", "./supabase/migrations/20261016000000_okb_gallery_engagement.sql"],
    // The public flood map places WhatsApp / Viber report locations on the road network (features/incident/server/roads.ts).
    "/api/flood-reports": ["./public/data/road-network/roads.geojson"],
    // Sending or editing a mobile report traces its flooded stretch along the road network (features/flood-report/server/stretch.ts).
    "/api/flood-reports/*": ["./public/data/road-network/roads.geojson"],
    "/api/admin/mobile-reports/*": ["./public/data/road-network/roads.geojson"],
    // The report form suggests the DEO of the nearest national road.
    "/api/flood-reports/geocode": ["./public/data/road-network/roads.geojson"],
  },
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
        // The Equipment tab was removed.
        source: "/equipment",
        destination: "/command",
        permanent: false,
      },
      {
        source: "/command/equipment",
        destination: "/command",
        permanent: false,
      },
      {
        // The Users tab was replaced by Operations.
        source: "/command/users",
        destination: "/command/operations",
        permanent: false,
      },
      {
        source: "/users",
        destination: "/command/operations",
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
    if (studyOrigin) {
      rewrites.push({
        source: "/studies/chunks/:id/:file",
        destination: `${studyOrigin}/river-basin-studies/chunks/:id/:file`,
      });
      rewrites.push({
        source: "/studies/:file",
        destination: `${studyOrigin}/river-basin-studies/:file`,
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
        source: "/studies/:path*",
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
