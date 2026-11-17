"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Info,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { formatRupiah } from "@/lib/packages";
import { useStore } from "@/lib/store";

type Traveler = { name: string; phone: string; gender: string; relation: string };
const emptyTraveler = (): Traveler => ({ name: "", phone: "", gender: "Laki-laki", relation: "Diri Sendiri" });

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
  const [selectedBankIndex, setSelectedBankIndex] = useState(0);
  const [paymentScheme, setPaymentScheme] = useState<"full" | "dp">("dp");
  const [downPayment, setDownPayment] = useState(20);
  const [bookingId, setBookingId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!pkg) {
    return (
      <div className="page-width not-found">
        <h1>{packagesLoading ? "Memuat paket..." : "Paket tidak tersedia"}</h1>
        <p>{packagesError || "Paket ini tidak ditemukan atau sudah tidak aktif."}</p>
        <Link className="button button-primary" href="/">Kembali ke Katalog Paket</Link>
      </div>
    );
  }

  const selectedBank = bankAccounts[selectedBankIndex] || bankAccounts[0] || {
    bank: "Bank Syariah Indonesia (BSI)",
    owner: "PT An Nahl Mandiri Berkah",
    number: "7123456789",
  };

  const total = pkg.price * travelers.length;
  const dpAmount = paymentScheme === "full" ? total : Math.round((total * downPayment) / 100);
  const activeBookingId = bookingId || `UQ-${Date.now().toString().slice(-8)}`;

  const updateTraveler = (index: number, field: keyof Traveler, value: string) => {
    setTravelers((current) =>
      current.map((traveler, i) => (i === index ? { ...traveler, [field]: value } : traveler))
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

  const createBooking = async () => {
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
        travelers: travelers.map(({ name, phone, gender }) => ({ name, phone, gender })),
        paymentMethod: `Transfer ${selectedBank.bank} (${paymentScheme === "full" ? "Bayar Penuh" : `DP ${downPayment}%`})`,
      });
      setBookingId(newId);
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pemesanan gagal dibuat. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const handleCopyAccount = () => {
    if (navigator?.clipboard) {
      void navigator.clipboard.writeText(selectedBank.number);
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
      setSuccess("Bukti transfer berhasil dikirim! Tim operasional travel akan segera memverifikasi pembayaran Anda.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Bukti pembayaran gagal diunggah.");
    } finally {
      setBusy(false);
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
          <b>Instruksi &amp; Bukti</b>
        </div>
      </div>

      <div className="booking-layout">
        <div className="booking-main">
          {/* STEP 1: Traveler Data */}
          {step === 1 && (
            <div className="step-container tab-fade-in">
              <section className="card passenger-count">
                <div className="passenger-count-header">
                  <h3><Users size={18} /> Jumlah Jemaah Yang Didaftarkan</h3>
                  <p className="muted small">Tambahkan keluarga atau kerabat yang akan berangkat bersama Anda.</p>
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
                      <b>Jemaah {index + 1} {person.name ? `— ${person.name}` : ""}</b>
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

              {error && <div className="error-message" role="alert">{error}</div>}

              <button className="button button-primary button-full" onClick={proceedToPayment}>
                Lanjutkan ke Pembayaran <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* STEP 2: Payment Method */}
          {step === 2 && (
            <div className="step-container tab-fade-in">
              <section className="card payment-choices">
                <div className="card-heading">
                  <div>
                    <span className="eyebrow">REKENING RESMI TRAVEL</span>
                    <h2>Pilih Rekening Tujuan Transfer</h2>
                    <p className="muted">Semua rekening berbadan hukum resmi PT An Nahl Mandiri Berkah.</p>
                  </div>
                </div>

                <div className="bank-selection-grid">
                  {bankAccounts.map((account, idx) => (
                    <button
                      key={account.number}
                      type="button"
                      className={`bank-card-button${selectedBankIndex === idx ? " selected" : ""}`}
                      onClick={() => setSelectedBankIndex(idx)}
                    >
                      <div className="bank-header">
                        <Banknote size={18} />
                        <b>{account.bank}</b>
                      </div>
                      <div className="bank-number-preview">{account.number}</div>
                      <small className="muted">{account.owner}</small>
                    </button>
                  ))}
                </div>

                <h3>Skema Pembayaran</h3>
                <div className="payment-scheme-grid">
                  <button
                    type="button"
                    className={`scheme-card${paymentScheme === "dp" ? " selected" : ""}`}
                    onClick={() => setPaymentScheme("dp")}
                  >
                    <b>Uang Muka (DP) Dulu</b>
                    <small>Bayar DP untuk amankan kursi, pelunasan bertahap</small>
                  </button>
                  <button
                    type="button"
                    className={`scheme-card${paymentScheme === "full" ? " selected" : ""}`}
                    onClick={() => setPaymentScheme("full")}
                  >
                    <b>Bayar Lunas (100%)</b>
                    <small>Selesaikan seluruh biaya paket langsung</small>
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

              {error && <div className="error-message" role="alert">{error}</div>}

              <div className="booking-actions">
                <button className="button button-outline" onClick={() => setStep(1)}>
                  <ArrowLeft size={15} /> Kembali ke Data Jemaah
                </button>
                <button className="button button-primary" disabled={busy} onClick={createBooking}>
                  {busy ? "Menyimpan ke Database..." : "Konfirmasi & Buat Pesanan"} <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Transfer Instructions & Proof Upload */}
          {step === 3 && (
            <div className="step-container tab-fade-in">
              <section className="card bank-instructions">
                <div className="instruction-header">
                  <span className="eyebrow">NOMOR PESANAN: {bookingId}</span>
                  <h2>Instruksi Transfer Pembayaran</h2>
                  <p className="muted">Silakan transfer ke rekening resmi travel berikut:</p>
                </div>

                <div className="account-number-box">
                  <div className="account-details">
                    <span>{selectedBank.bank}</span>
                    <b>{selectedBank.number}</b>
                    <small>a.n. {selectedBank.owner}</small>
                  </div>
                  <button type="button" className="copy-btn" onClick={handleCopyAccount}>
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
                <h2><Upload size={18} /> Unggah Bukti Transfer</h2>
                <p className="muted small">Format didukung: JPG, PNG, WEBP, atau PDF (maksimal 5 MB).</p>

                <label className="upload-zone">
                  <Upload size={28} />
                  <b>{file ? file.name : "Pilih Berkas Bukti Transfer"}</b>
                  <small className="muted">
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : "Klik di sini untuk memilih gambar bukti transfer"}
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
                  <Link href={`/tracking?code=${bookingId}`} className="button button-outline button-full">
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

        {/* Aside Order Summary */}
        <aside className="card booking-summary">
          <h3>Ringkasan Pemesanan</h3>
          <div className="summary-package">
            <div className="summary-thumb" style={{ backgroundImage: `url("${pkg.image}")` }} />
            <div>
              <span className="summary-agency">{pkg.agency}</span>
              <b>{pkg.name}</b>
              <small className="muted">{pkg.duration} Hari · {pkg.city}</small>
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
            <small>{step === 1 ? "TOTAL BIAYA PAKET" : paymentScheme === "full" ? "TAGIHAN PENUH" : "TAGIHAN UANG MUKA (DP)"}</small>
            <b>{formatRupiah(step === 1 ? total : dpAmount)}</b>
          </div>

          <p className="summary-secure">
            <ShieldCheck size={16} /> Pemesanan aman langsung ke sistem database resmi
          </p>
        </aside>
      </div>
    </div>
  );
}
