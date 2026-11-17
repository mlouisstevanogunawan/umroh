"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Scale, Star, Trash2, X } from "lucide-react";
import { formatRupiah, type UmrahPackage } from "@/lib/packages";
import { useStore } from "@/lib/store";

export default function ComparePage() {
  const { packages, compare, toggleCompare, packagesLoading } = useStore();
  const selected = packages.filter((pkg) => compare.includes(pkg.id));

  const rows: { label: string; value: (pkg: UmrahPackage) => ReactNode }[] = [
    {
      label: "Harga Paket",
      value: (pkg) => (
        <strong className="compare-price">
          {formatRupiah(pkg.price)} <small>/orang</small>
        </strong>
      ),
    },
    {
      label: "Cashback Jemaah",
      value: (pkg) =>
        pkg.cashback > 0 ? (
          <span className="cashback-pill">✦ {formatRupiah(pkg.cashback)}</span>
        ) : (
          <span className="muted">—</span>
        ),
    },
    { label: "Kategori Perjalanan", value: (pkg) => <span className="type-tag">{pkg.type}</span> },
    { label: "Durasi Ibadah", value: (pkg) => <b>{pkg.duration} Hari</b> },
    { label: "Tanggal Berangkat", value: (pkg) => pkg.departure },
    { label: "Kota Keberangkatan", value: (pkg) => pkg.city },
    { label: "Maskapai Penerbangan", value: (pkg) => pkg.airline },
    { label: "Hotel Makkah", value: (pkg) => pkg.hotelMakkah },
    { label: "Hotel Madinah", value: (pkg) => pkg.hotelMadinah },
    {
      label: "Kelas Hotel",
      value: (pkg) => (
        <span className="stars">
          {Array.from({ length: pkg.stars }, (_, i) => (
            <Star key={i} size={14} fill="currentColor" />
          ))}
        </span>
      ),
    },
    {
      label: "Ketersediaan Kursi",
      value: (pkg) => (
        <span>
          <strong>{pkg.seats}</strong> / {pkg.quota} kursi
        </span>
      ),
    },
    {
      label: "Fasilitas Utama",
      value: (pkg) => (
        <span>
          {pkg.facilities.slice(0, 3).join(", ")}
          {pkg.facilities.length > 3 ? "…" : ""}
        </span>
      ),
    },
  ];

  return (
    <div className="page-width compare-page tab-fade-in">
      <div className="page-title">
        <div className="title-icon">
          <Scale size={22} />
        </div>
        <div>
          <h1>Bandingkan Paket Umrah</h1>
          <p>Pilih dan bandingkan fasilitas, maskapai, dan harga paket secara berdampingan.</p>
        </div>
      </div>

      <div className="compare-count">
        <span>
          <strong>{selected.length}</strong> dari 3 paket dipilih
        </span>
        {selected.length > 0 && (
          <button
            className="text-link reset-compare-btn"
            onClick={() => {
              selected.forEach((p) => toggleCompare(p.id));
            }}
          >
            <Trash2 size={13} /> Kosongkan Semua
          </button>
        )}
      </div>

      {selected.length > 0 ? (
        <div className="compare-scroll">
          <div className="compare-board">
            <div className="compare-label-top">Detail Perjalanan</div>
            {selected.map((pkg) => (
              <div className="compare-package-head" key={pkg.id}>
                <button
                  className="remove-compare"
                  onClick={() => toggleCompare(pkg.id)}
                  aria-label="Hapus paket"
                  title="Hapus dari perbandingan"
                >
                  <X size={15} />
                </button>
                <div className="compare-image" style={{ backgroundImage: `url("${pkg.image}")` }} />
                <span className="type-tag">{pkg.type}</span>
                <Link href={`/packages/${pkg.id}`} className="compare-title">
                  <b>{pkg.name}</b>
                </Link>
                <small className="muted">{pkg.agency}</small>
                <Link className="button button-primary button-small button-full" href={`/booking/${pkg.id}`}>
                  Pesan Paket Ini
                </Link>
              </div>
            ))}

            {selected.length < 3 &&
              Array.from({ length: 3 - selected.length }, (_, index) => (
                <Link className="compare-add" href="/#paket" key={index}>
                  <span>+</span>
                  <b>Tambah Paket</b>
                  <small className="muted">Pilih dari katalog paket</small>
                </Link>
              ))}

            {rows.map((row) => (
              <div className="compare-row" key={row.label}>
                <b>{row.label}</b>
                {selected.map((pkg) => (
                  <div key={pkg.id}>{row.value(pkg)}</div>
                ))}
                {Array.from({ length: 3 - selected.length }, (_, index) => (
                  <div key={index} className="compare-empty-cell">
                    —
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-compare card">
          <Scale size={36} />
          <h2>{packagesLoading ? "Memuat katalog paket..." : "Belum ada paket yang dibandingkan"}</h2>
          <p>
            {packagesLoading
              ? "Menghubungkan ke database Supabase..."
              : "Pilih hingga 3 paket umrah dari katalog untuk melihat perbandingan fasilitas dan harganya."}
          </p>
          <Link className="button button-primary" href="/#paket">
            Pilih Paket Umrah <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}
