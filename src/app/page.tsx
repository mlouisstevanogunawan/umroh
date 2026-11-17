"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  RotateCcw,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PackageCard } from "@/components/package-card";
import { useStore } from "@/lib/store";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [month, setMonth] = useState("");
  const [selectedType, setSelectedType] = useState("Semua");
  const [searched, setSearched] = useState(false);

  const { packages: packageList, compare, packagesLoading, packagesError, realtimeConnected } = useStore();

  const packageTypes = useMemo(() => {
    const types = Array.from(new Set(packageList.map((p) => p.type))).filter(Boolean);
    return ["Semua", ...types];
  }, [packageList]);

  const filtered = useMemo(() => {
    return packageList.filter((pkg) => {
      const matchesQuery =
        !query ||
        `${pkg.name} ${pkg.agency} ${pkg.type} ${pkg.airline} ${pkg.hotelMakkah}`
          .toLowerCase()
          .includes(query.toLowerCase());
      const matchesCity = !city || pkg.city === city;
      const matchesMonth = !month || pkg.departure.toLowerCase().includes(month.toLowerCase());
      const matchesType = selectedType === "Semua" || pkg.type === selectedType;
      return matchesQuery && matchesCity && matchesMonth && matchesType;
    });
  }, [packageList, query, city, month, selectedType]);

  const months = useMemo(() => {
    return Array.from(
      new Set(
        packageList
          .map((pkg) => pkg.departure.trim().split(/\s+/)[1])
          .filter(Boolean)
      )
    );
  }, [packageList]);

  const cities = useMemo(() => {
    return Array.from(new Set(packageList.map((pkg) => pkg.city))).filter(Boolean);
  }, [packageList]);

  const agencies = useMemo(() => {
    return Array.from(new Set(packageList.map((pkg) => pkg.agency))).filter(Boolean);
  }, [packageList]);

  const resetFilters = () => {
    setQuery("");
    setCity("");
    setMonth("");
    setSelectedType("Semua");
    setSearched(false);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-shade" />
        <div className="hero-content page-width">
          <div className="hero-top-badge">
            <span className="live-dot" />
            <span>MARKETPLACE UMRAH REALTIME TERVERIFIKASI KEMENAG</span>
          </div>

          <h1>
            Cari, Bandingkan &amp;<br />
            <span>Pesan Paket Umrah Impian</span>
          </h1>

          <p className="hero-subtext">
            Bandingkan harga, maskapai, hotel, dan fasilitas dari travel berizin resmi secara transparan dan aman langsung ke database resmi.
          </p>

          {/* Search Form */}
          <form
            className="search-panel"
            onSubmit={(event) => {
              event.preventDefault();
              setSearched(true);
              document.querySelector("#paket")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <label className="search-field">
              <span>TRAVEL / PAKET / HOTEL</span>
              <div>
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari nama paket, travel, atau hotel..."
                  aria-label="Cari paket atau travel"
                />
              </div>
            </label>

            <label className="search-field">
              <span>KOTA ASAL</span>
              <div>
                <MapPin size={16} />
                <select
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  aria-label="Pilih kota keberangkatan"
                >
                  <option value="">Semua Kota</option>
                  {cities.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="search-field">
              <span>BULAN KEBERANGKATAN</span>
              <div>
                <CalendarDays size={16} />
                <select
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  aria-label="Pilih bulan keberangkatan"
                >
                  <option value="">Semua Bulan</option>
                  {months.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <button className="button button-gold search-submit" type="submit">
              <Search size={16} />
              <span>Cari Paket</span>
            </button>
          </form>

          {/* Trust strip */}
          <div className="hero-trust">
            <span>
              <BadgeCheck size={16} /> Travel Berizin Resmi PPIU
            </span>
            <span>
              <CheckCircle2 size={16} /> Data &amp; Kuota Realtime
            </span>
            <span>
              <ShieldCheck size={16} /> Pembayaran Terverifikasi
            </span>
            {realtimeConnected && (
              <span className="hero-live-indicator">
                <span className="live-dot" /> Live Supabase
              </span>
            )}
          </div>
        </div>
        <div className="hero-bottom-rule" />
      </section>

      {/* Package Section */}
      <section id="paket" className="section page-width">
        <div className="section-heading">
          <div>
            <span className="eyebrow">KATALOG PERJALANAN IBADAH</span>
            <h2>{searched ? "Hasil Pencarian Paket" : "Pilihan Paket Umrah"}</h2>
            <p>Pilihan paket ibadah terbaik dengan transparansi harga dan fasilitas lengkap.</p>
          </div>
          <div className="heading-actions">
            {(query || city || month || selectedType !== "Semua") && (
              <button className="text-link reset-btn" onClick={resetFilters}>
                <RotateCcw size={14} /> Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Filter */}
        {packageTypes.length > 2 && (
          <div className="category-pills">
            {packageTypes.map((type) => (
              <button
                key={type}
                className={`category-pill${selectedType === type ? " active" : ""}`}
                onClick={() => setSelectedType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {packagesError && (
          <div className="error-notice" role="alert">
            {packagesError}
          </div>
        )}

        {/* Package Grid */}
        {packagesLoading ? (
          <div className="loading-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="package-card-skeleton">
                <div className="skeleton-cover" />
                <div className="skeleton-body">
                  <div className="skeleton-line short" />
                  <div className="skeleton-line title" />
                  <div className="skeleton-line price" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="package-grid">
            {filtered.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))}
          </div>
        ) : (
          <div className="empty-search">
            <Search size={36} />
            <h3>Paket tidak ditemukan</h3>
            <p>
              Tidak ada paket yang cocok dengan kriteria pencarian Anda. Coba hapus filter atau pilih kota/bulan lain.
            </p>
            <button className="button button-outline" onClick={resetFilters}>
              Tampilkan Semua Paket
            </button>
          </div>
        )}

        {/* Floating Compare Bar */}
        {compare.length > 0 && (
          <aside className="compare-floating" aria-label="Paket dibandingkan">
            <Scale size={18} />
            <span>
              <strong>{compare.length}</strong> paket dipilih
            </span>
            <Link className="button button-gold button-small" href="/compare">
              Bandingkan Sekarang <ArrowRight size={14} />
            </Link>
          </aside>
        )}
      </section>

      {/* Why Choose Us */}
      <section className="why-section" id="tentang">
        <div className="page-width">
          <div className="section-heading">
            <div>
              <span className="eyebrow">KEUNGGULAN UMRAHQU</span>
              <h2>Ibadah Tenang, Fasilitas Transparan</h2>
              <p>Membantu calon jemaah menemukan perjalanan umrah terbaik tanpa kekhawatiran.</p>
            </div>
          </div>
          <div className="benefit-grid">
            <article className="benefit-card">
              <span className="benefit-icon">
                <Scale size={22} />
              </span>
              <h3>Bandingkan Fasilitas &amp; Harga</h3>
              <p>
                Bandingkan maskapai, hotel, jarak ke Haram, dan jadwal hari secara berdampingan tanpa biaya tersembunyi.
              </p>
            </article>
            <article className="benefit-card">
              <span className="benefit-icon">
                <ShieldCheck size={22} />
              </span>
              <h3>Travel Berizin Resmi Kemenag</h3>
              <p>
                Semua mitra travel telah memiliki izin PPIU resmi, legalitas terdaftar, dan riwayat keberangkatan terpercaya.
              </p>
            </article>
            <article className="benefit-card">
              <span className="benefit-icon">
                <Sparkles size={22} />
              </span>
              <h3>Data &amp; Kuota Realtime</h3>
              <p>
                Informasi ketersediaan kursi, cashback, dan status pemesanan terhubung langsung ke database Supabase secara live.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Partner Strip */}
      <section className="partner-strip page-width" id="travel">
        <div className="partner-info">
          <span className="eyebrow">TRAVEL MITRA TERPERCAYA</span>
          <h2>Mitra Travel Resmi</h2>
          <p className="muted small">Penyelenggara perjalanan ibadah umrah yang terdaftar di UmrahQu.</p>
        </div>
        <div className="partner-logos">
          {agencies.length > 0 ? (
            agencies.map((agency) => (
              <div key={agency} className="partner-badge">
                <BadgeCheck size={15} />
                <span>{agency}</span>
              </div>
            ))
          ) : (
            <div className="partner-badge">
              <BadgeCheck size={15} />
              <span>An-Nahl Travel &amp; Tour Umroh</span>
            </div>
          )}
        </div>
        <Link className="button button-outline button-small" href="/travel/register">
          Daftarkan Travel Mitra <ArrowRight size={14} />
        </Link>
      </section>

      {/* Assurance Strip */}
      <section className="assurance-strip">
        <div className="page-width assurance-grid">
          <div>
            <ShieldCheck size={26} />
            <span>
              <b>Pembayaran Aman</b>
              <small>Rekening resmi berbadan hukum PT</small>
            </span>
          </div>
          <div>
            <BadgeCheck size={26} />
            <span>
              <b>Legalitas PPIU</b>
              <small>Izin Kemenag &amp; kepastian visa</small>
            </span>
          </div>
          <div>
            <Clock size={26} />
            <span>
              <b>Tracking Realtime</b>
              <small>Pantau progres verifikasi &amp; manasik</small>
            </span>
          </div>
          <div>
            <CheckCircle2 size={26} />
            <span>
              <b>Skema Cicilan &amp; DP</b>
              <small>Fleksibel bayar bertahap tanpa riba</small>
            </span>
          </div>
        </div>
      </section>

      {/* FAQ Banner */}
      <section className="faq-section page-width" id="faq">
        <div>
          <span className="eyebrow">BUTUH BANTUAN?</span>
          <h2>Mulai Perjalanan Ibadah Anda Hari Ini</h2>
          <p>Pilih paket yang sesuai, konsultasikan dengan fitur Tanya AI, dan pesan langsung dengan aman.</p>
        </div>
        <div className="faq-actions">
          <Link className="button button-primary" href="/#paket">
            Cari Paket Umrah <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
