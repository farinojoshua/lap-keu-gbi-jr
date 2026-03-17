import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import AppLayout from "@/components/layout/AppLayout";
import ClientLogBridge from "@/components/providers/ClientLogBridge";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GBI Jonggol Portal",
  description: "Portal Gereja GBI Jonggol Raya",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={`${inter.className} antialiased`}>
        <SessionProvider>
          <ClientLogBridge />
          <AppLayout>{children}</AppLayout>
        </SessionProvider>
      </body>
    </html>
  );
}
