"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, CheckCircle2, FileCheck2, Globe2, MapPin, Upload, UserRound } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

const stepTitles = ["Profil Agen", "Legalitas", "Akun Admin", "Alamat"];

export default function TravelRegistrationPage() {
  const [step, setStep] = useState(0);
  const [userId, setUserId] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [biography, setBiography] = useState("");
  const [operatingSince, setOperatingSince] = useState("");
  const [quota, setQuota] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = getSupabase();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data, error: authError }) => {
      if (!active) return;
      if (authError) {
        console.error("Sesi akun travel tidak dapat dimuat.", authError);
        setError("Sesi akun tidak dapat diperiksa. Silakan muat ulang halaman.");
        return;
      }
      const user = data.session?.user;
      if (user) {
        setUserId(user.id);
        setContactEmail(user.email ?? "");
        const name = user.user_metadata.full_name;
        if (typeof name === "string") setContactName(name);
      }
    }).catch((reason: unknown) => {
      if (!active) return;
      console.error("Sesi akun travel gagal dimuat.", reason);
      setError("Sesi akun tidak dapat diperiksa. Periksa koneksi internet Anda.");
    });
    return () => { active = false; };
  }, []);

  const next = () => {
    setError("");
    if (step === 0 && (!agencyName.trim() || !subdomain.trim() || !biography.trim() || !operatingSince || !quota || !city.trim() || !phone.trim())) {
      setError("Lengkapi seluruh informasi profil travel terlebih dahulu.");
      return;
    }
    if (step === 0 && !/^[a-z0-9-]{3,30}$/.test(subdomain)) {
      setError("Subdomain hanya boleh berisi huruf kecil, angka, dan tanda hubung (3–30 karakter).");
      return;
    }
    if (step === 0 && (Number(operatingSince) < 1900 || Number(operatingSince) > new Date().getFullYear() || !Number.isInteger(Number(quota)) || Number(quota) < 1)) {
      setError("Periksa kembali tahun berdiri dan kuota jamaah.");
      return;
    }
    if (step === 1 && !licenseNumber.trim()) {
      setError("Lengkapi nomor izin PPIU atau NIB travel.");
      return;
    }
    if (step === 2 && (!contactName.trim() || !contactEmail.trim())) {
      setError("Lengkapi nama dan email admin travel.");
      return;
    }
    if (step < 3) setStep((current) => current + 1);
  };

  const selectLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null;
    setError("");
    if (!chosen) { setLogo(null); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(chosen.type)) {
      setError("Logo harus berupa berkas JPG, PNG, atau WEBP.");
      event.target.value = "";
      return;
    }
    if (chosen.size > 2 * 1024 * 1024) {
      setError("Ukuran logo maksimal 2 MB.");
      event.target.value = "";
      return;
    }
    setLogo(chosen);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!city.trim() || !address.trim()) { setError("Lengkapi kota dan alamat travel."); return; }
    if (!userId) { setError("Masuk ke akun jamaah Anda untuk mengirim pendaftaran travel."); return; }
    const supabase = getSupabase();
    if (!supabase) { setError("Supabase belum dikonfigurasi. Isi variabel pada .env.local."); return; }
    setBusy(true);
    let uploadedPath: string | null = null;
    try {
      if (logo) {
        uploadedPath = `${userId}/logos/${Date.now()}-${logo.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const { error: uploadError } = await supabase.storage.from("travel-assets").upload(uploadedPath, logo, {
          contentType: logo.type,
          upsert: false,
        });
        if (uploadError) throw new Error(`Logo gagal diunggah: ${uploadError.message}`);
      }
      const { error: insertError } = await supabase.from("travel_applications").insert({
        agency_name: agencyName.trim(),
        subdomain,
        biography: biography.trim(),
        operating_since: Number(operatingSince),
        quota: Number(quota),
        license_number: licenseNumber.trim(),
        logo_path: uploadedPath,
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
        phone: phone.trim(),
        city: city.trim(),
        address: address.trim(),
      });
      if (insertError) throw new Error(insertError.message);
      setComplete(true);
    } catch (reason) {
      console.error("Pendaftaran travel tidak dapat disimpan.", reason);
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from("travel-assets").remove([uploadedPath]);
        if (cleanupError) console.error("Logo travel gagal dibersihkan setelah pendaftaran gagal.", cleanupError);
      }
      setError(reason instanceof Error ? reason.message : "Pendaftaran gagal dikirim. Silakan coba kembali.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="travel-registration">
    <Link href="/" className="brand brand-light">UMRAH<span>QU</span></Link>
    <span className="travel-portal"><BadgeCheck size={13} /> Portal Mitra Resmi PPIU Kemenag RI</span>
    <h1>Daftarkan Agen <span>Travel Anda</span></h1>
    <p className="travel-intro">Bergabung dengan 100+ Travel Partner &amp; jangkau puluhan ribu calon jemaah umrah di seluruh Indonesia.</p>
    <form className="travel-form" onSubmit={submit}>
      <div className="travel-step-indicator">{stepTitles.map((title, index) => <div key={title} className={index === step ? "current" : index < step ? "complete" : ""}><span>{index < step ? <CheckCircle2 size={15} /> : index + 1}</span><small>{title}</small></div>)}</div>
      {step === 0 && <section className="travel-form-section"><div className="travel-form-title"><span>LANGKAH 1 DARI 4</span><h2><Building2 size={18} /> Profil Agen</h2></div><label>Nama Travel / Agen *<input value={agencyName} onChange={(event) => setAgencyName(event.target.value)} placeholder="Contoh: Al-Haramain Tour & Travel" /></label><label>Subdomain (URL Khusus Travel) *<div className="subdomain-input"><Globe2 size={14} /><input value={subdomain} onChange={(event) => setSubdomain(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="namatravel" /><span>.umrahqu.id</span></div></label><label>Biografi Travel<textarea value={biography} onChange={(event) => setBiography(event.target.value)} placeholder="Ceritakan sejarah singkat, keunggulan, dan pengalaman travel Anda..." /></label><div className="travel-two-col"><label>Beroperasi Sejak *<input type="number" min="1900" max={new Date().getFullYear()} value={operatingSince} onChange={(event) => setOperatingSince(event.target.value)} placeholder="Contoh: 2015" /></label><label>Kuota Tersedia *<div className="quota-input"><input type="number" min="1" value={quota} onChange={(event) => setQuota(event.target.value)} placeholder="Contoh: 83" /><span>kursi</span></div></label></div><label>Logo Resmi Travel<span className="travel-logo-upload"><Upload size={19} /><b>{logo?.name ?? "Klik atau seret file ke sini"}</b><small>PNG, JPG, atau WebP (Maksimal 2 MB)</small><input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={selectLogo} /></span></label><div className="travel-two-col"><label>Kota *<div className="travel-icon-input"><MapPin size={13} /><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Jakarta" /></div></label><label>Nomor Telepon Travel *<div className="travel-icon-input"><span className="country-prefix">🇮🇩 +62</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="812-3456-7890" /></div></label></div></section>}
      {step === 1 && <section className="travel-form-section"><div className="travel-form-title"><span>LANGKAH 2 DARI 4</span><h2><FileCheck2 size={18} /> Legalitas</h2></div><label>Nomor Izin PPIU / NIB *<input value={licenseNumber} onChange={(event) => setLicenseNumber(event.target.value)} placeholder="Masukkan nomor legalitas travel" /></label></section>}
      {step === 2 && <section className="travel-form-section"><div className="travel-form-title"><span>LANGKAH 3 DARI 4</span><h2><UserRound size={18} /> Akun Admin</h2></div><label>Nama Penanggung Jawab *<input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Nama lengkap penanggung jawab" /></label><label>Email Admin *<input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="admin@travel.com" /></label><p className="travel-field-note">Informasi ini digunakan tim UmrahQu untuk proses verifikasi dan komunikasi pendaftaran.</p></section>}
      {step === 3 && <section className="travel-form-section"><div className="travel-form-title"><span>LANGKAH 4 DARI 4</span><h2><MapPin size={18} /> Alamat Travel</h2></div><label>Alamat Lengkap *<textarea value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Nama jalan, nomor, kecamatan, kota, dan kode pos" /></label><div className="travel-review"><b>{agencyName || "Nama travel"}</b><span>{city || "Kota"} · +62 {phone}</span><small>Pengajuan akan ditinjau oleh tim UmrahQu sebelum profil travel ditampilkan.</small></div></section>}
      {error && <p className="error-message travel-error" role="alert">{error}</p>}
      {complete ? <div className="travel-complete"><CheckCircle2 size={30} /><h2>Pendaftaran berhasil dikirim</h2><p>Tim UmrahQu akan meninjau dokumen dan menghubungi Anda melalui email.</p><Link className="button button-primary" href="/">Kembali ke Beranda</Link></div> : <div className="travel-form-actions">{step === 0 ? <Link className="travel-back" href="/"><ArrowLeft size={14} /> Batal</Link> : <button type="button" className="travel-back" disabled={busy} onClick={() => setStep((current) => current - 1)}><ArrowLeft size={14} /> Kembali</button>}{step < 3 ? <button type="button" className="button button-primary" onClick={next}>Lanjut <ArrowRight size={14} /></button> : <button className="button button-primary" disabled={busy}>{busy ? "Mengirim..." : "Kirim Pendaftaran"} <ArrowRight size={14} /></button>}</div>}
    </form>
    <p className="travel-login-note">Sudah punya akun mitra? <Link href="/login">Masuk di sini</Link></p>
    <small className="travel-copyright">© 2026 UmrahQu. Seluruh hak cipta.</small>
  </div>;
}
