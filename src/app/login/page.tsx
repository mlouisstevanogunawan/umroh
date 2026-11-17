"use client";

import Link from "next/link";
import { useState } from "react";
import { LockKeyhole, Mail, Eye, EyeOff } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { AuthShell } from "@/components/auth-shell";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setIsError(false);
    const supabase = getSupabase();
    if (!supabase) {
      setMessage("Login memerlukan konfigurasi Supabase. Tambahkan URL dan anon key di file .env.local.");
      setIsError(true);
      setBusy(false);
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
        setIsError(true);
      } else {
        window.location.assign("/dashboard");
      }
    } catch (reason) {
      console.error("Permintaan masuk gagal.", reason);
      setMessage(reason instanceof Error ? reason.message : "Tidak dapat masuk. Periksa koneksi internet Anda.");
      setIsError(true);
    } finally {
      setBusy(false);
    }
  };

  return <AuthShell title="Temukan Paket Umroh" accent="Sempurna" description="Bergabung dengan jamaah yang telah mempercayakan perjalanan ibadah mereka bersama UmrahQu.">
    <form className="auth-form" onSubmit={submit}><div><span className="eyebrow">SELAMAT DATANG KEMBALI</span><h1>Masuk ke Akun Anda</h1></div>
      <label>Email<div className="input-icon"><Mail size={16} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" required /></div></label>
      <label>Kata Sandi<div className="input-icon"><LockKeyhole size={16} /><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan kata sandi" required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
      <div className="auth-forgot"><Link href="/reset-password">Lupa Kata Sandi?</Link></div>
      {message && <p className={isError ? "error-message" : "success-message"} role="alert">{message}</p>}
      <button className="button button-primary button-full" disabled={busy}>{busy ? "Memproses..." : "Masuk"}</button>
      <div className="auth-divider"><span>atau</span></div><p className="auth-switch">Belum punya akun? <Link href="/register">Daftar di sini</Link></p>
    </form>
  </AuthShell>;
}
