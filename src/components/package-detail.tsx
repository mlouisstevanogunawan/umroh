"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  Heart,
  Hotel,
  MapPin,
  Plane,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import type { UmrahPackage } from "@/lib/packages";
import { formatRupiah } from "@/lib/packages";
import { useStore } from "@/lib/store";

export function PackageDetail({ pkg }: { pkg: UmrahPackage }) {
  const { wishlist, compare, toggleWishlist, toggleCompare } = useStore();
  const [tab, setTab] = useState("Ringkasan");

  const isSaved = wishlist.includes(pkg.id);
  const isCompared = compare.includes(pkg.id);
  const seatPercentage = Math.min(100, Math.max(5, Math.round((pkg.seats / pkg.quota) * 100)));

  return (
    <div className="page-width detail-page">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs" aria-label="Jejak navigasi">
        <Link href="/">Beranda</Link>
        <span>/</span>
        <Link href="/#paket">Katalog Paket</Link>
        <span>/</span>
        <b>{pkg.name}</b>
      </nav>

      <div className="detail-grid">
        {/* Main Details Column */}
        <div className="detail-main">
          {/* Main Cover Banner */}
          <div className="detail-cover" style={{ backgroundImage: `url("${pkg.image}")` }}>
            <div className="detail-cover-label">
              <BadgeCheck size={14} /> {pkg.type} · {pkg.agency}
            </div>
            <div className="cover-actions">
              <button
                className={`round-action${isSaved ? " active" : ""}`}
                onClick={() => toggleWishlist(pkg.id)}
                aria-label={isSaved ? "Hapus dari wishlist" : "Simpan ke wishlist"}
                title={isSaved ? "Tersimpan di wishlist" : "Simpan ke wishlist"}
              >
                <Heart size={18} fill={isSaved ? "currentColor" : "none"} />
              </button>
              <button
                className={`round-action${isCompared ? " active" : ""}`}
                disabled={!isCompared && compare.length >= 3}
                onClick={() => toggleCompare(pkg.id)}
                aria-label="Bandingkan paket"
                title={isCompared ? "Hapus perbandingan" : "Bandingkan paket"}
              >
                <Scale size={18} />
              </button>
            </div>
            <span className="photo-count">Foto Dokumentasi Tanah Suci</span>
          </div>

          {/* Tabbed Content Card */}
          <div className="card detail-info">
            <div className="detail-tabs">
              {["Ringkasan", "Itinerary", "Fasilitas & Hotel", "Ulasan"].map((item) => (
                <button
                  key={item}
                  className={tab === item ? "selected" : ""}
                  onClick={() => setTab(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            {tab === "Ringkasan" && (
              <div className="detail-tab-content tab-fade-in">
                <p className="detail-description">{pkg.description}</p>
                <div className="detail-facts">
                  <div>
                    <span><Plane size={13} /> MASKAPAI</span>
                    <b>{pkg.airline}</b>
                  </div>
                  <div>
                    <span><CalendarDays size={13} /> DURASI</span>
                    <b>{pkg.duration} Hari Perjalanan</b>
                  </div>
                  <div>
                    <span><CalendarDays size={13} /> TANGGAL BERANGKAT</span>
                    <b>{pkg.departure}</b>
                  </div>
                  <div>
                    <span><Hotel size={13} /> HOTEL MAKKAH</span>
                    <b>{pkg.hotelMakkah}</b>
                  </div>
                  <div>
                    <span><Hotel size={13} /> HOTEL MADINAH</span>
                    <b>{pkg.hotelMadinah}</b>
                  </div>
                  <div>
                    <span><MapPin size={13} /> KOTA ASAL</span>
                    <b>{pkg.city}</b>
                  </div>
                </div>

                <h4>FASILITAS UTAMA</h4>
                <div className="facility-list">
                  {pkg.facilities.map((facility) => (
                    <span key={facility}>
                      <Check size={13} /> {facility}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {tab === "Itinerary" && (
              <div className="detail-tab-content itinerary tab-fade-in">
                {pkg.itinerary.length ? (
                  pkg.itinerary.map((day, index) => (
                    <div key={`${index}-${day}`} className="itinerary-step">
                      <div className="step-circle">{index + 1}</div>
                      <div className="step-content">
                        <b>{day.split(":")[0] || `Hari ${index + 1}`}</b>
                        <p>{day.includes(":") ? day.split(":").slice(1).join(":") : day}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">Travel belum menambahkan rincian itinerary harian.</p>
                )}
              </div>
            )}

            {tab === "Fasilitas & Hotel" && (
              <div className="detail-tab-content tab-fade-in">
                <div className="hotels-highlight">
                  <div className="hotel-box">
                    <span className="hotel-city">MAKKAH AL-MUKARRAMAH</span>
                    <b>{pkg.hotelMakkah}</b>
                    <span className="hotel-stars">
                      {Array.from({ length: pkg.stars }).map((_, i) => (
                        <Star key={i} size={14} fill="currentColor" />
                      ))}
                    </span>
                    <p className="muted small">Akses sangat mudah menuju pelataran Masjidil Haram.</p>
                  </div>
                  <div className="hotel-box">
                    <span className="hotel-city">MADINAH AL-MUNAWWARAH</span>
                    <b>{pkg.hotelMadinah}</b>
                    <span className="hotel-stars">
                      {Array.from({ length: pkg.stars }).map((_, i) => (
                        <Star key={i} size={14} fill="currentColor" />
                      ))}
                    </span>
                    <p className="muted small">Dekat dengan gerbang utama dan Raudhah Asy-Syarifah.</p>
                  </div>
                </div>

                <h4>SEMUA FASILITAS TERMASUK</h4>
                <div className="facility-checks">
                  {pkg.facilities.map((facility) => (
                    <span key={facility}>
                      <CheckCircle2 size={15} /> {facility}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {tab === "Ulasan" && (
              <div className="detail-tab-content empty-review tab-fade-in">
                <Star size={34} className="star-lead" />
                <h3>Ulasan Jemaah An-Nahl</h3>
                <p>
                  Paket ini memiliki kepuasan jemaah 4.9/5 dari rombongan keberangkatan sebelumnya.
                  Ulasan resmi terverifikasi saat kepulangan jemaah ke Tanah Air.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Column */}
        <aside className="detail-aside">
          {/* Price & Booking Card */}
          <div className="card price-card">
            <span className="type-tag">{pkg.type}</span>
            <h1>{pkg.name}</h1>
            <div className="detail-price">
              {formatRupiah(pkg.price)} <small>/orang</small>
            </div>

            {pkg.cashback > 0 && (
              <div className="cashback-pill">
                <Sparkles size={12} />
                <span>Cashback {formatRupiah(pkg.cashback)}</span>
              </div>
            )}

            <div className="seat-line">
              <span><Users size={14} /> Ketersediaan Kursi</span>
              <span><strong>{pkg.seats}</strong> / {pkg.quota} kursi</span>
            </div>
            <div className="seat-meter">
              <span style={{ width: `${seatPercentage}%` }} />
            </div>

            <div className="price-facts">
              <span><CalendarDays size={14} /> Keberangkatan</span>
              <b>{pkg.departure}</b>
              <span><MapPin size={14} /> Kota asal</span>
              <b>{pkg.city}</b>
              <span><Plane size={14} /> Maskapai</span>
              <b>{pkg.airline}</b>
            </div>

            <Link href={`/booking/${pkg.id}`} className="button button-primary button-full">
              Pesan Sekarang <ArrowRight size={16} />
            </Link>

            <button
              className="button button-outline button-full"
              disabled={!isCompared && compare.length >= 3}
              onClick={() => toggleCompare(pkg.id)}
            >
              {isCompared
                ? "Hapus dari Perbandingan"
                : compare.length >= 3
                ? "Maksimal 3 Paket"
                : "Bandingkan Paket"}
            </button>

            <small className="muted text-center payment-hint">
              <CreditCard size={13} /> Pembayaran aman via BSI, Mandiri, BCA atau Cicilan
            </small>
          </div>

          {/* Agency Card */}
          <div className="card agency-card">
            <span className="agency-emblem">✦</span>
            <div>
              <span className="muted small">Penyelenggara Resmi PPIU</span>
              <b>{pkg.agency}</b>
              <small className="muted">Mitra Terverifikasi Kemenag</small>
            </div>
            <BadgeCheck className="verified-icon" size={20} />
          </div>

          {/* Safety Card */}
          <div className="card safety-card">
            <h3><ShieldCheck size={16} /> JAMINAN 5 PASTI UMRAH</h3>
            <p><Check size={14} /> Pasti Travel Berizin Resmi</p>
            <p><Check size={14} /> Pasti Jadwal &amp; Tiket Pesawat</p>
            <p><Check size={14} /> Pasti Hotel &amp; Akomodasi</p>
            <p><Check size={14} /> Pasti Visa &amp; Legalitas</p>
          </div>

          <Link className="back-link" href="/">
            <ArrowLeft size={14} /> Kembali ke Katalog Paket
          </Link>
        </aside>
      </div>
    </div>
  );
}
