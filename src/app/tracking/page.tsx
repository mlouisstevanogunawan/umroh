"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CircleCheck,
  CircleDashed,
  CreditCard,
  ExternalLink,
  PackageCheck,
  RefreshCw,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { formatRupiah } from "@/lib/packages";
import { getSupabase } from "@/lib/supabase";
import { loadSnapScript, formatPaymentType } from "@/lib/midtrans";

type TrackedBooking = {
  id: string;
  packageName: string;
  agency?: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  travelersCount: number;
  createdAt: string;
  source: "bookings" | "travel_records";
  details?: Record<string, unknown>;
};

const SAMPLE_CODES = [
  { code: "MP-261112RPD301", label: "Dikonfirmasi" },
  { code: "MP-261112U58601", label: "Menunggu" },
  { code: "UQ-88291044", label: "Diproses" },
];

export default function TrackingPage() {
  const [code, setCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<TrackedBooking | null>(null);
  const [searched, setSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isCheckingMidtrans, setIsCheckingMidtrans] = useState(false);
  const [midtransNotice, setMidtransNotice] = useState("");

  const fetchBooking = async (searchCode: string) => {
    const trimmed = searchCode.trim();
    if (!trimmed) return;

    setSearching(true);
    setErrorMessage("");
    setMidtransNotice("");
    setSearched(true);

    const supabase = getSupabase();
    if (!supabase) {
      setErrorMessage("Koneksi Supabase belum disiapkan.");
      setSearching(false);
      return;
    }

    try {
      // 1. Check in bookings table (case-insensitive)
      const { data: bData, error: bError } = await supabase
        .from("bookings")
        .select("*")
        .ilike("id", trimmed)
        .maybeSingle();

      if (bData && !bError) {
        const travelers = Array.isArray(bData.travelers) ? bData.travelers : [];
        setResult({
          id: bData.id,
          packageName: bData.package_name,
          totalAmount: Number(bData.total_amount),
          status: bData.status,
          paymentMethod: bData.payment_method,
          travelersCount: travelers.length || 1,
          createdAt: bData.created_at,
          source: "bookings",
        });
        setSearching(false);
        return;
      }

      // 2. Check in travel_records table
      const { data: tData, error: tError } = await supabase
        .from("travel_records")
        .select("*")
        .eq("category", "bookings")
        .ilike("reference", trimmed)
        .maybeSingle();

      if (tData && !tError) {
        const details = (tData.details as Record<string, unknown>) || {};
        const pilgrims = Number(details.pilgrims_count) || 1;
        setResult({
          id: tData.reference,
          packageName: String(details.info || tData.title),
          agency: tData.branch ? `An-Nahl Travel (${tData.branch})` : "An-Nahl Travel & Tour",
          totalAmount: Number(tData.amount || 0),
          status: tData.status,
          paymentMethod: tData.channel || "Direct Booking",
          travelersCount: pilgrims,
          createdAt: tData.created_at,
          source: "travel_records",
          details,
        });
        setSearching(false);
        return;
      }

      setResult(null);
      setErrorMessage(`Pesanan dengan kode "${trimmed}" tidak ditemukan. Pastikan kode sudah benar.`);
    } catch (err) {
      console.error("Gagal melacak pesanan:", err);
      setErrorMessage("Gagal memuat status pesanan dari database.");
    } finally {
      setSearching(false);
    }
  };

  // Realtime updates for the tracked booking
  useEffect(() => {
    if (!result?.id) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`track-booking-${result.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: result.source === "bookings" ? "bookings" : "travel_records",
        },
        (payload) => {
          if (result.source === "bookings") {
            const row = payload.new as Record<string, unknown>;
            if (String(row.id).toLowerCase() === result.id.toLowerCase()) {
              setResult((prev) =>
                prev ? { ...prev, status: String(row.status) } : null
              );
            }
          } else {
            const row = payload.new as Record<string, unknown>;
            if (String(row.reference).toLowerCase() === result.id.toLowerCase()) {
              setResult((prev) =>
                prev ? { ...prev, status: String(row.status) } : null
              );
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeConnected(true);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [result?.id, result?.source]);

  // Read code from URL on load
  useEffect(() => {
    if (typeof window === "undefined") return;
    const codeFromUrl = new URLSearchParams(window.location.search).get("code");
    if (codeFromUrl) {
      setCode(codeFromUrl);
      void fetchBooking(codeFromUrl);
    }
  }, []);

  // Compute active step index
  const stepIndex = useMemo(() => {
    if (!result) return 0;
    switch (result.status) {
      case "Menunggu":
        return 1;
      case "Diproses":
        return 2;
      case "Dikonfirmasi":
      case "Lunas":
        return 3;
      case "Selesai":
        return 4;
      default:
        return 1;
    }
  }, [result]);

  /**
   * Pay or complete pending booking via Midtrans Snap popup
   */
  const handlePayNowMidtrans = async () => {
    if (!result) return;
    setIsPaying(true);
    setMidtransNotice("");

    try {
      await loadSnapScript();

      const res = await fetch("/api/midtrans/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: result.id,
          packageId: result.details?.package_id || "annahl-umrah",
          packageName: result.packageName,
          amount: result.totalAmount,
          customer: {
            name: result.packageName.split("·")[0] || "Jemaah Umrah",
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(data.error || "Gagal membuat sesi pembayaran Midtrans.");
      }

      window.snap?.pay(data.token, {
        onSuccess: async (snapRes) => {
          console.log("Tracking Snap success:", snapRes);
          setMidtransNotice("Pembayaran berhasil! Memverifikasi status pesanan...");
          // Sync with server
          await fetch(`/api/midtrans/status?order_id=${snapRes.order_id}`);
          void fetchBooking(result.id);
          setIsPaying(false);
        },
        onPending: async (snapRes) => {
          console.log("Tracking Snap pending:", snapRes);
          setMidtransNotice("Pembayaran sedang diproses. Silakan selesaikan tagihan Anda.");
          await fetch(`/api/midtrans/status?order_id=${snapRes.order_id}`);
          void fetchBooking(result.id);
          setIsPaying(false);
        },
        onError: (snapRes) => {
          console.error("Tracking Snap error:", snapRes);
          setMidtransNotice("Pembayaran tidak berhasil atau dibatalkan.");
          setIsPaying(false);
        },
        onClose: () => {
          setIsPaying(false);
        },
      });
    } catch (err) {
      console.error("Pay now error:", err);
      setMidtransNotice(err instanceof Error ? err.message : "Gagal membuka Midtrans.");
      setIsPaying(false);
    }
  };

  /**
   * Sync and check latest Midtrans transaction status directly
   */
  const handleCheckMidtransStatus = async () => {
    if (!result?.id) return;
    setIsCheckingMidtrans(true);
    setMidtransNotice("");
    try {
      const res = await fetch(`/api/midtrans/status?order_id=${result.id}`);
      const data = await res.json();
      if (res.ok && data.transaction_status) {
        setMidtransNotice(
          `Status Midtrans: ${data.transaction_status.toUpperCase()} (${data.payment_type || "Midtrans"}). Status pesanan kini: ${data.booking_status}`
        );
        void fetchBooking(result.id);
      } else {
        setMidtransNotice(data.error || "Belum ada transaksi Midtrans yang tercatat untuk kode ini.");
      }
    } catch (err) {
      console.warn("Check status error:", err);
      setMidtransNotice("Gagal menghubungi gateway Midtrans.");
    } finally {
      setIsCheckingMidtrans(false);
    }
  };

  return (
    <div className="page-width tracking-page">
      <div className="tracking-header">
        <span className="eyebrow">STATUS REALTIME PERJALANAN IBADAH</span>
        <h1>Tracking Pesanan Umrah</h1>
        <p>
          Pantau proses verifikasi pembayaran, dokumen jemaah, dan kepastian keberangkatan secara transparan dan realtime.
        </p>

        {/* Quick sample chips */}
        <div className="sample-codes-wrap">
          <small className="muted">Contoh kode uji database:</small>
          <div className="sample-chips">
            {SAMPLE_CODES.map((item) => (
              <button
                key={item.code}
                type="button"
                className="sample-chip"
                onClick={() => {
                  setCode(item.code);
                  void fetchBooking(item.code);
                }}
              >
                <span>{item.code}</span>
                <span className={`chip-status status-${item.label.toLowerCase()}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tracking Form */}
      <form
        className="tracking-form"
        onSubmit={(event) => {
          event.preventDefault();
          void fetchBooking(code);
        }}
      >
        <label>
          Masukkan Kode Pesanan / No. Referensi
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Contoh: MP-261112RPD301 atau UQ-88291044"
            required
          />
        </label>
        <button className="button button-primary" type="submit" disabled={searching}>
          <Search size={16} />
          <span>{searching ? "Mencari..." : "Lacak Pesanan"}</span>
        </button>
      </form>

      {/* Search Result */}
      {searched && (
        <div className="tracking-result-wrap tab-fade-in">
          {result ? (
            <article className="card tracking-result">
              <div className="tracking-result-top">
                <div className="tracking-badge-icon">
                  <PackageCheck size={28} />
                </div>
                <div className="tracking-main-info">
                  <div className="tracking-status-row">
                    <span className="order-id-label">Kode: {result.id}</span>
                    <span className={`status-pill status-${result.status.toLowerCase()}`}>
                      {result.status}
                    </span>
                    {realtimeConnected && (
                      <span className="realtime-live-tag">
                        <span className="live-dot" /> Live Update
                      </span>
                    )}
                  </div>
                  <h2>{result.packageName}</h2>
                  <div className="tracking-meta-line">
                    <span>
                      <CalendarDays size={13} /> Dipesan: {new Date(result.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                    <span>·</span>
                    <span><Users size={13} /> {result.travelersCount} Jemaah</span>
                    <span>·</span>
                    <span><CreditCard size={13} /> {formatRupiah(result.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Progress Stepper */}
              <div className="tracking-stepper-box">
                <h3>Progres Perjalanan Ibadah</h3>
                <div className="tracking-steps-grid">
                  <div className={`track-step-node ${stepIndex >= 1 ? "done" : ""}`}>
                    <div className="node-icon">
                      {stepIndex >= 1 ? <CircleCheck size={24} /> : <CircleDashed size={24} />}
                    </div>
                    <b>Pesanan Diterima</b>
                    <small>Data jemaah tercatat di sistem</small>
                  </div>

                  <div className={`track-step-node ${stepIndex >= 2 ? "done" : ""}`}>
                    <div className="node-icon">
                      {stepIndex >= 2 ? <CircleCheck size={24} /> : <CircleDashed size={24} />}
                    </div>
                    <b>Verifikasi Pembayaran</b>
                    <small>Pengecekan bukti transfer / DP</small>
                  </div>

                  <div className={`track-step-node ${stepIndex >= 3 ? "done" : ""}`}>
                    <div className="node-icon">
                      {stepIndex >= 3 ? <CircleCheck size={24} /> : <CircleDashed size={24} />}
                    </div>
                    <b>Dikonfirmasi Travel</b>
                    <small>Alokasi kursi &amp; booking hotel</small>
                  </div>

                  <div className={`track-step-node ${stepIndex >= 4 ? "done" : ""}`}>
                    <div className="node-icon">
                      {stepIndex >= 4 ? <CircleCheck size={24} /> : <CircleDashed size={24} />}
                    </div>
                    <b>Siap Berangkat</b>
                    <small>Manasik &amp; serah terima koper</small>
                  </div>
                </div>
              </div>

              {/* Midtrans Payment Action Box (if status is Menunggu or Diproses) */}
              {(result.status === "Menunggu" || result.status === "Diproses") && (
                <div className="tracking-payment-action-box tab-fade-in">
                  <div className="payment-action-header">
                    <Sparkles size={18} className="text-gold" />
                    <div>
                      <b>Selesaikan Pembayaran via Midtrans Sandbox</b>
                      <p className="small muted">
                        Gunakan Virtual Account otomatis, QRIS, atau Kartu Kredit untuk verifikasi pembayaran secara instan tanpa perlu unggah bukti manual.
                      </p>
                    </div>
                  </div>

                  <div className="payment-action-buttons">
                    <button
                      type="button"
                      className="button button-primary button-small"
                      disabled={isPaying}
                      onClick={handlePayNowMidtrans}
                    >
                      <CreditCard size={15} />
                      {isPaying ? "Menghubungkan Midtrans..." : `Bayar via Midtrans (${formatRupiah(result.totalAmount)})`}
                    </button>

                    <button
                      type="button"
                      className="button button-outline button-small"
                      disabled={isCheckingMidtrans}
                      onClick={handleCheckMidtransStatus}
                    >
                      <RefreshCw size={14} className={isCheckingMidtrans ? "spin" : ""} />
                      {isCheckingMidtrans ? "Memeriksa..." : "Cek Status Midtrans"}
                    </button>

                    <a
                      href="https://simulator.sandbox.midtrans.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="simulator-mini-link"
                    >
                      <span>Simulator Sandbox</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  {midtransNotice && (
                    <div className="tracking-midtrans-notice">
                      <Sparkles size={14} />
                      <span>{midtransNotice}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Notes / Details */}
              {result.details && (
                <div className="tracking-extra-details">
                  <b>Catatan Operasional Travel:</b>
                  <p>{String(result.details.notes || "Proses berjalan sesuai jadwal.")}</p>
                  {Boolean(result.details.payment_type) && (
                    <p className="small muted">
                      Metode Pembayaran: <b>{formatPaymentType(String(result.details.payment_type))}</b>
                    </p>
                  )}
                </div>
              )}

              <div className="tracking-footer-actions">
                <Link href="/#paket" className="button button-outline button-small">
                  Jelajahi Paket Lain
                </Link>
                <Link href="/dashboard" className="button button-primary button-small">
                  Buka Dashboard Jemaah
                </Link>
              </div>
            </article>
          ) : (
            <div className="error-message tracking-error" role="alert">
              <p>{errorMessage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
