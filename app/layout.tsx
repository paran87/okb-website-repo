import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Source_Sans_3 } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import { APP } from "@/lib/constants";
import "@/styles/globals.css";
import "@/styles/okb-folio.css";

const okbDisplay = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-okb-display",
  display: "swap",
});

const okbSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      <body className="min-h-screen antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

