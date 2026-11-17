create extension if not exists pgcrypto;

create table if not exists public.packages (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  agency text not null,
  price bigint not null check (price > 0),
  cashback bigint not null default 0 check (cashback >= 0),
  duration integer not null check (duration > 0),
  departure text not null,
  city text not null,
  airline text not null,
  hotel_makkah text not null,
  hotel_madinah text not null,
  stars integer not null check (stars between 1 and 5),
  quota integer not null check (quota > 0),
  seats integer not null check (seats >= 0 and seats <= quota),
  type text not null,
  image text not null,
  description text not null,
  facilities jsonb not null default '[]'::jsonb,
  itinerary jsonb not null default '[]'::jsonb,
  is_demo boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.packages
  add column if not exists itinerary jsonb not null default '[]'::jsonb;
alter table public.packages
  add column if not exists is_demo boolean not null default false;

create table if not exists public.bookings (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  package_id text not null references public.packages(id),
  package_name text not null,
  total_amount bigint not null check (total_amount > 0),
  status text not null default 'Menunggu'
    check (status in ('Menunggu', 'Diproses', 'Dikonfirmasi', 'Lunas', 'Selesai', 'Dibatalkan')),
  payment_method text not null,
  travelers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

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

create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  booking_id text not null references public.bookings(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.wishlist (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  package_id text not null references public.packages(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  role text default 'user',
  branch text default 'Head office',
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.travel_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  agency_name text not null,
  subdomain text not null unique,
  biography text not null,
  operating_since integer not null check (operating_since between 1900 and 2100),
  quota integer not null check (quota > 0),
  license_number text not null,
  logo_path text,
  contact_name text not null,
  contact_email text not null,
  phone text not null,
  city text not null,
  address text not null,
  status text not null default 'Menunggu' check (status in ('Menunggu', 'Diproses', 'Disetujui', 'Ditolak')),
  created_at timestamptz not null default now()
);

-- RLS
alter table public.packages enable row level security;
alter table public.bookings enable row level security;
alter table public.notifications enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.wishlist enable row level security;
alter table public.profiles enable row level security;
alter table public.travel_applications enable row level security;

grant select on public.packages to anon, authenticated;
grant select, insert, update on public.bookings to anon, authenticated;
grant select, insert, update on public.notifications to anon, authenticated;

drop policy if exists "Anyone can view active packages" on public.packages;
create policy "Anyone can view active packages"
  on public.packages for select
  using (active = true);

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

drop policy if exists "Anyone can read notifications" on public.notifications;
create policy "Anyone can read notifications"
  on public.notifications for select
  using (true);

drop policy if exists "Anyone can update notifications read state" on public.notifications;
create policy "Anyone can update notifications read state"
  on public.notifications for update
  using (true)
  with check (true);

drop policy if exists "Users can view their own payment proofs" on public.payment_proofs;
create policy "Users can view their own payment proofs"
  on public.payment_proofs for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can add proofs for their own bookings" on public.payment_proofs;
create policy "Users can add proofs for their own bookings"
  on public.payment_proofs for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Users can view their own wishlist" on public.wishlist;
create policy "Users can view their own wishlist"
  on public.wishlist for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can add to their own wishlist" on public.wishlist;
create policy "Users can add to their own wishlist"
  on public.wishlist for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove from their own wishlist" on public.wishlist;
create policy "Users can remove from their own wishlist"
  on public.wishlist for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can manage their own profile" on public.profiles;
create policy "Users can manage their own profile"
  on public.profiles for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Travel partners can view their own applications" on public.travel_applications;
create policy "Travel partners can view their own applications"
  on public.travel_applications for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Travel partners can submit applications" on public.travel_applications;
create policy "Travel partners can submit applications"
  on public.travel_applications for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'Menunggu');

-- Realtime publication setup
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'packages') then
    alter publication supabase_realtime add table public.packages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings') then
    alter publication supabase_realtime add table public.bookings;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wishlist') then
    alter publication supabase_realtime add table public.wishlist;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
end;
$$;
