import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SessionProvider } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | NyayAI",
    default: "NyayAI — AI-Powered Legal Intelligence for Indian Advocates",
  },
  description:
    "AI-powered legal intelligence for Indian advocates. Case analysis, judge assessment, BNS/IPC mapping, document drafting, eCourts sync, client portal, and RAG-powered legal research.",
  robots: { index: false, follow: false }, // Private SaaS — no public indexing
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        <SessionProvider>{children}</SessionProvider>
        {/* Razorpay checkout SDK — loaded globally so BillingActions can use window.Razorpay */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
