import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

// Premium type system:
//   Body / UI  -> Geist (Vercel's clean, modern sans)
//   Display    -> Bricolage Grotesque (characterful, editorial, premium)
//   Mono       -> Geist Mono (labels)
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://arrowlabs.art"),
  title: {
    default: "ArrowLabs - Automate your whole store's creative with AI",
    template: "%s · ArrowLabs",
  },
  description:
    "ArrowLabs is the AI creative operating system for commerce. From a single Amazon ASIN, a team of AI agents automates optimized listings, ranked ad angles, product photography, and UGC video. Set it and forget it, with a human on the loop.",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  keywords: [
    "AI Amazon listing",
    "A+ content generator",
    "AI ad creative",
    "AI product photography",
    "UGC video ads",
    "D2C creative suite",
    "ArrowLabs",
  ],
  authors: [{ name: "ArrowLabs" }],
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "ArrowLabs - Automate your whole store. Then let it sell.",
    description:
      "A team of AI agents automates your listings, ads, product photography, and UGC video. Set it and forget it, with a human on the loop.",
    siteName: "ArrowLabs",
    type: "website",
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "ArrowLabs" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ArrowLabs - Automate your whole store. Then let it sell.",
    description:
      "A team of AI agents automates your listings, ads, product photography, and UGC video. Set it and forget it, with a human on the loop.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${bricolage.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
