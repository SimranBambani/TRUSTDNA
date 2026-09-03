import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TrustDNA — Digital Trust & Identity Verification",
    template: "%s | TrustDNA",
  },
  description:
    "Establish verifiable digital trust through credentials, identity verification, and fraud detection.",
  keywords: ["digital trust", "identity verification", "verifiable credentials", "fraud detection", "KYC"],
  authors: [{ name: "TrustDNA" }],
  creator: "TrustDNA",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "TrustDNA",
    title: "TrustDNA — Digital Trust & Identity Verification",
    description: "Establish verifiable digital trust through credentials, identity verification, and fraud detection.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrustDNA — Digital Trust & Identity Verification",
    description: "Establish verifiable digital trust through credentials, identity verification, and fraud detection.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
