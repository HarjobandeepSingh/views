import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GIF Studios - GIPHY Keyword Research Tool",
  description: "Research and analyze GIPHY keywords, trends, and metrics for content creators and marketers",
  keywords: ["giphy", "gif", "keyword research", "content creation", "social media", "marketing"],
  authors: [{ name: "GIF Studios" }],
  openGraph: {
    title: "GIF Studios - GIPHY Keyword Research Tool",
    description: "Research and analyze GIPHY keywords, trends, and metrics",
    type: "website",
    siteName: "GIF Studios",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GIF Studios",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GIF Studios - GIPHY Keyword Research Tool",
    description: "Research and analyze GIPHY keywords, trends, and metrics",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#5bbad5",
      },
    ],
  },
  manifest: "/site.webmanifest",
  themeColor: "#ffffff",
  viewport: "width=device-width, initial-scale=1.0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
