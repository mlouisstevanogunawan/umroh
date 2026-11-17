import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { StoreNotice } from "@/components/store-notice";
import { ChatWidget } from "@/components/chat-widget";

export const metadata: Metadata = {
  title: "UmrahQu — Cari, Bandingkan & Pesan Paket Umroh",
  description: "Temukan paket umroh terbaik dari travel terpercaya. Bandingkan fasilitas, harga, dan jadwal keberangkatan.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body>
        <StoreProvider>
          <Header />
          <StoreNotice />
          <main>{children}</main>
          <ChatWidget />
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
