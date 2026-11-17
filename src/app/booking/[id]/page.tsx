"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  Info,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import { formatRupiah } from "@/lib/packages";
import { useStore } from "@/lib/store";
import {
  loadSnapScript,
  formatPaymentType,
  type MidtransSnapResult,
} from "@/lib/midtrans";

type Traveler = { name: string; phone: string; gender: string; relation: string };
const emptyTraveler = (): Traveler => ({
  name: "",
  phone: "",
  gender: "Laki-laki",
  relation: "Diri Sendiri",
});

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const {
    packages,
    packagesLoading,
    packagesError,
    bankAccounts,
    addBooking,
    updateBookingProof,
  } = useStore();

  const pkg = packages.find((item) => item.id === id);

  const [step, setStep] = useState(1);
  const [travelers, setTravelers] = useState<Traveler[]>([emptyTraveler()]);
  const [note, setNote] = useState("");
  const [paymentGateway, setPaymentGateway] = useState<"midtrans" | "manual">("midtrans");
  const [selectedBankIndex, setSelectedBankIndex] = useState(0);
  const [paymentScheme, setPaymentScheme] = useState<"full" | "dp">("full");
  const [downPayment, setDownPayment] = useState(20);
  const [bookingId, setBookingId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [snapReady, setSnapReady] = useState(false);
  const [midtransResult, setMidtransResult] = useState<MidtransSnapResult | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Load Midtrans Snap SDK in background on mount
  useEffect(() => {
    loadSnapScript()
      .then(() => setSnapReady(true))
      .catch((err) => console.warn("Midtrans script loading warning:", err));
  }, []);

  if (!pkg) {
    return (
      <div className="page-width not-found">
        <h1>{packagesLoading ? "Memuat paket..." : "Paket tidak tersedia"}</h1>
        <p>{packagesError || "Paket ini tidak ditemukan atau sudah tidak aktif."}</p>
        <Link className="button button-primary" href="/">
          Kembali ke Katalog Paket
        </Link>
      </div>
    );
  }

  const selectedBank = bankAccounts[selectedBankIndex] || bankAccounts[0] || {
    bank: "Bank Syariah Indonesia (BSI)",
    owner: "PT An Nahl Mandiri Berkah",
    number: "7123456789",
  };

  const total = pkg.price * travelers.length;
  const dpAmount =
    paymentScheme === "full" ? total : Math.round((total * downPayment) / 100);
  const activeBookingId =
    bookingId || `UQ-${Date.now().toString().slice(-8)}`;

  const updateTraveler = (index: number, field: keyof Traveler, value: string) => {
    setTravelers((current) =>
      current.map((traveler, i) =>
        i === index ? { ...traveler, [field]: value } : traveler
      )
    );
  };

  const proceedToPayment = () => {
    setError("");
    const invalid = travelers.some(
      (person) => person.name.trim().length < 3 || person.phone.trim().length < 8
    );
    if (invalid) {
      setError("Mohon lengkapi nama lengkap (min 3 huruf) dan nomor HP/WhatsApp setiap jemaah.");
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /**
   * Save booking to database and initiate Midtrans Snap payment
   */
  const handleMidtransPayment = async () => {
    setBusy(true);
    setError("");
    setStatusMessage("Menghubungkan ke gateway pembayaran Midtrans Sandbox...");

    try {
      const currentBookingId = activeBookingId;
      setBookingId(currentBookingId);

      // 1. Register booking in database if not registered yet
      await addBooking({
        id: currentBookingId,
        packageId: pkg.id,
        packageName: pkg.name,
        price: total,
        createdAt: new Date().toISOString(),
        status: "Menunggu",
        travelers: travelers.map(({ name, phone, gender }) => ({
          name,
          phone,
          gender,
        })),
        paymentMethod: `Midtrans Sandbox (${paymentScheme === "full" ? "Lunas 100%" : `DP ${downPayment}%`})`,
      });

      // 2. Request Midtrans Snap Token from our Next.js API
      const tokenRes = await fetch("/api/midtrans/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: currentBookingId,
          packageId: pkg.id,
          packageName: pkg.name,
          amount: dpAmount,
          paymentScheme,
          travelers,
          customer: {
            name: travelers[0]?.name || "Jemaah UmrahQu",
            phone: travelers[0]?.phone || "08123456789",
            email: "jemaah@annahl-travel.com",
          },
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.token) {
        throw new Error(tokenData.error || "Gagal mendapatkan token pembayaran Midtrans.");
      }

      // 3. Ensure Snap Script is ready
      await loadSnapScript();

      if (!window.snap) {
        throw new Error("SDK Midtrans Snap gagal dimuat pada peramban.");
      }

      setStatusMessage("Menampilkan jendela pembayaran Midtrans...");

      // 4. Trigger Midtrans Snap popup
      window.snap.pay(tokenData.token, {
        onSuccess: async (result) => {
          console.log("Midtrans payment success:", result);
          setMidtransResult(result);
          setSuccess("Pembayaran berhasil diverifikasi secara instan oleh Midtrans!");
          setStep(3);
          setBusy(false);

          // Trigger server-side status verification and sync to Supabase
          try {
            await fetch(`/api/midtrans/status?order_id=${result.order_id}`);
          } catch (syncErr) {
            console.warn("Status sync background:", syncErr);
          }
        },
        onPending: async (result) => {
          console.log("Midtrans payment pending:", result);
          setMidtransResult(result);
          setSuccess(
            "Pesanan telah dibuat. Silakan selesaikan pembayaran sesuai instruksi Virtual Account / QRIS yang dipilih."
          );
          setStep(3);
          setBusy(false);

          try {
            await fetch(`/api/midtrans/status?order_id=${result.order_id}`);
          } catch (syncErr) {
            console.warn("Status sync background:", syncErr);
          }
        },
        onError: (result) => {
          console.error("Midtrans payment error:", result);
          setMidtransResult(result);
          setError("Pembayaran ditolak atau terjadi kendala pada Midtrans. Silakan coba kembali.");
          setBusy(false);
        },
        onClose: () => {
          console.log("Midtrans modal closed without completion");
          setStep(3);
          setBusy(false);
          setStatusMessage("");
        },
      });
    } catch (reason) {
      console.error("Midtrans flow error:", reason);
      setError(
        reason instanceof Error
          ? reason.message
          : "Gagal memulai pembayaran Midtrans. Silakan coba lagi."
      );
      setBusy(false);
    }
  };

  /**
   * Manual Transfer Booking creation (alternative fallback)
   */
  const handleManualBooking = async () => {
    setBusy(true);
    setError("");
    try {
      const newId = activeBookingId;
      await addBooking({
        id: newId,
        packageId: pkg.id,
        packageName: pkg.name,
        price: total,
        createdAt: new Date().toISOString(),
        status: "Menunggu",
        travelers: travelers.map(({ name, phone, gender }) => ({
          name,
          phone,
          gender,
        })),
        paymentMethod: `Transfer Manual ${selectedBank.bank} (${paymentScheme === "full" ? "Bayar Penuh" : `DP ${downPayment}%`})`,
      });
      setBookingId(newId);
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Pemesanan gagal dibuat. Silakan coba lagi."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = (text: string) => {
    if (navigator?.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const uploadProof = async () => {
    if (!file) {
      setError("Pilih berkas bukti transfer terlebih dahulu.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran file maksimal 5 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await updateBookingProof(bookingId || activeBookingId, file);
      setSuccess(
        "Bukti transfer berhasil dikirim! Tim operasional travel akan segera memverifikasi pembayaran Anda."
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Bukti pembayaran gagal diunggah."
      );
    } finally {
      setBusy(false);
    }
  };

  const checkLiveStatus = async () => {
    const idToCheck = bookingId || activeBookingId;
    if (!idToCheck) return;
    setIsCheckingStatus(true);
    setError("");
    try {
      const res = await fetch(`/api/midtrans/status?order_id=${idToCheck}`);
      const data = await res.json();
      if (res.ok && data.transaction_status) {
        if (data.is_success) {
          setSuccess("Pembayaran telah berstatus Lunas! Data jemaah telah terkonfirmasi otomatis.");
        } else if (data.transaction_status === "pending") {
          setStatusMessage("Status Midtrans: Menunggu penyelesaian pembayaran oleh jemaah.");
        }
      } else {
        setStatusMessage(data.error || "Belum ada transaksi aktif untuk kode ini.");
      }
    } catch (err) {
      console.warn("Gagal cek status:", err);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  return (
    <div className="page-width booking-page">
      <nav className="breadcrumbs" aria-label="Jejak navigasi">
        <Link href="/">Beranda</Link>
        <span>/</span>
        <Link href={`/packages/${pkg.id}`}>{pkg.name}</Link>
        <span>/</span>
        <b>Pemesanan &amp; Pembayaran</b>
      </nav>

      {/* Stepper Progress */}
      <div className="stepper card">
        <div className={step >= 1 ? "active" : ""}>
          <span>{step > 1 ? <Check size={16} /> : "1"}</span>
          <b>Data Jemaah</b>
        </div>
        <i className={step > 1 ? "active" : ""} />
        <div className={step >= 2 ? "active" : ""}>
          <span>{step > 2 ? <Check size={16} /> : "2"}</span>
          <b>Metode Pembayaran</b>
        </div>
        <i className={step > 2 ? "active" : ""} />
        <div className={step >= 3 ? "active" : ""}>
          <span>3</span>
          <b>Konfirmasi &amp; Bayar</b>
        </div>
      </div>

      <div className="booking-layout">
        <div className="booking-main">
          {/* STEP 1: Traveler Data */}
          {step === 1 && (
            <div className="step-container tab-fade-in">
              <section className="card passenger-count">
                <div className="passenger-count-header">
                  <h3>
                    <Users size={18} /> Jumlah Jemaah Yang Didaftarkan
                  </h3>
                  <p className="muted small">
                    Tambahkan keluarga atau kerabat yang akan berangkat bersama Anda.
                  </p>
                </div>
                <div className="count-control">
                  <button
                    type="button"
                    aria-label="Kurangi jemaah"
                    disabled={travelers.length <= 1}
                    onClick={() => setTravelers((current) => current.slice(0, -1))}
                  >
                    −
                  </button>
                  <strong>{travelers.length}</strong>
                  <button
                    type="button"
                    aria-label="Tambah jemaah"
                    disabled={travelers.length >= 20}
                    onClick={() => setTravelers((current) => [...current, emptyTraveler()])}
                  >
                    +
                  </button>
                  <small className="muted">Orang (Maks 20)</small>
                </div>
              </section>

              {travelers.map((person, index) => (
                <section className="card traveler-card" key={index}>
                  <div className="traveler-heading">
                    <span className="traveler-number">{index + 1}</span>
                    <div>
                      <b>
                        Jemaah {index + 1} {person.name ? `— ${person.name}` : ""}
                      </b>
                      <small className="muted">Pastikan nama dan ejaan sesuai KTP / Paspor</small>
                    </div>
                  </div>
                  <div className="traveler-form">
                    <label>
                      Nama Lengkap (sesuai Paspor / KTP) *
                      <input
                        value={person.name}
                        onChange={(event) => updateTraveler(index, "name", event.target.value)}
                        placeholder="Contoh: Muhammad Fauzi"
                        required
                      />
                    </label>

                    <label>
                      No. Telepon / WhatsApp Aktif *
                      <input
                        type="tel"
                        value={person.phone}
                        onChange={(event) => updateTraveler(index, "phone", event.target.value)}
                        placeholder="Contoh: 08123456789"
                        required
                      />
                    </label>

                    <fieldset>
                      <legend>Jenis Kelamin *</legend>
                      <div className="gender-options">
                        <button
                          type="button"
                          className={person.gender === "Laki-laki" ? "selected" : ""}
                          onClick={() => updateTraveler(index, "gender", "Laki-laki")}
                        >
                          Laki-laki
                        </button>
                        <button
                          type="button"
                          className={person.gender === "Perempuan" ? "selected" : ""}
                          onClick={() => updateTraveler(index, "gender", "Perempuan")}
                        >
                          Perempuan
                        </button>
                      </div>
                    </fieldset>

                    <label>
                      Hubungan dengan Pemesan
                      <select
                        value={person.relation}
                        onChange={(event) => updateTraveler(index, "relation", event.target.value)}
                      >
                        <option>Diri Sendiri</option>
                        <option>Pasangan (Suami / Istri)</option>
                        <option>Orang Tua (Ayah / Ibu)</option>
                        <option>Anak</option>
                        <option>Saudara Kandung</option>
                        <option>Lainnya</option>
                      </select>
                    </label>
                  </div>
                </section>
              ))}

              <section className="card note-card">
                <label>
                  Catatan Khusus untuk Travel <small>(opsional)</small>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Contoh: Permintaan kamar khusus, kebutuhan kursi roda, atau alergi makanan..."
                  />
                </label>
              </section>

              {error && (
                <div className="error-message" role="alert">
                  <XCircle size={15} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 6 }} />
                  {error}
                </div>
              )}

              <button className="button button-primary button-full" onClick={proceedToPayment}>
                Lanjutkan ke Metode Pembayaran <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* STEP 2: Payment Method */}
          {step === 2 && (
            <div className="step-container tab-fade-in">
              {/* Payment Gateway Selector */}
              <section className="card payment-gateway-card">
                <div className="card-heading">
                  <div>
                    <span className="eyebrow">METODE PEMBAYARAN RESMI</span>
                    <h2>Pilih Cara Pembayaran</h2>
                    <p className="muted">
                      Tersedia pembayaran otomatis instan via Midtrans Sandbox dan transfer manual.
                    </p>
                  </div>
                </div>

                <div className="gateway-options-grid">
                  <button
                    type="button"
                    className={`gateway-option${paymentGateway === "midtrans" ? " selected" : ""}`}
                    onClick={() => setPaymentGateway("midtrans")}
                  >
                    <div className="gateway-top">
                      <div className="gateway-icon-badge midtrans">
                        <Sparkles size={18} />
                      </div>
                      <div className="gateway-meta">
                        <div className="gateway-title-row">
                          <b>Midtrans Payment Gateway</b>
                          <span className="badge-sandbox">Sandbox Active</span>
                        </div>
                        <small className="muted">
                          Virtual Account (BCA, Mandiri, BNI, BRI, Permata), QRIS (GoPay/ShopeePay), Kartu Kredit
                        </small>
                      </div>
                    </div>
                    <div className="gateway-perks">
                      <span><Check size={12} /> Verifikasi Otomatis Instan</span>
                      <span><Check size={12} /> Tanpa Unggah Bukti Manual</span>
                      <span><Check size={12} /> Aman Berizin BI</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`gateway-option${paymentGateway === "manual" ? " selected" : ""}`}
                    onClick={() => setPaymentGateway("manual")}
                  >
                    <div className="gateway-top">
                      <div className="gateway-icon-badge manual">
                        <Banknote size={18} />
                      </div>
                      <div className="gateway-meta">
                        <b>Transfer Rekening Manual</b>
                        <small className="muted">
                          Transfer langsung ke rekening korporat PT An Nahl Mandiri Berkah
                        </small>
                      </div>
                    </div>
                    <div className="gateway-perks">
                      <span><Check size={12} /> BSI, Mandiri, BCA</span>
                      <span><Check size={12} /> Verifikasi Admin Manual</span>
                    </div>
                  </button>
                </div>

                {/* Midtrans Sandbox Testing Banner */}
                {paymentGateway === "midtrans" && (
                  <div className="midtrans-info-box">
                    <div className="midtrans-info-header">
                      <Info size={16} />
                      <b>Mode Uji Coba: Midtrans Sandbox {snapReady ? "(Snap Siap)" : "(Memuat...)"}</b>
                    </div>
                    <p className="small muted">
                      Sistem terhubung ke Midtrans Sandbox Client Key <code>Mid-client-3VmmM...</code>. Anda dapat memilih Virtual Account atau QRIS pada jendela popup Snap dan menyimulasikan pembayaran berhasil melalui Midtrans Payment Simulator.
                    </p>
                    <div className="midtrans-channels-strip">
                      <span className="channel-tag"><CreditCard size={12} style={{ marginRight: 4 }} /> BCA VA</span>
                      <span className="channel-tag"><CreditCard size={12} style={{ marginRight: 4 }} /> Mandiri Bill</span>
                      <span className="channel-tag"><CreditCard size={12} style={{ marginRight: 4 }} /> BNI VA</span>
                      <span className="channel-tag"><CreditCard size={12} style={{ marginRight: 4 }} /> BRI VA</span>
                      <span className="channel-tag"><CreditCard size={12} style={{ marginRight: 4 }} /> Permata VA</span>
                      <span className="channel-tag"><QrCode size={12} style={{ marginRight: 4 }} /> QRIS GoPay</span>
                      <span className="channel-tag"><QrCode size={12} style={{ marginRight: 4 }} /> ShopeePay</span>
                      <span className="channel-tag"><CreditCard size={12} style={{ marginRight: 4 }} /> Visa / Mastercard</span>
                    </div>
                  </div>
                )}

                {/* Manual Bank List if manual is chosen */}
                {paymentGateway === "manual" && (
                  <div className="manual-bank-wrap">
                    <h3>Pilih Rekening Tujuan Transfer</h3>
                    <div className="bank-selection-grid">
                      {bankAccounts.map((account, idx) => (
                        <button
                          key={account.number}
                          type="button"
                          className={`bank-card-button${selectedBankIndex === idx ? " selected" : ""}`}
                          onClick={() => setSelectedBankIndex(idx)}
                        >
                          <div className="bank-header">
                            <Banknote size={16} />
                            <b>{account.bank}</b>
                          </div>
                          <div className="bank-number-preview">{account.number}</div>
                          <small className="muted">{account.owner}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment Scheme (Full vs DP) */}
                <h3 className="scheme-heading">Skema Pembayaran</h3>
                <div className="payment-scheme-grid">
                  <button
                    type="button"
                    className={`scheme-card${paymentScheme === "full" ? " selected" : ""}`}
                    onClick={() => setPaymentScheme("full")}
                  >
                    <b>Bayar Lunas (100%)</b>
                    <small>Selesaikan seluruh biaya paket langsung sekarang</small>
                  </button>
                  <button
                    type="button"
                    className={`scheme-card${paymentScheme === "dp" ? " selected" : ""}`}
                    onClick={() => setPaymentScheme("dp")}
                  >
                    <b>Uang Muka (DP) Dulu</b>
                    <small>Amankan kursi sekarang, pelunasan bertahap</small>
                  </button>
                </div>

                {paymentScheme === "dp" && (
                  <div className="dp-control-wrap">
                    <label className="range-label">
                      <span>Besaran Uang Muka (DP):</span>
                      <strong>{downPayment}% · {formatRupiah(dpAmount)}</strong>
                      <input
                        type="range"
                        min="10"
                        max="50"
                        step="10"
                        value={downPayment}
                        onChange={(event) => setDownPayment(Number(event.target.value))}
                      />
                    </label>
                    <div className="installment-grid">
                      <div>
                        Cicilan 3x
                        <small>{formatRupiah(Math.ceil((total - dpAmount) / 3))}/bln</small>
                      </div>
                      <div>
                        Cicilan 6x
                        <small>{formatRupiah(Math.ceil((total - dpAmount) / 6))}/bln</small>
                      </div>
                      <div>
                        Cicilan 12x
                        <small>{formatRupiah(Math.ceil((total - dpAmount) / 12))}/bln</small>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {error && (
                <div className="error-message" role="alert">
                  <XCircle size={15} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 6 }} />
                  {error}
                </div>
              )}
              {statusMessage && <div className="status-notice"><RefreshCw size={14} className="spin" /> {statusMessage}</div>}

              <div className="booking-actions">
                <button className="button button-outline" onClick={() => setStep(1)} disabled={busy}>
                  <ArrowLeft size={15} /> Kembali ke Data Jemaah
                </button>
                {paymentGateway === "midtrans" ? (
                  <button
                    className="button button-primary button-midtrans"
                    disabled={busy}
                    onClick={handleMidtransPayment}
                  >
                    {busy ? "Menyiapkan Midtrans..." : `Bayar via Midtrans (${formatRupiah(dpAmount)})`} <ArrowRight size={15} />
                  </button>
                ) : (
                  <button
                    className="button button-primary"
                    disabled={busy}
                    onClick={handleManualBooking}
                  >
                    {busy ? "Menyimpan ke Database..." : "Lanjut ke Instruksi Transfer"} <ArrowRight size={15} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Confirmation / Receipt / Instructions */}
          {step === 3 && (
            <div className="step-container tab-fade-in">
              {/* Success Screen from Midtrans */}
              {midtransResult && (midtransResult.transaction_status === "settlement" || midtransResult.transaction_status === "capture") ? (
                <section className="card receipt-card tab-fade-in">
                  <div className="receipt-success-badge">
                    <CheckCircle2 size={42} className="text-green" />
                    <h2>Pembayaran Berhasil!</h2>
                    <p className="muted">
                      Transaksi Anda telah diverifikasi otomatis oleh Midtrans Sandbox secara realtime.
                    </p>
                  </div>

                  <div className="receipt-box">
                    <div className="receipt-row">
                      <span>Nomor Pesanan</span>
                      <b>{midtransResult.order_id || bookingId}</b>
                    </div>
                    <div className="receipt-row">
                      <span>ID Transaksi Midtrans</span>
                      <code>{midtransResult.transaction_id}</code>
                    </div>
                    <div className="receipt-row">
                      <span>Metode Pembayaran</span>
                      <b>{formatPaymentType(midtransResult.payment_type)}</b>
                    </div>
                    <div className="receipt-row">
                      <span>Nominal Terbayar</span>
                      <strong className="text-green">{formatRupiah(Number(midtransResult.gross_amount))}</strong>
                    </div>
                    <div className="receipt-row">
                      <span>Waktu Transaksi</span>
                      <small>{midtransResult.transaction_time || new Date().toLocaleString("id-ID")}</small>
                    </div>
                    <div className="receipt-row">
                      <span>Status Pesanan</span>
                      <span className="badge-lunas">LUNAS / DIKONFIRMASI</span>
                    </div>
                  </div>

                  <div className="post-booking-links">
                    <Link
                      href={`/tracking?code=${bookingId || activeBookingId}`}
                      className="button button-primary button-full"
                    >
                      <FileText size={16} /> Pantau Progres di Halaman Tracking
                    </Link>
                    <Link href="/dashboard" className="button button-outline button-full">
                      Buka Dashboard Saya
                    </Link>
                  </div>
                </section>
              ) : paymentGateway === "midtrans" ? (
                /* Midtrans Pending / Order Created Card */
                <section className="card midtrans-pending-card tab-fade-in">
                  <div className="instruction-header">
                    <span className="eyebrow">KODE PESANAN: {bookingId || activeBookingId}</span>
                    <h2>
                      <Clock size={18} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 8, color: "var(--gold)" }} />
                      Pembayaran via Midtrans Sandbox
                    </h2>
                    <p className="muted">
                      Pesanan Anda telah tercatat di database Supabase dengan status <b>Menunggu</b>.
                    </p>
                  </div>

                  {midtransResult && (
                    <div className="midtrans-result-summary">
                      <div className="receipt-row">
                        <span>Metode Terpilih</span>
                        <b>{formatPaymentType(midtransResult.payment_type)}</b>
                      </div>
                      {midtransResult.va_numbers && midtransResult.va_numbers[0] && (
                        <div className="account-number-box">
                          <div className="account-details">
                            <span>Nomor Virtual Account ({midtransResult.va_numbers[0].bank.toUpperCase()})</span>
                            <b>{midtransResult.va_numbers[0].va_number}</b>
                          </div>
                          <button
                            type="button"
                            className="copy-btn"
                            onClick={() => handleCopy(midtransResult.va_numbers![0].va_number)}
                          >
                            <Copy size={15} />
                            <span>{copied ? "Tersalin!" : "Salin VA"}</span>
                          </button>
                        </div>
                      )}
                      <div className="receipt-row">
                        <span>Tagihan Pembayaran</span>
                        <strong className="text-green">{formatRupiah(dpAmount)}</strong>
                      </div>
                    </div>
                  )}

                  <div className="simulator-helper-card">
                    <div className="simulator-helper-header">
                      <Sparkles size={16} />
                      <b>Simulasi Pembayaran (Midtrans Simulator)</b>
                    </div>
                    <p className="small muted">
                      Karena menggunakan Midtrans Sandbox, Anda dapat menyelesaikan pembayaran di simulator resmi Midtrans untuk melihat status berubah menjadi <b>Lunas</b> secara otomatis:
                    </p>
                    <a
                      href="https://simulator.sandbox.midtrans.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="simulator-link-btn"
                    >
                      <span>Buka Midtrans Payment Simulator</span>
                      <ExternalLink size={14} />
                    </a>
                  </div>

                  {success && (
                    <div className="success-message">
                      <CheckCircle2 size={18} />
                      <p>{success}</p>
                    </div>
                  )}

                  {error && <div className="error-message">{error}</div>}

                  <div className="midtrans-action-buttons">
                    <button
                      type="button"
                      className="button button-primary button-full"
                      disabled={busy}
                      onClick={handleMidtransPayment}
                    >
                      <CreditCard size={16} /> Buka Ulang Jendela Pembayaran Midtrans
                    </button>

                    <button
                      type="button"
                      className="button button-outline button-full"
                      disabled={isCheckingStatus}
                      onClick={checkLiveStatus}
                    >
                      <RefreshCw size={15} className={isCheckingStatus ? "spin" : ""} />
                      {isCheckingStatus ? "Memeriksa Status..." : "Cek Status Pembayaran Realtime"}
                    </button>
                  </div>

                  <div className="post-booking-links">
                    <Link
                      href={`/tracking?code=${bookingId || activeBookingId}`}
                      className="button button-outline button-full"
                    >
                      <FileText size={15} /> Buka Halaman Tracking Pesanan
                    </Link>
                  </div>
                </section>
              ) : (
                /* Manual Transfer Instructions & Proof Upload */
                <div className="manual-flow-wrap tab-fade-in">
                  <section className="card bank-instructions">
                    <div className="instruction-header">
                      <span className="eyebrow">NOMOR PESANAN: {bookingId || activeBookingId}</span>
                      <h2>Instruksi Transfer Pembayaran</h2>
                      <p className="muted">Silakan transfer ke rekening resmi travel berikut:</p>
                    </div>

                    <div className="account-number-box">
                      <div className="account-details">
                        <span>{selectedBank.bank}</span>
                        <b>{selectedBank.number}</b>
                        <small>a.n. {selectedBank.owner}</small>
                      </div>
                      <button
                        type="button"
                        className="copy-btn"
                        onClick={() => handleCopy(selectedBank.number)}
                      >
                        <Copy size={15} />
                        <span>{copied ? "Tersalin!" : "Salin No. Rek"}</span>
                      </button>
                    </div>

                    <div className="transfer-total">
                      <span>Nominal Yang Harus Ditransfer:</span>
                      <b>{formatRupiah(dpAmount)}</b>
                      <small>Transfer sesuai nominal agar verifikasi sistem otomatis lebih cepat.</small>
                    </div>

                    <p className="instruction-note">
                      <Info size={16} /> Harap simpan struk / tangkapan layar bukti transfer untuk diunggah di bawah ini.
                    </p>
                  </section>

                  {/* Upload Proof Card */}
                  <section className="card upload-card">
                    <h2>
                      <Upload size={18} /> Unggah Bukti Transfer
                    </h2>
                    <p className="muted small">Format didukung: JPG, PNG, WEBP, atau PDF (maksimal 5 MB).</p>

                    <label className="upload-zone">
                      <Upload size={28} />
                      <b>{file ? file.name : "Pilih Berkas Bukti Transfer"}</b>
                      <small className="muted">
                        {file
                          ? `${(file.size / 1024).toFixed(1)} KB`
                          : "Klik di sini untuk memilih gambar bukti transfer"}
                      </small>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                      />
                    </label>

                    <button
                      className="button button-primary button-full"
                      disabled={busy || !file}
                      onClick={uploadProof}
                    >
                      {busy ? "Mengirimkan Bukti..." : "Kirim Bukti Pembayaran"}
                    </button>

                    {success && (
                      <div className="success-message">
                        <CheckCircle2 size={18} />
                        <div>
                          <b>Pembayaran Berhasil Dicatat</b>
                          <p>{success}</p>
                        </div>
                      </div>
                    )}

                    <div className="post-booking-links">
                      <Link
                        href={`/tracking?code=${bookingId || activeBookingId}`}
                        className="button button-outline button-full"
                      >
                        <FileText size={15} /> Pantau Progres di Halaman Tracking
                      </Link>
                      <Link href="/dashboard" className="text-link text-center">
                        Buka Dashboard Saya
                      </Link>
                    </div>
                  </section>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Aside Order Summary */}
        <aside className="card booking-summary">
          <h3>Ringkasan Pemesanan</h3>
          <div className="summary-package">
            <div className="summary-thumb" style={{ backgroundImage: `url("${pkg.image}")` }} />
            <div>
              <span className="summary-agency">{pkg.agency}</span>
              <b>{pkg.name}</b>
              <small className="muted">
                {pkg.duration} Hari · {pkg.city}
              </small>
            </div>
          </div>

          <div className="summary-lines">
            <span>Harga per jemaah</span>
            <b>{formatRupiah(pkg.price)}</b>

            <span>Jumlah jemaah</span>
            <b>{travelers.length} orang</b>

            {pkg.cashback > 0 && (
              <>
                <span>Total Cashback</span>
                <b className="green">−{formatRupiah(pkg.cashback * travelers.length)}</b>
              </>
            )}

            <span>Total Biaya Paket</span>
            <b>{formatRupiah(total)}</b>
          </div>

          <div className="summary-total">
            <small>
              {step === 1
                ? "TOTAL BIAYA PAKET"
                : paymentScheme === "full"
                ? "TAGIHAN PENUH"
                : "TAGIHAN UANG MUKA (DP)"}
            </small>
            <b>{formatRupiah(step === 1 ? total : dpAmount)}</b>
          </div>

          <p className="summary-secure">
            <ShieldCheck size={16} /> Pembayaran aman berizin resmi melalui Midtrans Gateway &amp; Supabase Realtime
          </p>
        </aside>
      </div>
    </div>
  );
}
