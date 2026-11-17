# UmrahQu

Marketplace paket umroh berbasis Next.js App Router, React, TypeScript, dan Supabase.

## Menjalankan aplikasi

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Katalog tidak memakai paket contoh atau fallback lokal; paket hanya muncul jika tersedia di database Supabase. Autentikasi, pemesanan, sinkronisasi akun, dan unggah bukti pembayaran juga memerlukan Supabase.

## Menyiapkan Supabase

1. Salin `.env.example` menjadi `.env.local`.
2. Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dari pengaturan API proyek Supabase. Untuk proyek lama, `NEXT_PUBLIC_SUPABASE_ANON_KEY` masih didukung.
3. Jalankan isi `supabase/schema.sql` melalui Supabase SQL Editor. Skrip membuat tabel, row-level security, bucket privat, dan mengaktifkan tabel `packages` untuk Supabase Realtime. Skrip ini tidak mengisi produk.
4. Aktifkan autentikasi Email di Supabase Authentication. Buat akun lalu masuk sebelum membuat pesanan atau mengunggah bukti pembayaran.

Untuk mengisi katalog awal pratinjau, jalankan `supabase/seed.sql` setelah skema. Seed ini membuat delapan paket **data contoh** yang diberi label jelas dan tidak dapat dipesan. Hapus atau ganti semua baris `is_demo = true` sebelum peluncuran. Untuk data nyata, masukkan penawaran travel yang sudah diverifikasi melalui Supabase Table Editor pada tabel `packages`; isi nama paket/travel, harga, tanggal keberangkatan, maskapai, hotel, kuota/kursi, foto, fasilitas, dan itinerary, lalu pastikan `active = true` dan `is_demo = false`. Aplikasi membaca katalog langsung dari Supabase dan memperbaruinya melalui Realtime.

Tabel `bookings` dan `wishlist` dibatasi berdasarkan `auth.uid()`. Kunci `service_role` tidak digunakan di browser. Bukti transfer masuk ke bucket privat `payment-proofs` dengan batas ukuran 5 MB.

## Pemeriksaan

```bash
npm run typecheck
npm run lint
npm run build
```
