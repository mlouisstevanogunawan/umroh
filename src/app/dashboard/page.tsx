"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Grid2X2,
  Heart,
  House,
  LogOut,
  Moon,
  PackageCheck,
  Settings,
  Sparkles,
  Sun,
  UserRound,
} from "lucide-react";
import { formatRupiah } from "@/lib/packages";
import { useStore } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";

type DashboardTab = "Ringkasan" | "Pesanan Saya" | "Daftar Keinginan" | "Cashback" | "Notifikasi" | "Pengaturan";

const navigation: { name: DashboardTab; icon: typeof Grid2X2 }[] = [
  { name: "Ringkasan", icon: Grid2X2 },
  { name: "Pesanan Saya", icon: ClipboardList },
  { name: "Daftar Keinginan", icon: Heart },
  { name: "Cashback", icon: CircleDollarSign },
  { name: "Notifikasi", icon: Bell },
  { name: "Pengaturan", icon: Settings },
];

export default function DashboardPage() {
  const [tab, setTab] = useState<DashboardTab>("Ringkasan");
  const [filter, setFilter] = useState("Semua");
  const [notificationFilter, setNotificationFilter] = useState<"Semua" | "Belum Dibaca" | "Dibaca">("Semua");
  const [dark, setDark] = useState(false);
  const [name, setName] = useState("Jemaah");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [settingsView, setSettingsView] = useState<"account" | "theme">("account");

  const {
    packages,
    wishlist,
    bookings,
    notifications,
    realtimeConnected,
    toggleWishlist,
    markNotificationRead,
    markAllNotificationsRead,
  } = useStore();

  const wishlisted = packages.filter((pkg) => wishlist.includes(pkg.id));
  const filteredOrders = useMemo(
    () => (filter === "Semua" ? bookings : bookings.filter((booking) => booking.status === filter)),
    [bookings, filter]
  );

  useEffect(() => {
    let active = true;
    try {
      setName(localStorage.getItem("umrahqu-name") || "Jemaah");
      setPhone(localStorage.getItem("umrahqu-phone") || "");
      const savedTheme = localStorage.getItem("umrahqu-theme") === "dark";
      setDark(savedTheme);
      document.documentElement.dataset.theme = savedTheme ? "dark" : "light";
    } catch (error) {
      console.error("Preferensi dashboard tidak dapat dimuat.", error);
    }

    const supabase = getSupabase();
    if (supabase) {
      void (async () => {
        try {
          const { data: authData, error: authError } = await supabase.auth.getSession();
          if (authError) throw authError;
          const user = authData.session?.user;
          if (!user || !active) return;

          setAccountEmail(user.email ?? "");
          const metadataName = user.user_metadata?.full_name;
          if (typeof metadataName === "string" && metadataName) {
            setName(metadataName);
            localStorage.setItem("umrahqu-name", metadataName);
          }

          const { data, error } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("id", user.id)
            .maybeSingle();

          if (error) throw error;
          if (!active || !data) return;

          if (data.full_name) {
            setName(data.full_name);
            localStorage.setItem("umrahqu-name", data.full_name);
          }
          if (data.phone) {
            setPhone(data.phone);
            localStorage.setItem("umrahqu-phone", data.phone);
          }
        } catch (error) {
          console.error("Profil Supabase tidak dapat dimuat.", error);
          if (active) setSettingsError("Profil akun gagal dimuat dari Supabase.");
        }
      })();
    }

    return () => { active = false; };
  }, []);

  const setTheme = (value: boolean) => {
    setDark(value);
    document.documentElement.dataset.theme = value ? "dark" : "light";
    localStorage.setItem("umrahqu-theme", value ? "dark" : "light");
  };

  const activeOrders = bookings.filter((b) => !["Selesai", "Dibatalkan"].includes(b.status)).length;
  const doneOrders = bookings.filter((b) => ["Selesai", "Lunas"].includes(b.status)).length;
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const visibleNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (notificationFilter === "Belum Dibaca") return !item.read;
      if (notificationFilter === "Dibaca") return item.read;
      return true;
    });
  }, [notifications, notificationFilter]);

  // Support direct tab via query param
  useEffect(() => {
    if (typeof window === "undefined") return;
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    const tabMap: Record<string, DashboardTab> = {
      orders: "Pesanan Saya",
      wishlist: "Daftar Keinginan",
      cashback: "Cashback",
      notifications: "Notifikasi",
      settings: "Pengaturan",
    };
    if (requestedTab && tabMap[requestedTab]) setTab(tabMap[requestedTab]);
  }, []);

  return (
    <div className="dashboard-shell">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-user">
          <span className="user-avatar">{name.trim().charAt(0).toUpperCase() || "J"}</span>
          <div>
            <b>{name}</b>
            <small className="muted">Jemaah Terverifikasi</small>
            {realtimeConnected && (
              <span className="user-realtime-badge">
                <span className="live-dot" /> Live
              </span>
            )}
          </div>
        </div>

        <nav aria-label="Menu dashboard">
          {navigation.map(({ name: item, icon: Icon }) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => {
                setTab(item);
                setSaved(false);
              }}
            >
              <Icon size={16} />
              <span>{item}</span>
              {item === "Notifikasi" && unreadNotifications > 0 && (
                <span className="nav-count">{unreadNotifications}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <Link href="/">
            <House size={16} /> Beranda
          </Link>
          <button
            className="sidebar-logout"
            onClick={async () => {
              const supabase = getSupabase();
              if (supabase) {
                await supabase.auth.signOut();
              }
              window.location.assign("/");
            }}
          >
            <LogOut size={16} /> Keluar Akun
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="dashboard-content">
        {settingsError && <p className="error-message" role="alert">{settingsError}</p>}

        {/* TAB 1: Ringkasan */}
        {tab === "Ringkasan" && (
          <div className="tab-fade-in">
            <div className="dashboard-title-row">
              <div>
                <span className="eyebrow">DASHBOARD JEMAAH</span>
                <h1>Salam, {name}</h1>
              </div>
              <span className="date-chip">
                <CalendarDays size={15} />
                {new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date())}
              </span>
            </div>

            <div className="dashboard-stats">
              <Stat icon={<ClipboardList size={20} />} title="Pesanan Aktif" value={activeOrders} />
              <Stat icon={<Heart size={20} />} title="Daftar Keinginan" value={wishlist.length} />
              <Stat icon={<PackageCheck size={20} />} title="Pesanan Selesai / Lunas" value={doneOrders} />
            </div>

            <section className="card recent-orders">
              <div className="card-heading">
                <div>
                  <h2>Pesanan Terakhir</h2>
                  <p>Pantau status perjalanan ibadah Anda secara real-time.</p>
                </div>
                <button className="text-link" onClick={() => setTab("Pesanan Saya")}>
                  Lihat Semua <ChevronRight size={15} />
                </button>
              </div>

              {bookings.length ? (
                <div className="order-list">
                  {bookings.slice(0, 5).map((booking) => (
                    <OrderRow key={booking.id} booking={booking} packages={packages} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<ClipboardList size={30} />}
                  title="Belum ada pesanan aktif"
                  text="Paket umrah pilihan Anda akan tampil di sini setelah melakukan pemesanan."
                  action={
                    <Link className="button button-primary button-small" href="/#paket">
                      Cari Paket Umrah
                    </Link>
                  }
                />
              )}
            </section>

            <section className="card dashboard-discovery">
              <div>
                <h2>Rencanakan Ibadah Umrah Anda</h2>
                <p>Bandingkan paket terbaik dari travel terpercaya dengan kepastian keberangkatan.</p>
              </div>
              <Link className="button button-gold" href="/#paket">
                Jelajahi Paket <ChevronRight size={15} />
              </Link>
            </section>
          </div>
        )}

        {/* TAB 2: Pesanan Saya */}
        {tab === "Pesanan Saya" && (
          <div className="tab-fade-in">
            <div className="dashboard-title-row">
              <div>
                <span className="eyebrow">RIWAYAT PERJALANAN REALTIME</span>
                <h1>Pesanan Saya</h1>
              </div>
            </div>

            <div className="dashboard-stats compact">
              <Stat icon={<ClipboardList size={18} />} title="Total Pesanan" value={bookings.length} />
              <Stat icon={<PackageCheck size={18} />} title="Pesanan Aktif" value={activeOrders} />
              <Stat
                icon={<CalendarDays size={18} />}
                title="Bulan Ini"
                value={bookings.filter((b) => new Date(b.createdAt).getMonth() === new Date().getMonth()).length}
              />
            </div>

            <div className="filter-pills">
              {["Semua", "Menunggu", "Diproses", "Dikonfirmasi", "Lunas", "Selesai", "Dibatalkan"].map((item) => (
                <button
                  key={item}
                  className={filter === item ? "active" : ""}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <section className="card order-history">
              {filteredOrders.length ? (
                filteredOrders.map((booking) => (
                  <OrderRow key={booking.id} booking={booking} packages={packages} detailed />
                ))
              ) : (
                <EmptyState
                  icon={<ClipboardList size={30} />}
                  title="Pesanan belum ada pada status ini"
                  text="Pesanan baru akan tampil di sini dan disinkronkan secara realtime."
                  action={
                    <Link className="button button-primary button-small" href="/#paket">
                      Lihat Katalog Paket
                    </Link>
                  }
                />
              )}
            </section>
          </div>
        )}

        {/* TAB 3: Daftar Keinginan */}
        {tab === "Daftar Keinginan" && (
          <div className="tab-fade-in">
            <div className="dashboard-title-row">
              <div>
                <span className="eyebrow">PAKET FAVORIT</span>
                <h1>Daftar Keinginan (Wishlist)</h1>
                <p>Paket umrah yang Anda simpan untuk dibandingkan jadwal dan harganya.</p>
              </div>
            </div>

            {wishlisted.length ? (
              <div className="package-grid wishlist-grid">
                {wishlisted.map((pkg) => (
                  <div key={pkg.id} className="wishlist-card-wrap">
                    <button
                      className="wishlist-remove"
                      onClick={() => toggleWishlist(pkg.id)}
                      aria-label="Hapus dari daftar"
                    >
                      <Heart size={16} fill="currentColor" />
                    </button>
                    <div
                      className="wishlist-image"
                      style={{ backgroundImage: `url("${pkg.image}")` }}
                    />
                    <div className="wishlist-details">
                      <b>{pkg.name}</b>
                      <small className="muted">{pkg.agency} · {pkg.duration} Hari</small>
                      <strong>{formatRupiah(pkg.price)}</strong>
                      <Link href={`/packages/${pkg.id}`}>
                        Lihat Detail <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card">
                <EmptyState
                  icon={<Heart size={34} />}
                  title="Belum ada paket di Wishlist"
                  text="Simpan paket umrah yang menarik dengan menekan ikon hati pada katalog."
                  action={
                    <Link href="/#paket" className="text-link">
                      Jelajahi Paket Umrah <ChevronRight size={14} />
                    </Link>
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Cashback */}
        {tab === "Cashback" && (
          <div className="tab-fade-in">
            <div className="dashboard-title-row">
              <div>
                <span className="eyebrow">PROGRAM CASHBACK</span>
                <h1><CircleDollarSign size={24} /> Cashback Perjalanan</h1>
                <p>Ringkasan akumulasi cashback dari setiap paket ibadah yang Anda pesan.</p>
              </div>
            </div>

            <div className="info-banner">
              <Sparkles size={20} />
              <div>
                <b>Cashback Dikelola Langsung Oleh Travel Penyelenggara</b>
                <p>
                  Dana cashback dipotongkan langsung atau dikembalikan ke rekening jemaah saat proses verifikasi dan pelunasan dokumen.
                </p>
              </div>
            </div>

            <div className="dashboard-stats compact">
              <Stat
                icon={<CircleDollarSign size={20} />}
                title="Total Cashback Terakumulasi"
                value={formatRupiah(
                  bookings.reduce((sum, b) => {
                    const pkg = packages.find((p) => p.id === b.packageId);
                    return sum + (pkg?.cashback ?? 0);
                  }, 0)
                )}
              />
              <Stat
                icon={<CreditCard size={20} />}
                title="Total Paket Terdaftar"
                value={`${bookings.length} Pesanan`}
              />
            </div>

            <section className="card cashback-orders">
              <h2>Riwayat Cashback Paket</h2>
              {bookings.length ? (
                bookings.map((booking) => {
                  const pkg = packages.find((item) => item.id === booking.packageId);
                  return (
                    <div className="cashback-row" key={booking.id}>
                      <div>
                        <b>{booking.packageName}</b>
                        <small className="muted">
                          Kode: {booking.id} · {new Date(booking.createdAt).toLocaleDateString("id-ID")} · {booking.status}
                        </small>
                      </div>
                      <span className="cashback-badge-item">
                        ✦ Cashback {formatRupiah(pkg?.cashback ?? 0)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  icon={<CircleDollarSign size={30} />}
                  title="Belum ada cashback"
                  text="Cashback dari pesanan umrah Anda akan muncul otomatis di sini."
                />
              )}
            </section>
          </div>
        )}

        {/* TAB 5: Notifikasi */}
        {tab === "Notifikasi" && (
          <div className="tab-fade-in">
            <div className="notification-hero">
              <Bell size={28} />
              <div>
                <small>PEMBERITAHUAN REALTIME</small>
                <h1>Notifikasi Sistem &amp; Travel</h1>
                <p>{unreadNotifications} notifikasi belum dibaca</p>
              </div>
            </div>

            <div className="notification-actions">
              <div className="filter-pills">
                {(["Semua", "Belum Dibaca", "Dibaca"] as const).map((item) => (
                  <button
                    key={item}
                    className={notificationFilter === item ? "active" : ""}
                    onClick={() => setNotificationFilter(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <button
                className="button button-outline button-small"
                disabled={unreadNotifications === 0}
                onClick={() => markAllNotificationsRead()}
              >
                <CheckCheck size={15} /> Tandai Semua Dibaca
              </button>
            </div>

            <div className="notification-list">
              {visibleNotifications.map((item) => (
                <article
                  className={`card notification-item${item.read ? " read" : ""}`}
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => markNotificationRead(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") markNotificationRead(item.id);
                  }}
                >
                  <span className="notification-icon">
                    <Bell size={17} />
                  </span>
                  <div>
                    <b>{item.title}</b>
                    <p>{item.message}</p>
                    <small className="muted">
                      {new Date(item.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </div>
                  {item.link ? (
                    <Link href={item.link} className="notification-link-btn" onClick={(e) => e.stopPropagation()}>
                      <ChevronRight size={18} />
                    </Link>
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </article>
              ))}

              {visibleNotifications.length === 0 && (
                <div className="card">
                  <EmptyState
                    icon={<Bell size={30} />}
                    title="Tidak ada notifikasi"
                    text="Semua notifikasi penting telah Anda baca."
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: Pengaturan */}
        {tab === "Pengaturan" && (
          <div className="tab-fade-in">
            <div className="dashboard-title-row">
              <div>
                <span className="eyebrow">PENGATURAN AKUN</span>
                <h1>Pengaturan &amp; Tampilan</h1>
                <p>Kelola data profil jemaah dan mode tampilan aplikasi.</p>
              </div>
            </div>

            <div className="settings-tabs">
              <button
                className={settingsView === "account" ? "active" : ""}
                onClick={() => setSettingsView("account")}
              >
                <UserRound size={15} /> Profil Saya
              </button>
              <button
                className={settingsView === "theme" ? "active" : ""}
                onClick={() => setSettingsView("theme")}
              >
                <Sun size={15} /> Tampilan &amp; Tema
              </button>
            </div>

            {settingsView === "account" ? (
              <>
                <section className="card profile-card">
                  <span className="profile-avatar">{name.trim().charAt(0).toUpperCase() || "J"}</span>
                  <div>
                    <b>{name}</b>
                    <small>{accountEmail || "Jemaah UmrahQu"}</small>
                    <small className="muted">Data tersimpan di Supabase Profiles</small>
                  </div>
                </section>

                <section className="card settings-card">
                  <h2>Informasi Pribadi</h2>
                  <label>
                    Nama Lengkap (sesuai Paspor / KTP)
                    <input value={name} onChange={(event) => setName(event.target.value)} />
                  </label>

                  <label>
                    Nomor WhatsApp / HP
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="08xxxxxxxxxx"
                    />
                  </label>

                  <label>
                    Email Akun
                    <input value={accountEmail || "Belum terhubung"} disabled />
                    <small className="muted">Email akun terdaftar di otentikasi Supabase.</small>
                  </label>

                  {saved && <p className="success-message">Perubahan profil berhasil disimpan ke database!</p>}

                  <button
                    className="button button-primary"
                    onClick={async () => {
                      setSaved(false);
                      setSettingsError("");
                      try {
                        localStorage.setItem("umrahqu-name", name);
                        localStorage.setItem("umrahqu-phone", phone);
                        const supabase = getSupabase();
                        if (supabase) {
                          const { data, error: authError } = await supabase.auth.getSession();
                          if (authError) throw authError;
                          if (data.session?.user) {
                            const { error } = await supabase
                              .from("profiles")
                              .upsert({ id: data.session.user.id, full_name: name, phone });
                            if (error) throw error;
                          }
                        }
                        setSaved(true);
                      } catch (error) {
                        console.error("Profil tidak dapat diperbarui.", error);
                        setSettingsError(
                          error instanceof Error ? error.message : "Perubahan profil gagal disimpan."
                        );
                      }
                    }}
                  >
                    Simpan Perubahan
                  </button>
                </section>
              </>
            ) : (
              <section className="card settings-card">
                <h2>Mode Tampilan Aplikasi</h2>
                <p className="muted small">Pilih mode tampilan yang nyaman untuk mata Anda.</p>
                <div className="theme-control">
                  <span><Sun size={18} /> Mode Terang (Siang)</span>
                  <button
                    className={`toggle-switch${!dark ? " on" : ""}`}
                    onClick={() => setTheme(false)}
                    aria-label="Aktifkan mode terang"
                  />
                </div>
                <div className="theme-control">
                  <span><Moon size={18} /> Mode Gelap (Malam)</span>
                  <button
                    className={`toggle-switch${dark ? " on" : ""}`}
                    onClick={() => setTheme(true)}
                    aria-label="Aktifkan mode gelap"
                  />
                </div>
              </section>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, title, value }: { icon: React.ReactNode; title: string; value: string | number }) {
  return (
    <div className="card stat-card">
      <span className="stat-icon-wrap">{icon}</span>
      <div>
        <small className="muted">{title}</small>
        <b>{value}</b>
      </div>
    </div>
  );
}

function OrderRow({
  booking,
  packages,
  detailed = false,
}: {
  booking: {
    id: string;
    packageId: string;
    packageName: string;
    price: number;
    createdAt: string;
    status: string;
  };
  packages: ReturnType<typeof useStore>["packages"];
  detailed?: boolean;
}) {
  const pkg = packages.find((item) => item.id === booking.packageId);
  return (
    <Link href={`/tracking?code=${encodeURIComponent(booking.id)}`} className={`order-row${detailed ? " detailed" : ""}`}>
      <div
        className="order-thumb"
        style={pkg ? { backgroundImage: `url("${pkg.image}")` } : undefined}
      />
      <div className="order-name">
        <b>{booking.packageName}</b>
        <small className="muted">
          {booking.id} · {new Date(booking.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
        </small>
      </div>
      {detailed && <strong>{formatRupiah(booking.price)}</strong>}
      <span className={`status-pill status-${booking.status.toLowerCase()}`}>{booking.status}</span>
      <ChevronRight size={16} />
    </Link>
  );
}

function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p className="muted">{text}</p>
      {action}
    </div>
  );
}
