import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Moodr",
    template: "%s | Moodr",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
  description: "Moodboard meets Tinder",
  openGraph: {
    title: "Moodr",
    description: "Moodboard meets Tinder",
    url: "https://moodr.app",
    siteName: "Moodr",
    images: [
      {
        url: "https://moodr.app/og.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Moodr",
    description: "Moodboard meets Tinder",
    creator: "@dinehq",
    images: ["https://moodr.app/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-gray-100 antialiased">
          <Header />
          {children}
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
