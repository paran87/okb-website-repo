import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { VisitTracker } from "@/components/analytics/visit-tracker";
import { AppProviders } from "@/providers/app-providers";
import { DARK_ON_NEW_VISIT_SCRIPT } from "@/providers/theme-config";
import { APP } from "@/lib/constants";
import "@/styles/globals.css";
import "@/styles/okb-folio.css";
import "@/styles/okb-home.css";

/*
 * Barlow Condensed and Source Sans 3 (Latin), the same files Google Fonts serves, kept in the repo so the
 * build does not download fonts (next/font/google failed on Vercel inside Turbopack).
 */
const okbDisplay = localFont({
  src: [
    { path: "./fonts/barlow-condensed-600-latin.woff2", weight: "600", style: "normal" },
    { path: "./fonts/barlow-condensed-700-latin.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-okb-display",
  display: "swap",
});

const okbSans = localFont({
  src: "./fonts/source-sans-3-latin.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--font-okb-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${APP.program} — ${APP.organizationShort}`,
    template: `%s · ${APP.program}`,
  },
  description:
    "Official DPWH Oplan Kontra Baha website — flood-control program information and OKB Command Center access.",
  applicationName: APP.program,
  icons: {
    icon: "/brand/oplan-kontra-baha-logo.png",
    apple: "/brand/oplan-kontra-baha-logo.png",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0038a8" },
    { media: "(prefers-color-scheme: dark)", color: "#0038a8" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${okbDisplay.variable} ${okbSans.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: DARK_ON_NEW_VISIT_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <AppProviders>{children}</AppProviders>
        <VisitTracker />
      </body>
    </html>
  );
}

