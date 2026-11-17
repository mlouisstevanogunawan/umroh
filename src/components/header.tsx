"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Scale,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link className={`brand${light ? " brand-light" : ""}`} href="/" aria-label="UmrahQu beranda">
      UMRAH<span>QU</span>
    </Link>
  );
}

export function Header() {
  const { compare, notifications, realtimeConnected } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    let active = true;
    const supabase = getSupabase();
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const user = data.session?.user;
      if (user) {
        setUserName(
          user.user_metadata?.full_name || user.email?.split("@")[0] || "Jemaah"
        );
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) {
        setUserName(
          session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Jemaah"
        );
      } else {
        setUserName(null);
      }
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Close mobile nav on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileNavOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Prevent background scroll when mobile nav is open
  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <div className="header-brand-wrap">
            <Brand />
            {realtimeConnected && (
              <span className="realtime-badge" title="Data terhubung secara real-time ke Supabase">
                <span className="live-dot" /> Live
              </span>
            )}
          </div>

          <nav className="main-nav" aria-label="Navigasi utama">
            <Link href="/#paket" className="nav-item">Paket</Link>
            <Link href="/tracking" className="nav-item">Tracking</Link>
            <Link href="/#travel" className="nav-item">Travel Partner</Link>
            <Link href="/#faq" className="nav-item">FAQ</Link>
          </nav>

          <div className="header-actions">
            <Link
              className="icon-link compare-link"
              href="/compare"
              aria-label="Bandingkan paket"
              title="Bandingkan paket pilihan"
            >
              <Scale size={18} />
              {compare.length > 0 && <span className="count-badge">{compare.length}</span>}
            </Link>

            <Link
              className="icon-link notification-link"
              href="/dashboard?tab=notifications"
              aria-label="Notifikasi"
              title="Notifikasi"
            >
              <Bell size={18} />
              {unreadCount > 0 && <span className="count-badge">{unreadCount}</span>}
            </Link>

            <div className="account-wrap">
              <button
                className="account-button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-label="Menu akun"
              >
                <span className="account-avatar">
                  {userName ? userName.charAt(0).toUpperCase() : <UserRound size={15} />}
                </span>
                <span className="account-name-label">{userName || "Akun"}</span>
                <ChevronDown size={13} className={`chevron-icon ${menuOpen ? "open" : ""}`} />
              </button>

              {menuOpen && (
                <>
                  <div className="dropdown-backdrop" onClick={() => setMenuOpen(false)} />
                  <div className="account-menu">
                    <strong>{userName ? `Salam, ${userName}` : "Selamat datang"}</strong>
                    <span className="muted small">
                      {userName ? "Akun Jemaah Terverifikasi" : "Jelajahi UmrahQu"}
                    </span>
                    <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                      <LayoutDashboard size={14} /> Dashboard Saya
                    </Link>
                    {userName ? (
                      <button
                        className="account-menu-logout"
                        onClick={async () => {
                          setMenuOpen(false);
                          const supabase = getSupabase();
                          if (supabase) await supabase.auth.signOut();
                          window.location.assign("/");
                        }}
                      >
                        <LogOut size={14} /> Keluar Akun
                      </button>
                    ) : (
                      <Link href="/login" onClick={() => setMenuOpen(false)}>
                        <UserRound size={14} /> Masuk / Daftar
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>

            {!userName && (
              <>
                <Link className="button button-outline header-login" href="/login">
                  Masuk
                </Link>
                <Link className="button button-primary header-register" href="/register">
                  Daftar
                </Link>
              </>
            )}

            {/* Mobile Hamburger Button */}
            <button
              className="mobile-menu-toggle"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label={mobileNavOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileNavOpen(false)}>
          <div
            className="mobile-drawer-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mobile-drawer-header">
              <Brand />
              <button
                className="mobile-drawer-close"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Tutup menu"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mobile-drawer-status">
              <span className="live-dot" />
              <span>Realtime Database Aktif</span>
            </div>

            <nav className="mobile-drawer-nav">
              <Link
                href="/#paket"
                onClick={() => setMobileNavOpen(false)}
                className="mobile-drawer-link"
              >
                <span>Paket Umroh</span>
                <small className="muted">Katalog lengkap harga & fasilitas</small>
              </Link>
              <Link
                href="/tracking"
                onClick={() => setMobileNavOpen(false)}
                className="mobile-drawer-link"
              >
                <span>Tracking Pesanan</span>
                <small className="muted">Lacak status pesanan ibadah</small>
              </Link>
              <Link
                href="/compare"
                onClick={() => setMobileNavOpen(false)}
                className="mobile-drawer-link"
              >
                <span>Bandingkan Paket</span>
                {compare.length > 0 && (
                  <span className="count-badge inline">{compare.length}</span>
                )}
              </Link>
              <Link
                href="/#travel"
                onClick={() => setMobileNavOpen(false)}
                className="mobile-drawer-link"
              >
                <span>Travel Partner</span>
                <small className="muted">Mitra resmi berizin Kemenag</small>
              </Link>
              <Link
                href="/travel/register"
                onClick={() => setMobileNavOpen(false)}
                className="mobile-drawer-link highlight"
              >
                <Sparkles size={16} />
                <span>Daftarkan Travel Anda</span>
              </Link>
              <Link
                href="/#faq"
                onClick={() => setMobileNavOpen(false)}
                className="mobile-drawer-link"
              >
                <span>FAQ &amp; Bantuan</span>
                <small className="muted">Pertanyaan umum seputar UmrahQu</small>
              </Link>
            </nav>

            <div className="mobile-drawer-footer">
              {userName ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileNavOpen(false)}
                    className="button button-primary button-full"
                  >
                    <LayoutDashboard size={16} /> Buka Dashboard ({userName})
                  </Link>
                  <button
                    className="button button-outline button-full"
                    onClick={async () => {
                      setMobileNavOpen(false);
                      const supabase = getSupabase();
                      if (supabase) await supabase.auth.signOut();
                      window.location.assign("/");
                    }}
                  >
                    <LogOut size={16} /> Keluar Akun
                  </button>
                </>
              ) : (
                <div className="mobile-drawer-auth-buttons">
                  <Link
                    href="/login"
                    onClick={() => setMobileNavOpen(false)}
                    className="button button-outline button-full"
                  >
                    Masuk Akun
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileNavOpen(false)}
                    className="button button-primary button-full"
                  >
                    Daftar Sekarang
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
