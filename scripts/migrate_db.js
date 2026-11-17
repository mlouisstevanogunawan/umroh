const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.shgbbwevvislnfqswutc:sayangnia1122@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres'
});

async function run() {
  await client.connect();
  console.log('Connected to DB');

  // 1. Update bookings constraints and policies
  console.log('Updating bookings schema...');
  await client.query(`
    -- Allow user_id to be nullable for guest checkout if desired
    alter table public.bookings alter column user_id drop not null;

    -- Update status check constraint to include 'Lunas'
    alter table public.bookings drop constraint if exists bookings_status_check;
    alter table public.bookings add constraint bookings_status_check
      check (status in ('Menunggu', 'Diproses', 'Dikonfirmasi', 'Lunas', 'Selesai', 'Dibatalkan'));

    -- Allow anon and authenticated to view bookings (for tracking by code and user dashboard)
    grant select on public.bookings to anon, authenticated;
    grant insert on public.bookings to anon, authenticated;
    grant update on public.bookings to anon, authenticated;

    drop policy if exists "Anyone can track booking by code" on public.bookings;
    create policy "Anyone can track booking by code"
      on public.bookings for select
      using (true);

    drop policy if exists "Anyone can create booking" on public.bookings;
    create policy "Anyone can create booking"
      on public.bookings for insert
      to anon, authenticated
      with check (true);

    drop policy if exists "Users can update own bookings" on public.bookings;
    create policy "Users can update own bookings"
      on public.bookings for update
      using (true)
      with check (true);
  `);

  // 2. Create notifications table
  console.log('Creating notifications table...');
  await client.query(`
    create table if not exists public.notifications (
      id uuid primary key default gen_random_uuid(),
      user_id uuid references auth.users(id) on delete cascade,
      title text not null,
      message text not null,
      category text not null default 'info',
      link text,
      read boolean not null default false,
      created_at timestamptz not null default now()
    );

    alter table public.notifications enable row level security;
    grant select, update, insert on public.notifications to anon, authenticated;

    drop policy if exists "Anyone can read notifications" on public.notifications;
    create policy "Anyone can read notifications"
      on public.notifications for select
      using (true);

    drop policy if exists "Anyone can update notifications read state" on public.notifications;
    create policy "Anyone can update notifications read state"
      on public.notifications for update
      using (true)
      with check (true);
  `);

  // 3. Setup publication
  console.log('Setting up supabase_realtime publication...');
  await client.query(`
    do $$
    begin
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
        alter publication supabase_realtime add table public.notifications;
      end if;
    end;
    $$;
    alter table public.notifications replica identity full;
  `);

  // 4. Clean old demo packages
  console.log('Cleaning old demo packages and updating real packages...');
  await client.query(`delete from public.packages where is_demo = true or id like 'demo-%';`);

  // 5. Insert real Umrah packages
  const realPackages = [
    {
      id: 'annahl-plus-turki-12h',
      name: 'Umrah Plus Turki 12 Hari Golden Tulip',
      agency: 'An-Nahl Travel & Tour Umroh',
      price: 38500000,
      cashback: 1000000,
      duration: 12,
      departure: '15 Januari 2027',
      city: 'Surabaya',
      airline: 'Turkish Airlines',
      hotel_makkah: 'Fairmont Makkah Clock Royal Tower',
      hotel_madinah: 'Anwar Al Madinah Mövenpick Hotel',
      stars: 5,
      quota: 40,
      seats: 32,
      type: 'Plus Turki',
      image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1200&q=85',
      description: 'Paket perjalanan ibadah umrah premium berdurasi 12 hari yang memadukan kekhusyukan ibadah di Tanah Suci Makkah & Madinah dengan napak tilas sejarah kejayaan Islam di Istanbul dan Bursa, Turki. Menginap di hotel bintang 5 persis di depan pelataran Masjidil Haram dan Masjid Nabawi.',
      facilities: JSON.stringify([
        'Tiket Pesawat PP Turkish Airlines Surabaya - Istanbul - Madinah',
        'Hotel Bintang 5 Pelataran Haram (Fairmont & Mövenpick)',
        'Makan 3x Sehari Fullboard Menu Nusantara & Turki',
        'Visa Umrah Resmi & Asuransi Perjalanan Syariah',
        'Bus Pariwisata AC Eksekutif Mercedes-Benz',
        'Pembimbing Ibadah (Muthawwif) Berpengalaman',
        'City Tour Istanbul, Hagia Sophia & Bosphorus Cruise',
        'Air Zamzam 5 Liter Resmi & Koper Fiber Eksklusif'
      ]),
      itinerary: JSON.stringify([
        'Hari 1: Keberangkatan dari Bandara Juanda (SUB) menuju Istanbul (IST)',
        'Hari 2: Tiba di Istanbul, City Tour Blue Mosque, Hagia Sophia & Bosphorus Cruise, terbang menuju Madinah',
        'Hari 3: Ziarah Raudhah, Makam Rasulullah SAW dan salat sunnah di Masjid Nabawi',
        'Hari 4: Ziarah Kota Madinah: Masjid Quba, Jabal Uhud, Masjid Qiblatain dan Kebun Kurma',
        'Hari 5: Persiapan ihram, miqat di Bir Ali, Kereta Cepat Haramain ke Makkah & Umrah pertama',
        'Hari 6: Tawaf sunnah, tadarus dan memperbanyak ibadah wajib di Masjidil Haram',
        'Hari 7: Ziarah Makkah: Jabal Tsur, Padang Arafah, Jabal Rahmah, Muzdalifah dan Mina',
        'Hari 8: Pelaksanaan Umrah kedua (Badal/Sunnah) miqat di Ji\'ranah',
        'Hari 9: Tawaf Wada\' dan persiapan check-out hotel Makkah',
        'Hari 10: Bertolak ke Jeddah, City Tour Corniche & Balad Shopping',
        'Hari 11: Penerbangan kepulangan menuju Tanah Air',
        'Hari 12: Mendarat dengan selamat di Bandara Juanda Surabaya'
      ]),
      is_demo: false,
      active: true
    },
    {
      id: 'annahl-plus-desember-9h',
      name: 'Umrah Plus An-Nahl Akhir Tahun 9 Hari',
      agency: 'An-Nahl Travel & Tour Umroh',
      price: 35000000,
      cashback: 750000,
      duration: 9,
      departure: '24 Desember 2026',
      city: 'Jakarta',
      airline: 'Saudia Airlines (Direct Madinah)',
      hotel_makkah: 'Pullman Zamzam Makkah',
      hotel_madinah: 'Madinah Hilton',
      stars: 5,
      quota: 35,
      seats: 29,
      type: 'Premium',
      image: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1200&q=85',
      description: 'Perjalanan ibadah umrah akhir tahun penuh berkah bersama An-Nahl Travel. Penerbangan langsung tanpa transit menuju Madinah dengan Saudia Airlines, fasilitas hotel bintang 5 di pelataran Masjidil Haram dan Nabawi, serta bimbingan manasik intensif.',
      facilities: JSON.stringify([
        'Penerbangan Langsung Saudia Airlines Jakarta - Madinah PP',
        'Akomodasi Hotel Bintang 5 (Pullman Zamzam & Madinah Hilton)',
        'Fullboard Catering Menu Indonesia 3x Sehari',
        'Transportasi Bus VIP AC Selama di Arab Saudi',
        'Handling Bandara & Fast Track Saudi',
        'Koper Hardcase Fiber, Kain Ihram/Bergo, Tas Paspor',
        'Air Zamzam 5 Liter Resmi',
        'Ziarah Lengkap Makkah dan Madinah'
      ]),
      itinerary: JSON.stringify([
        'Hari 1: Berkumpul di Lounge Bandara Soekarno-Hatta (CGK), penerbangan direct menuju Madinah (MED)',
        'Hari 2: Tiba di Madinah, istirahat dan salat berjamaah di Masjid Nabawi',
        'Hari 3: Ziarah Raudhah Asy-Syarifah didampingi Muthawwifah & ziarah Makam Rasulullah SAW',
        'Hari 4: Miqat di Bir Ali, perjalanan darat ke Makkah & pelaksanaan Umrah pertama',
        'Hari 5: Memperbanyak ibadah, iktikaf dan salat berjamaah di Masjidil Haram',
        'Hari 6: Ziarah Kota Makkah (Jabal Tsur, Arafah, Muzdalifah, Mina) & Umrah kedua dari Tan\'im',
        'Hari 7: Ibadah mandiri dan tawaf sunnah bersama pembimbing',
        'Hari 8: Tawaf Wada\', check-out hotel menuju Jeddah, City Tour & penerbangan kembali',
        'Hari 9: Tiba di Bandara Soekarno-Hatta Jakarta dengan membawa umrah mabrur'
      ]),
      is_demo: false,
      active: true
    },
    {
      id: 'annahl-reguler-awal-tahun-9h',
      name: 'Umrah Reguler Awal Tahun Barakah 9 Hari',
      agency: 'An-Nahl Travel & Tour Umroh',
      price: 26500000,
      cashback: 500000,
      duration: 9,
      departure: '10 Februari 2027',
      city: 'Surabaya',
      airline: 'Lion Air Premium Charter',
      hotel_makkah: 'Al Kiswah Towers Hotel',
      hotel_madinah: 'Grand Plaza Madinah',
      stars: 4,
      quota: 45,
      seats: 42,
      type: 'Reguler',
      image: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1200&q=85',
      description: 'Pilihan umrah hemat dengan fasilitas bintang 4 yang sangat nyaman dan terjangkau. Dilengkapi shuttle bus 24 jam gratis langsung ke pelataran Masjidil Haram, pembimbing ibadah lulusan Universitas Islam Madinah, dan sajian prasmanan Nusantara.',
      facilities: JSON.stringify([
        'Tiket Pesawat PP Surabaya - Jeddah',
        'Hotel Bintang 4 di Makkah (Shuttle 24 Jam) & Madinah',
        'Makan Prasmanan 3x Sehari Masakan Khas Nusantara',
        'Free Wifi di Bus dan Hotel',
        'Visa Umrah & Asuransi Perjalanan',
        'Buku Doa, Tasbih Digital, Kain Ihram/Mukena & Koper',
        'Air Zamzam 5 Liter Resmi',
        'Bimbingan Manasik Sebelum Keberangkatan'
      ]),
      itinerary: JSON.stringify([
        'Hari 1: Berangkat dari Bandara Juanda Surabaya menuju Bandara King Abdulaziz Jeddah',
        'Hari 2: Mengambil miqat di Yalamlam/Jeddah, tiba di Makkah dan ibadah Umrah wajib',
        'Hari 3: Istirahat, tawaf sunnah dan ibadah rutin di Masjidil Haram',
        'Hari 4: Ziarah bersejarah Makkah (Jabal Rahmah, Padang Arafah) & Umrah kedua dari Ji\'ranah',
        'Hari 5: Check-out Makkah, bertolak menuju Kota Madinah Al-Munawwarah',
        'Hari 6: Ziarah Raudhah dan salat berjamaah di Masjid Nabawi',
        'Hari 7: Ziarah Kota Madinah: Masjid Quba, Kebun Kurma, Jabal Uhud',
        'Hari 8: Tawaf Wada\' dan persiapan kepulangan via Bandara Madinah',
        'Hari 9: Mendarat di Surabaya dengan membawa keberkahan ibadah'
      ]),
      is_demo: false,
      active: true
    },
    {
      id: 'annahl-januari-sidoarjo-10h',
      name: 'Umrah Plus Januari Kereta Cepat 10 Hari',
      agency: 'An-Nahl Travel Cabang Sidoarjo',
      price: 38000000,
      cashback: 1000000,
      duration: 10,
      departure: '18 Januari 2027',
      city: 'Surabaya',
      airline: 'Garuda Indonesia',
      hotel_makkah: 'Swissôtel Al Maqam Makkah',
      hotel_madinah: 'Dallah Taibah Hotel',
      stars: 5,
      quota: 30,
      seats: 25,
      type: 'VIP',
      image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1200&q=85',
      description: 'Paket umrah eksklusif 10 hari keberangkatan dari Bandara Juanda Surabaya bersama maskapai bintang lima Garuda Indonesia. Nikmati perjalanan darat Makkah - Madinah menggunakan Kereta Cepat Haramain High Speed Railway (HHR) berkecepatan 300 km/jam.',
      facilities: JSON.stringify([
        'Tiket PP Garuda Indonesia direct Surabaya - Jeddah',
        'Tiket Kereta Cepat Haramain Express Makkah - Madinah',
        'Akomodasi Hotel Bintang 5 Tower Pelataran Haram',
        'Konsumsi Fullboard 3x Sehari Hotel Bintang 5',
        'Muthawwif Khusus & Tour Leader Pendamping dari Surabaya',
        'Perlengkapan Umrah Eksklusif & Koper Koper Fiber 28 Inch',
        'Asuransi Perjalanan Syariah & Visa Umrah Resmi',
        'Air Zamzam 5 Liter'
      ]),
      itinerary: JSON.stringify([
        'Hari 1: Bertolak dari Surabaya menuju Jeddah bersama Garuda Indonesia, tiba dan langsung Umrah pertama',
        'Hari 2: Istirahat di Swissôtel Al Maqam, ibadah rutin di Masjidil Haram',
        'Hari 3: Ziarah Makkah Mukarramah: Gua Hira (Jabal Nur), Gua Tsur, Arafah & Mina',
        'Hari 4: Hari tenang, kajian fikih umrah dan iktikaf di Masjidil Haram',
        'Hari 5: Naik Kereta Cepat Haramain menuju Madinah Al-Munawwarah hanya 2 jam',
        'Hari 6: Check-in Dallah Taibah Madinah, ibadah dan ziarah Makam Rasulullah SAW',
        'Hari 7: Masuk Raudhah Asy-Syarifah dengan tasreh resmi dan salat Arbain',
        'Hari 8: Wisata sejarah Madinah: Masjid Quba, Khandaq dan Pasar Kurma',
        'Hari 9: Tawaf Wada\' dan bertolak ke Bandara Madinah',
        'Hari 10: Tiba di Bandara Juanda Surabaya dengan selamat'
      ]),
      is_demo: false,
      active: true
    },
    {
      id: 'annahl-ramadhan-lailatulqadar-16h',
      name: 'Umrah Ramadhan Itikaf Lailatul Qadar 16 Hari',
      agency: 'An-Nahl Travel & Tour Umroh',
      price: 49500000,
      cashback: 1500000,
      duration: 16,
      departure: '20 Maret 2027',
      city: 'Jakarta',
      airline: 'Saudia Airlines',
      hotel_makkah: 'Makkah Clock Royal Tower (Fairmont)',
      hotel_madinah: 'Anwar Al Madinah Mövenpick',
      stars: 5,
      quota: 30,
      seats: 18,
      type: 'Ramadhan',
      image: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1200&q=85',
      description: 'Rasakan nikmatnya beribadah umrah di sepuluh malam terakhir bulan suci Ramadhan, meraih pahala seperti berhaji bersama Rasulullah SAW. Mengikuti salat Tarawih, Tahajud berjamaah, dan itikaf di Masjidil Haram dengan sajian sahur & berbuka puasa prasmanan bintang 5.',
      facilities: JSON.stringify([
        'Tiket Saudia Airlines PP Jakarta - Madinah / Jeddah - Jakarta',
        'Hotel Bintang 5 Pelataran Masjidil Haram (Fairmont Clock Tower)',
        'Sajian Sahur dan Iftar Buffet Spesial Ramadhan',
        'Bimbingan Iktikaf dan Kajian Malam Ramadhan',
        'Visa Umrah Ramadhan Resmi & Asuransi Syariah',
        'Handling Eksklusif & Bagasi 2x23kg',
        'Air Zamzam 5 Liter Resmi'
      ]),
      itinerary: JSON.stringify([
        'Hari 1: Keberangkatan CGK menuju Madinah, check-in hotel dan buka puasa bersama',
        'Hari 2-4: Ibadah Ramadhan di Masjid Nabawi, salat tarawih dan ziarah Raudhah',
        'Hari 5: Miqat di Bir Ali, berangkat ke Makkah dengan Bus VIP dan ibadah Umrah',
        'Hari 6-13: Iktikaf 10 malam terakhir Ramadhan di Masjidil Haram, berburu Lailatul Qadar',
        'Hari 14: Salat Idul Fitri di Masjidil Haram dengan suasana haru dan syahdu',
        'Hari 15: Tawaf Wada\' dan menuju Bandara Jeddah',
        'Hari 16: Tiba di Jakarta dengan jiwa yang kembali suci'
      ]),
      is_demo: false,
      active: true
    },
    {
      id: 'annahl-keluarga-nyaman-10h',
      name: 'Umrah Keluarga Nyaman & Ramah Lansia 10 Hari',
      agency: 'An-Nahl Travel & Tour Umroh',
      price: 33500000,
      cashback: 800000,
      duration: 10,
      departure: '12 Mei 2027',
      city: 'Jakarta',
      airline: 'Emirates Airlines',
      hotel_makkah: 'Mövenpick Hotel Hajar Tower Makkah',
      hotel_madinah: 'Al Rawda Royal Inn',
      stars: 4,
      quota: 35,
      seats: 28,
      type: 'Keluarga',
      image: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1200&q=85',
      description: 'Dirancang khusus bagi keluarga yang membawa orang tua (lansia) atau anak-anak. Mengutamakan jarak hotel yang sangat dekat tanpa tanjakan (0 meter dari pelataran), pendampingan medis, ketersediaan kursi roda, serta tempo ziarah yang tenang.',
      facilities: JSON.stringify([
        'Tiket Pesawat PP Emirates Airlines Jakarta - Jeddah',
        'Kamar Family Suite 4-5 Bed & Akses Ramah Kursi Roda',
        'Fasilitas Kursi Roda & Tim Pendorong Berpengalaman',
        'Dokter & Tenaga Medis Khusus Pendamping Rombongan',
        'Hotel 0 Meter dari Pelataran Masjid',
        'Menu Makanan Ramah Lansia & Anak (Rendah Gula/Garam)',
        'Perlengkapan Umrah Lengkap & Air Zamzam 5 Liter'
      ]),
      itinerary: JSON.stringify([
        'Hari 1: Bertolak dari Bandara Soekarno Hatta menuju Jeddah via Dubai',
        'Hari 2: Tiba di Makkah, check-in Hajar Tower dan istirahat sebelum Umrah tempo rileks',
        'Hari 3: Ibadah santai dan tawaf sunnah ramah lansia',
        'Hari 4: Wisata sejarah ringan Makkah dengan bus nyaman ber-AC',
        'Hari 5: Perjalanan ke Madinah dengan istirahat teratur',
        'Hari 6: Check-in hotel Madinah dan salat di Masjid Nabawi',
        'Hari 7: Ziarah Raudhah dengan pendampingan khusus',
        'Hari 8: Kunjungan santai ke Museum Madinah & Kebun Kurma',
        'Hari 9: Tawaf Wada\' dan perjalanan pulang ke Jakarta',
        'Hari 10: Tiba di Jakarta kembali bersama keluarga tercinta'
      ]),
      is_demo: false,
      active: true
    },
    {
      id: 'annahl-vip-private-9h',
      name: 'Umrah VIP Private Bintang 5 Royal Kaaba View 9 Hari',
      agency: 'An-Nahl Travel & Tour Umroh',
      price: 45000000,
      cashback: 1500000,
      duration: 9,
      departure: '08 November 2027',
      city: 'Jakarta',
      airline: 'Garuda Indonesia (Executive Class)',
      hotel_makkah: 'Raffles Makkah Palace',
      hotel_madinah: 'The Oberoi Madinah',
      stars: 5,
      quota: 20,
      seats: 14,
      type: 'VIP',
      image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1200&q=85',
      description: 'Layanan umrah VVIP paling prestisius dengan suite mewah menghadap langsung ke Ka\'bah (Kaaba View) di Raffles Makkah Palace dan The Oberoi Madinah. Pelayanan butler pribadi 24 jam, mobil pribadi GMC Yukon selama di Saudi, dan bimbingan ulama nasional secara privat.',
      facilities: JSON.stringify([
        'Tiket Garuda Indonesia Executive Class PP',
        'Suite Kaaba View di Raffles Makkah Palace',
        'Suite Haram View di The Oberoi Madinah',
        'Mobil Pribadi GMC Yukon Luxury dengan Sopir Pribadi',
        'Layanan Butler Pribadi 24 Jam',
        'Muthawwif Eksklusif 1 Pembimbing per 5 Jamaah',
        'Lounge VIP Bandara Jakarta, Jeddah & Madinah',
        'Perlengkapan Sutra & Koper Rimowa Eksklusif'
      ]),
      itinerary: JSON.stringify([
        'Hari 1: Penerbangan Executive Class Garuda Indonesia ke Jeddah, disambut di Lounge VIP dan transfer pribadi ke Raffles Makkah',
        'Hari 2: Pelaksanaan Umrah VVIP dibimbing langsung di depan Ka\'bah',
        'Hari 3: Ibadah privat dengan pemandangan Ka\'bah dari suite dan salat di Haram',
        'Hari 4: Ziarah Makkah eksklusif dengan mobil mewah pribadi',
        'Hari 5: Transfer ke Madinah dengan mobil GMC pribadi dan check-in The Oberoi',
        'Hari 6: Akses khusus Raudhah dan ibadah khusyuk di Masjid Nabawi',
        'Hari 7: Ziarah Madinah private tour',
        'Hari 8: Tawaf Wada\' dan transfer ke Royal Terminal Bandara',
        'Hari 9: Tiba kembali di Jakarta dengan kemuliaan ibadah terbaik'
      ]),
      is_demo: false,
      active: true
    },
    {
      id: 'annahl-hemat-syawal-9h',
      name: 'Umrah Hemat Syawal Barokah 9 Hari',
      agency: 'An-Nahl Travel Cabang Surabaya',
      price: 24800000,
      cashback: 500000,
      duration: 9,
      departure: '18 April 2027',
      city: 'Surabaya',
      airline: 'Batik Air / Scoot',
      hotel_makkah: 'Olayan Golden Hotel Makkah',
      hotel_madinah: 'Mirage As Salam Hotel',
      stars: 3,
      quota: 45,
      seats: 38,
      type: 'Hemat',
      image: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1200&q=85',
      description: 'Paket umrah hemat Syawal yang sangat ekonomis namun tetap mengutamakan kenyamanan dan kepastian keberangkatan. Hotel strategis yang dekat dengan sarana transportasi, konsumsi halal lezat, serta bimbingan manasik lengkap sesuai sunnah Rasulullah SAW.',
      facilities: JSON.stringify([
        'Tiket Pesawat PP Surabaya - Jeddah',
        'Hotel Bintang 3 Bersih & Nyaman di Makkah & Madinah',
        'Makan 3x Sehari Masakan Indonesia',
        'Transportasi Bus AC Nyaman Antar Kota',
        'Visa Umrah & Asuransi Resmi',
        'Perlengkapan Umrah Standar Lengkap',
        'Air Zamzam 5 Liter',
        'Bimbingan Ibadah oleh Ustadz Berpengalaman'
      ]),
      itinerary: JSON.stringify([
        'Hari 1: Terbang dari Bandara Juanda Surabaya menuju Bandara Jeddah',
        'Hari 2: Tiba di Makkah, istirahat dan pelaksanaan Umrah pertama',
        'Hari 3: Memperbanyak zikir dan salat fardhu di Masjidil Haram',
        'Hari 4: Ziarah Kota Makkah dan miqat Umrah kedua di Tan\'im',
        'Hari 5: Berangkat menuju Madinah Al-Munawwarah',
        'Hari 6: Ziarah Raudhah dan Makam Rasulullah SAW di Masjid Nabawi',
        'Hari 7: Ziarah Kota Madinah dan zikir bersama',
        'Hari 8: Tawaf Wada\' dan persiapan menuju bandara kepulangan',
        'Hari 9: Tiba di Surabaya dengan rasa syukur dan doa yang terkabul'
      ]),
      is_demo: false,
      active: true
    }
  ];

  for (const pkg of realPackages) {
    await client.query(`
      insert into public.packages (
        id, name, agency, price, cashback, duration, departure, city, airline,
        hotel_makkah, hotel_madinah, stars, quota, seats, type, image, description,
        facilities, itinerary, is_demo, active
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      on conflict (id) do update set
        name = excluded.name,
        agency = excluded.agency,
        price = excluded.price,
        cashback = excluded.cashback,
        duration = excluded.duration,
        departure = excluded.departure,
        city = excluded.city,
        airline = excluded.airline,
        hotel_makkah = excluded.hotel_makkah,
        hotel_madinah = excluded.hotel_madinah,
        stars = excluded.stars,
        quota = excluded.quota,
        seats = excluded.seats,
        type = excluded.type,
        image = excluded.image,
        description = excluded.description,
        facilities = excluded.facilities,
        itinerary = excluded.itinerary,
        is_demo = excluded.is_demo,
        active = excluded.active;
    `, [
      pkg.id, pkg.name, pkg.agency, pkg.price, pkg.cashback, pkg.duration, pkg.departure,
      pkg.city, pkg.airline, pkg.hotel_makkah, pkg.hotel_madinah, pkg.stars, pkg.quota,
      pkg.seats, pkg.type, pkg.image, pkg.description, pkg.facilities, pkg.itinerary,
      pkg.is_demo, pkg.active
    ]);
  }
  console.log(`Inserted ${realPackages.length} real packages!`);

  // 6. Insert real seed bookings so users can track right away
  console.log('Seeding real bookings...');
  const realBookings = [
    {
      id: 'MP-261112RPD301',
      package_id: 'annahl-plus-desember-9h',
      package_name: 'Umrah Plus An-Nahl Akhir Tahun 9 Hari',
      total_amount: 70000000,
      status: 'Dikonfirmasi',
      payment_method: 'Transfer Bank - BSI',
      travelers: JSON.stringify([
        { name: 'Ahmad Fauzi', phone: '081234567891', gender: 'Laki-laki' },
        { name: 'Siti Maryam', phone: '081234567892', gender: 'Perempuan' }
      ]),
      created_at: '2026-11-12T08:30:00Z'
    },
    {
      id: 'MP-261112U58601',
      package_id: 'annahl-plus-desember-9h',
      package_name: 'Umrah Plus An-Nahl Akhir Tahun 9 Hari',
      total_amount: 35000000,
      status: 'Menunggu',
      payment_method: 'Transfer Bank - Mandiri',
      travelers: JSON.stringify([
        { name: 'H. Bambang Irawan', phone: '085731725563', gender: 'Laki-laki' }
      ]),
      created_at: '2026-11-12T10:15:00Z'
    },
    {
      id: 'UQ-88291044',
      package_id: 'annahl-plus-turki-12h',
      package_name: 'Umrah Plus Turki 12 Hari Golden Tulip',
      total_amount: 38500000,
      status: 'Diproses',
      payment_method: 'Transfer Bank - BCA',
      travelers: JSON.stringify([
        { name: 'Hendra Saputra', phone: '082188992211', gender: 'Laki-laki' }
      ]),
      created_at: '2026-11-13T04:20:00Z'
    }
  ];

  for (const b of realBookings) {
    await client.query(`
      insert into public.bookings (id, package_id, package_name, total_amount, status, payment_method, travelers, created_at)
      values ($1, $2, $3, $4, $5, $6, $7, $8)
      on conflict (id) do update set
        status = excluded.status,
        total_amount = excluded.total_amount,
        travelers = excluded.travelers;
    `, [b.id, b.package_id, b.package_name, b.total_amount, b.status, b.payment_method, b.travelers, b.created_at]);
  }
  console.log(`Seeded ${realBookings.length} bookings!`);

  // 7. Insert real initial notifications
  console.log('Inserting real notifications...');
  await client.query(`delete from public.notifications where true;`);
  const notifications = [
    {
      title: 'Pembaruan Kuota Umrah Plus Turki 12 Hari',
      message: 'Sisa kuota paket Umrah Plus Turki tersisa 32 kursi. Segera lakukan reservasi sebelum kuota habis.',
      category: 'promo',
      link: '/packages/annahl-plus-turki-12h'
    },
    {
      title: 'Verifikasi Pembayaran Berhasil',
      message: 'Pesanan MP-261112RPD301 telah dikonfirmasi oleh travel. Silakan cek detail di menu Tracking.',
      category: 'booking',
      link: '/tracking?code=MP-261112RPD301'
    },
    {
      title: 'Jadwal Manasik Akbar Umrah Akhir Tahun',
      message: 'Manasik akbar untuk keberangkatan Desember 2026 akan dilaksanakan serentak secara online dan offline.',
      category: 'info',
      link: '/#tentang'
    }
  ];

  for (const n of notifications) {
    await client.query(`
      insert into public.notifications (title, message, category, link, read)
      values ($1, $2, $3, $4, false);
    `, [n.title, n.message, n.category, n.link]);
  }
  console.log('Seeded notifications!');

  await client.end();
  console.log('Migration completed successfully!');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
