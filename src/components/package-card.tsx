"use client";

import Link from "next/link";
import { ArrowRight, Heart, Scale, Sparkles, Star, Users } from "lucide-react";
import type { UmrahPackage } from "@/lib/packages";
import { formatRupiah } from "@/lib/packages";
import { useStore } from "@/lib/store";

export function PackageCard({ pkg }: { pkg: UmrahPackage }) {
  const { wishlist, compare, toggleWishlist, toggleCompare } = useStore();
  const saved = wishlist.includes(pkg.id);
  const selected = compare.includes(pkg.id);

  const percentage = Math.min(100, Math.max(5, Math.round((pkg.seats / pkg.quota) * 100)));

  return (
    <article className="package-card">
      <div className="package-cover-wrap">
        <div
          className="package-cover"
          style={{ backgroundImage: `url("${pkg.image}")` }}
          role="img"
          aria-label={pkg.name}
        />
        <span className="cover-tag">{pkg.type}</span>
        <div className="cover-actions">
          <button
            className={`round-action${saved ? " active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              toggleWishlist(pkg.id);
            }}
            aria-label={saved ? "Hapus dari daftar keinginan" : "Simpan ke daftar keinginan"}
            title={saved ? "Tersimpan di Wishlist" : "Simpan ke Wishlist"}
          >
            <Heart size={16} fill={saved ? "currentColor" : "none"} />
          </button>
          <button
            className={`round-action${selected ? " active" : ""}`}
            disabled={!selected && compare.length >= 3}
            title={!selected && compare.length >= 3 ? "Maksimal 3 paket dibandingkan" : selected ? "Hapus dari perbandingan" : "Bandingkan paket ini"}
            onClick={(e) => {
              e.preventDefault();
              toggleCompare(pkg.id);
            }}
            aria-label={selected ? "Hapus dari perbandingan" : "Bandingkan paket"}
          >
            <Scale size={16} />
          </button>
        </div>
      </div>

      <div className="package-card-body">
        <div className="agency-line">
          <span className="agency-name">{pkg.agency}</span>
          <span className="dot-divider">·</span>
          <span className="agency-city">{pkg.city}</span>
        </div>

        <Link href={`/packages/${pkg.id}`} className="package-title" title={pkg.name}>
          {pkg.name}
        </Link>

        <div className="price-line">
          <strong>{formatRupiah(pkg.price)}</strong>
          <span>/orang</span>
        </div>

        <div className="package-meta">
          <span className="meta-duration">{pkg.duration} Hari</span>
          <span className="meta-stars">
            {pkg.stars} <Star size={12} fill="currentColor" />
          </span>
          <span className="meta-airline">{pkg.airline.split(" ")[0]}</span>
        </div>

        <div className="seat-line">
          <span><Users size={12} /> Sisa Kursi</span>
          <span className="seat-count"><strong>{pkg.seats}</strong> / {pkg.quota}</span>
        </div>

        <div className="seat-meter">
          <span
            style={{ width: `${percentage}%` }}
            className={percentage < 30 ? "meter-low" : percentage < 60 ? "meter-med" : "meter-ok"}
          />
        </div>

        {pkg.cashback > 0 && (
          <div className="cashback-pill">
            <Sparkles size={11} />
            <span>Cashback {formatRupiah(pkg.cashback)}</span>
          </div>
        )}

        <Link className="card-link" href={`/packages/${pkg.id}`}>
          <span>Detail Paket</span>
          <ArrowRight size={14} className="card-link-arrow" />
        </Link>
      </div>
    </article>
  );
}
