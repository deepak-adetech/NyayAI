import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SessionProvider } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | NyayaSahayak",
    default: "NyayaSahayak — AI Legal Assistant for Indian Lawyers",
  },
  description:
    "AI-powered legal workspace for Indian lawyers. BNS/IPC section identification, case management, OCR for FIRs, hearing reminders, and legal research.",
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
