"use client";

import Link from "next/link";
import { useState } from "react";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { getSupabase } from "@/lib/supabase";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError(false);
    if (password.length < 8) { setMessage("Kata sandi harus terdiri dari minimal 8 karakter."); setError(true); return; }
    if (password !== confirmation) { setMessage("Konfirmasi kata sandi tidak sama."); setError(true); return; }
    const supabase = getSupabase();
    if (!supabase) { setMessage("Pendaftaran memerlukan konfigurasi Supabase. Tambahkan URL dan anon key di file .env.local."); setError(true); return; }
    setBusy(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (signUpError) { setMessage(signUpError.message); setError(true); }
      else setMessage("Pendaftaran berhasil. Periksa email Anda untuk verifikasi akun.");
    } catch (reason) {
      console.error("Permintaan pendaftaran gagal.", reason);
      setMessage(reason instanceof Error ? reason.message : "Pendaftaran gagal. Periksa koneksi internet Anda.");
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return <AuthShell title="Temukan Paket Umroh" accent="Sempurna" description="Bergabung dengan jamaah yang telah mempercayakan perjalanan ibadah mereka bersama UmrahQu.">
    <form className="auth-form" onSubmit={submit}><div><span className="eyebrow">MULAI PERJALANAN ANDA</span><h1>Buat Akun Baru</h1></div>
      <label>Nama Lengkap<div className="input-icon"><UserRound size={16} /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Masukkan nama lengkap" autoComplete="name" required /></div></label>
      <label>Email<div className="input-icon"><Mail size={16} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" autoComplete="email" required /></div></label>
      <label>Kata Sandi<div className="input-icon"><LockKeyhole size={16} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 8 karakter" autoComplete="new-password" required /></div></label>
      <label>Konfirmasi Kata Sandi<div className="input-icon"><LockKeyhole size={16} /><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Ulangi kata sandi" autoComplete="new-password" required /></div></label>
      {message && <p className={error ? "error-message" : "success-message"} role="status">{message}</p>}
      <button className="button button-primary button-full" disabled={busy}>{busy ? "Mendaftarkan..." : "Daftar"}</button>
      <div className="auth-divider"><span>atau</span></div><p className="auth-switch">Sudah punya akun? <Link href="/login">Masuk di sini</Link></p><p className="auth-terms">Dengan mendaftar, Anda menyetujui <Link href="/#syarat">Syarat &amp; Ketentuan</Link> dan <Link href="/#privasi">Kebijakan Privasi</Link>.</p>
    </form>
  </AuthShell>;
}
