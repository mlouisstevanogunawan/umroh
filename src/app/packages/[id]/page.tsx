"use client";

import { useParams } from "next/navigation";
import { PackageDetail } from "@/components/package-detail";
import { useStore } from "@/lib/store";

export default function PackagePage() {
  const { id } = useParams<{ id: string }>();
  const { packages, packagesLoading, packagesError } = useStore();
  const pkg = packages.find((item) => item.id === id);
  if (packagesLoading) return <div className="page-width not-found"><h1>Memuat paket...</h1><p>Mengambil detail paket terbaru dari Supabase.</p></div>;
  if (!pkg) return <div className="page-width not-found"><h1>Paket tidak tersedia</h1><p>{packagesError || "Paket ini tidak ada atau sudah tidak aktif."}</p></div>;
  return <PackageDetail pkg={pkg} />;
}
