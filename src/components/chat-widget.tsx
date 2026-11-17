"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { formatRupiah, type UmrahPackage } from "@/lib/packages";
import { useStore } from "@/lib/store";

type Message = { role: "assistant" | "user"; text: string; packageId?: string };

const suggestions = [
  "Mana paket yang paling recommended?",
  "Bandingkan harga per hari",
  "Rekomendasi paket untuk keluarga / lansia?",
  "Paket dengan hotel bintang 5 terbaik?",
];

function recommend(question: string, packages: UmrahPackage[]): Message {
  const prompt = question.toLowerCase();
  let candidates = [...packages];

  if (prompt.includes("keluarga") || prompt.includes("anak") || prompt.includes("lansia") || prompt.includes("orang tua")) {
    candidates = packages.filter((pkg) => pkg.type === "Keluarga" || pkg.name.toLowerCase().includes("keluarga"));
    if (!candidates.length) candidates = packages.filter((pkg) => pkg.stars >= 4);
  } else if (prompt.includes("hotel") || prompt.includes("bintang") || prompt.includes("vip") || prompt.includes("mewah")) {
    candidates = [...packages].sort((a, b) => b.stars - a.stars || b.price - a.price);
  } else if (prompt.includes("per hari") || prompt.includes("perhari")) {
    candidates = [...packages].sort((a, b) => a.price / a.duration - b.price / b.duration);
  } else if (prompt.includes("hemat") || prompt.includes("murah") || prompt.includes("terjangkau") || prompt.includes("harga")) {
    candidates = [...packages].sort((a, b) => a.price - b.price);
  } else if (prompt.includes("turki") || prompt.includes("plus")) {
    candidates = packages.filter((pkg) => pkg.type.toLowerCase().includes("plus") || pkg.name.toLowerCase().includes("turki"));
  } else if (prompt.includes("ramadhan") || prompt.includes("itikaf")) {
    candidates = packages.filter((pkg) => pkg.type.toLowerCase().includes("ramadhan"));
  } else {
    candidates = [...packages].sort(
      (a, b) => b.stars * 2 + (b.seats / b.quota) - (a.stars * 2 + (a.seats / a.quota))
    );
  }

  const best = candidates[0] || packages[0];
  if (!best) {
    return {
      role: "assistant",
      text: "Maaf, belum ada paket yang cocok di katalog saat ini. Silakan coba tanyakan kota asal atau fasilitas yang Anda inginkan.",
    };
  }

  const context =
    prompt.includes("keluarga") || prompt.includes("lansia")
      ? "Untuk perjalanan bersama keluarga dan lansia, paket ini memiliki fasilitas ramah kursi roda dan tempo ziarah yang tenang."
      : prompt.includes("hotel") || prompt.includes("bintang") || prompt.includes("vip")
      ? `Paket ini menawarkan akomodasi hotel bintang ${best.stars} terdepan di pelataran Masjidil Haram dan Nabawi.`
      : prompt.includes("per hari") || prompt.includes("perhari")
      ? `Biaya perjalanan ini sangat efisien, sekitar ${formatRupiah(Math.round(best.price / best.duration))} per hari.`
      : prompt.includes("murah") || prompt.includes("hemat") || prompt.includes("harga")
      ? "Ini pilihan paling ekonomis dengan fasilitas terjamin tanpa mengurangi kenyamanan ibadah."
      : prompt.includes("turki")
      ? "Pilihan umrah plus terbaik yang menggabungkan ibadah Tanah Suci dengan napak tilas sejarah Islam di Turki."
      : "Rekomendasi terbaik kami dengan keseimbangan fasilitas, maskapai terkemuka, dan ulasan jemaah yang sangat tinggi.";

  return {
    role: "assistant",
    text: `${context} Kami menyarankan ${best.name} dari ${best.agency} (keberangkatan ${best.departure} dari ${best.city}, durasi ${best.duration} hari) dengan harga ${formatRupiah(best.price)}/orang.`,
    packageId: best.id,
  };
}

export function ChatWidget() {
  const { packages } = useStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Assalamu'alaikum! Saya asisten pintar UmrahQu. Tanyakan rekomendasi paket terbaik, hotel pelataran, umrah keluarga, atau perbandingan harga per hari.",
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((current) => [...current, { role: "user", text: trimmed }, recommend(trimmed, packages)]);
    setInput("");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send(input);
  };

  return (
    <>
      {!open && (
        <button
          className="chat-launcher pulse-btn"
          onClick={() => setOpen(true)}
          aria-label="Buka Tanya AI Konsultasi Umrah"
        >
          <Sparkles size={16} />
          <span>Tanya AI Umrah</span>
        </button>
      )}

      {open && (
        <>
          <div
            className="chat-backdrop"
            onClick={() => setOpen(false)}
            aria-label="Tutup panel Tanya AI"
          />
          <aside className="chat-panel chat-slide-in" aria-label="Tanya AI rekomendasi paket">
            <div className="chat-header">
              <div className="chat-header-title">
                <Bot size={18} />
                <div>
                  <b>Tanya AI UmrahQu</b>
                  <small>Konsultasi Cerdas Paket Ibadah</small>
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Tutup Tanya AI">
                <X size={18} />
              </button>
            </div>

            <div className="chat-messages">
              {messages.map((message, index) => (
                <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
                  <span className="chat-avatar">
                    {message.role === "assistant" ? <Bot size={14} /> : "J"}
                  </span>
                  <div className="chat-bubble">
                    <p>{message.text}</p>
                    {message.packageId && (
                      <Link
                        href={`/packages/${message.packageId}`}
                        onClick={() => setOpen(false)}
                        className="chat-recommend-link"
                      >
                        Lihat Detail Paket <span>→</span>
                      </Link>
                    )}
                  </div>
                </div>
              ))}

              {messages.length === 1 && (
                <div className="chat-suggestions">
                  <span>Paling Sering Ditanyakan:</span>
                  {suggestions.map((suggestion) => (
                    <button key={suggestion} onClick={() => send(suggestion)}>
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input" onSubmit={submit}>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Tanyakan paket, hotel, atau budget Anda..."
                aria-label="Pertanyaan untuk Tanya AI"
              />
              <button disabled={!input.trim()} aria-label="Kirim pertanyaan">
                <Send size={16} />
              </button>
              <small className="muted text-center">
                Rekomendasi dihitung otomatis dari data katalog Supabase terbaru.
              </small>
            </form>
          </aside>
        </>
      )}
    </>
  );
}
