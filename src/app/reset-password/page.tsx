"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { getSupabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const supabase = getSupabase();
    if (!supabase) { setMessage("Pemulihan kata sandi memerlukan konfigurasi Supabase."); setError(true); return; }
    setBusy(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` });
      if (resetError) { setMessage(resetError.message); setError(true); }
      else { setMessage("Tautan pemulihan telah dikirim. Silakan periksa email Anda."); setError(false); }
    } catch (reason) {
      console.error("Permintaan pemulihan kata sandi gagal.", reason);
      setMessage(reason instanceof Error ? reason.message : "Tidak dapat mengirim tautan. Periksa koneksi internet Anda.");
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return <AuthShell title="Temukan Paket Umroh" accent="Sempurna" description="Kami akan mengirim tautan untuk mengatur ulang kata sandi ke alamat email Anda."><form className="auth-form" onSubmit={submit}><div><span className="eyebrow">PEMULIHAN AKUN</span><h1>Lupa Kata Sandi?</h1><p>Masukkan email akun Anda untuk menerima tautan pemulihan.</p></div><label>Email<div className="input-icon"><Mail size={16} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" required /></div></label>{message && <p className={error ? "error-message" : "success-message"}>{message}</p>}<button className="button button-primary button-full" disabled={busy}>{busy ? "Mengirim..." : "Kirim Tautan Pemulihan"}</button><p className="auth-switch"><Link href="/login">Kembali ke halaman masuk</Link></p></form></AuthShell>;
}
