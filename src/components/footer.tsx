import Link from "next/link";
import { Brand } from "@/components/header";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-about">
          <Brand light />
          <p>Platform pencarian dan perbandingan paket umroh terpercaya di Indonesia.</p>
          <span className="footer-label">HUBUNGI KAMI</span>
          <a href="mailto:salam@umrahqu.id" className="footer-contact">✉ &nbsp; salam@umrahqu.id</a>
        </div>
        <div><span className="footer-label">TAUTAN CEPAT</span><Link href="/#tentang">Tentang</Link><Link href="/#faq">FAQ</Link><Link href="/#travel">Travel Partner</Link><Link href="/#syarat">Syarat &amp; Ketentuan</Link></div>
        <div><span className="footer-label">PRODUK</span><Link href="/#paket">Paket Umroh</Link><Link href="/compare">Bandingkan</Link><Link href="/#promo">Promo</Link><Link href="/tracking">Tracking</Link><Link href="/travel/register">Daftarkan Travel</Link></div>
        <div><span className="footer-label">IKUTI KAMI</span><div className="socials"><a href="https://instagram.com" aria-label="Instagram">ig</a><a href="https://facebook.com" aria-label="Facebook">f</a><a href="https://x.com" aria-label="X">x</a></div></div>
      </div>
      <div className="footer-bottom">© 2026 UmrahQu — PT. Universal Big Data. Hak Cipta Dilindungi.</div>
    </footer>
  );
}
