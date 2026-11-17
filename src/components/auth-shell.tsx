import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({ children, title, accent, description }: { children: ReactNode; title: string; accent: string; description: string }) {
  return <div className="auth-layout"><aside className="auth-promo"><Link href="/" className="brand brand-light">UMRAH<span>QU</span></Link><div><h2>{title}<br /><span>{accent}</span></h2><p>{description}</p><div className="auth-stats"><span><b>8</b><small>Travel Mitra Terverifikasi</small></span><i /><span><b>49</b><small>Paket Umroh Aktif</small></span></div></div><small className="auth-copyright">© 2026 UmrahQu. Seluruh hak cipta.</small></aside><section className="auth-content">{children}</section></div>;
}
