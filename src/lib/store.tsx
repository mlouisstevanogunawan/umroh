"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { UmrahPackage } from "@/lib/packages";
import { getSupabase } from "@/lib/supabase";

export type Booking = {
  id: string;
  packageId: string;
  packageName: string;
  price: number;
  createdAt: string;
  status: "Menunggu" | "Diproses" | "Dikonfirmasi" | "Lunas" | "Selesai" | "Dibatalkan";
  travelers: { name: string; phone: string; gender: string }[];
  paymentMethod: string;
  proofName?: string;
};

export type BankAccount = {
  bank: string;
  owner: string;
  number: string;
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  category: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
};

type StoreValue = {
  packages: UmrahPackage[];
  packagesLoading: boolean;
  packagesError: string;
  wishlist: string[];
  compare: string[];
  bookings: Booking[];
  bankAccounts: BankAccount[];
  notifications: AppNotification[];
  realtimeConnected: boolean;
  toggleWishlist: (id: string) => void;
  toggleCompare: (id: string) => void;
  addBooking: (booking: Booking) => Promise<void>;
  updateBookingProof: (id: string, file: File) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  refreshBookings: () => Promise<void>;
  loading: boolean;
  syncError: string;
};

type PersistedStore = Pick<StoreValue, "wishlist" | "compare" | "bookings">;
const STORAGE_KEY = "umrahqu-data-v2";
const StoreContext = createContext<StoreValue | null>(null);

function isPackage(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function readLocalStore(): PersistedStore {
  if (typeof window === "undefined") return { wishlist: [], compare: [], bookings: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { wishlist: [], compare: [], bookings: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { wishlist: [], compare: [], bookings: [] };
    const value = parsed as Partial<PersistedStore>;
    return {
      wishlist: Array.isArray(value.wishlist) ? value.wishlist.filter(isPackage) : [],
      compare: Array.isArray(value.compare) ? value.compare.filter(isPackage).slice(0, 3) : [],
      bookings: Array.isArray(value.bookings) ? (value.bookings as Booking[]) : [],
    };
  } catch (error) {
    console.error("Tidak dapat membaca data lokal UmrahQu.", error);
    return { wishlist: [], compare: [], bookings: [] };
  }
}

function validStatus(value: string): Booking["status"] {
  switch (value) {
    case "Diproses":
    case "Dikonfirmasi":
    case "Lunas":
    case "Selesai":
    case "Dibatalkan":
      return value;
    default:
      return "Menunggu";
  }
}

function readTravelers(value: unknown): Booking["travelers"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((traveler) => {
    if (!traveler || typeof traveler !== "object") return [];
    const record = traveler as Record<string, unknown>;
    if (typeof record.name !== "string" || typeof record.phone !== "string" || typeof record.gender !== "string") return [];
    return [{ name: record.name, phone: record.phone, gender: record.gender }];
  });
}

const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [
  {
    bank: "Bank Syariah Indonesia (BSI)",
    owner: "PT An Nahl Mandiri Berkah",
    number: "7123456789",
  },
  {
    bank: "Bank Mandiri",
    owner: "PT An Nahl Mandiri Berkah",
    number: "1440019283746",
  },
  {
    bank: "Bank Central Asia (BCA)",
    owner: "PT An Nahl Mandiri Berkah",
    number: "0112345678",
  },
];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [packages, setPackages] = useState<UmrahPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState("");
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(DEFAULT_BANK_ACCOUNTS);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState("");

  // 1. Load Packages and Realtime Subscription
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setPackagesError("Supabase belum dikonfigurasi. Periksa konfigurasi URL dan Anon Key.");
      setPackagesLoading(false);
      return;
    }

    let active = true;
    const loadPackages = async () => {
      try {
        let loaded: UmrahPackage[] = [];

        // 1a. Try public.packages table first
        const { data: pkgData, error: pkgError } = await supabase
          .from("packages")
          .select("*")
          .eq("active", true)
          .order("price");

        if (!pkgError && pkgData && pkgData.length > 0) {
          loaded = pkgData.map((row) => ({
            id: row.id,
            name: row.name,
            agency: row.agency,
            price: Number(row.price),
            cashback: Number(row.cashback),
            duration: row.duration,
            departure: row.departure,
            city: row.city,
            airline: row.airline,
            hotelMakkah: row.hotel_makkah,
            hotelMadinah: row.hotel_madinah,
            stars: row.stars,
            quota: row.quota,
            seats: row.seats,
            type: row.type,
            image: row.image,
            description: row.description,
            facilities: Array.isArray(row.facilities)
              ? row.facilities.filter((facility): facility is string => typeof facility === "string")
              : [],
            itinerary: Array.isArray(row.itinerary)
              ? row.itinerary.filter((day): day is string => typeof day === "string")
              : [],
            isDemo: Boolean(row.is_demo),
          }));
        }

        // 1b. If packages table is empty or restricted, load from app_settings key='packages'
        if (loaded.length === 0) {
          const { data: settingsData } = await supabase
            .from("app_settings")
            .select("value")
            .eq("key", "packages")
            .maybeSingle();

          if (settingsData?.value && Array.isArray(settingsData.value) && settingsData.value.length > 0) {
            loaded = (settingsData.value as Record<string, unknown>[]).map((item) => ({
              id: String(item.id),
              name: String(item.name),
              agency: String(item.agency),
              price: Number(item.price),
              cashback: Number(item.cashback || 0),
              duration: Number(item.duration),
              departure: String(item.departure),
              city: String(item.city),
              airline: String(item.airline),
              hotelMakkah: String(item.hotelMakkah || item.hotel_makkah || "Hotel Pelataran Haram"),
              hotelMadinah: String(item.hotelMadinah || item.hotel_madinah || "Hotel Pelataran Nabawi"),
              stars: Number(item.stars || 5),
              quota: Number(item.quota || 40),
              seats: Number(item.seats || 30),
              type: String(item.type || "Umrah"),
              image: String(item.image || "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1200&q=85"),
              description: String(item.description || ""),
              facilities: Array.isArray(item.facilities) ? item.facilities.map(String) : [],
              itinerary: Array.isArray(item.itinerary) ? item.itinerary.map(String) : [],
              isDemo: Boolean(item.isDemo || item.is_demo),
            }));
          }
        }

        // 1c. If still empty, load from travel_records where category='packages'
        if (loaded.length === 0) {
          const { data: recs } = await supabase
            .from("travel_records")
            .select("*")
            .eq("category", "packages")
            .eq("status", "Aktif");

          if (recs && recs.length > 0) {
            loaded = recs.map((r) => {
              const d = (r.details as Record<string, unknown>) || {};
              return {
                id: r.reference || r.id,
                name: r.title,
                agency: "An-Nahl Travel & Tour Umroh",
                price: Number(r.amount),
                cashback: Number(d.cashback || 0),
                duration: Number(d.duration || 9),
                departure: String(d.departure || "Jadwal Reguler"),
                city: String(d.city || "Surabaya"),
                airline: String(d.airline || "Garuda Indonesia"),
                hotelMakkah: String(d.hotelMakkah || d.hotel_makkah || "Hotel Pelataran Haram"),
                hotelMadinah: String(d.hotelMadinah || d.hotel_madinah || "Hotel Pelataran Nabawi"),
                stars: Number(d.stars || 5),
                quota: Number(d.quota || 40),
                seats: Number(d.seats || 30),
                type: String(d.type || "Umrah"),
                image: String(d.image || "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1200&q=85"),
                description: String(d.description || r.title),
                facilities: Array.isArray(d.facilities) ? d.facilities.map(String) : [],
                itinerary: Array.isArray(d.itinerary) ? d.itinerary.map(String) : [],
                isDemo: false,
              };
            });
          }
        }

        if (!active) return;
        setPackages(loaded);
        setPackagesError("");
      } catch (error) {
        console.error("Katalog paket Supabase tidak dapat dimuat.", error);
        if (active) setPackagesError("Katalog Supabase gagal dimuat. Periksa koneksi database.");
      } finally {
        if (active) setPackagesLoading(false);
      }
    };

    void loadPackages();

    const channel = supabase
      .channel("public-packages-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "packages" }, () => {
        void loadPackages();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, () => {
        void loadPackages();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "travel_records" }, () => {
        void loadPackages();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeConnected(true);
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  // 2. Load Bank Accounts from Supabase app_settings
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let active = true;

    const loadBankAccounts = async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "bank_accounts")
          .maybeSingle();
        if (error) throw error;
        if (!active || !data?.value || !Array.isArray(data.value)) return;
        const validAccounts: BankAccount[] = (data.value as Record<string, unknown>[])
          .filter((acc) => typeof acc.bank === "string" && typeof acc.number === "string")
          .map((acc) => ({
            bank: String(acc.bank),
            owner: String(acc.owner || "PT An Nahl Mandiri Berkah"),
            number: String(acc.number),
          }));
        if (validAccounts.length > 0) {
          setBankAccounts(validAccounts);
        }
      } catch (err) {
        console.warn("Gagal memuat bank_accounts dari app_settings, gunakan akun default.", err);
      }
    };

    void loadBankAccounts();
    return () => { active = false; };
  }, []);

  // 3. Load Notifications & Realtime Subscription
  const loadNotifications = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) {
        setNotifications(
          data.map((row) => ({
            id: row.id,
            title: row.title,
            message: row.message,
            category: row.category,
            link: row.link,
            read: Boolean(row.read),
            createdAt: row.created_at,
          }))
        );
      }
    } catch (err) {
      console.warn("Notifikasi tidak dapat dimuat dari Supabase.", err);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const supabase = getSupabase();
    if (!supabase) return;

    const notifChannel = supabase
      .channel("public-notifications-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        void loadNotifications();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(notifChannel);
    };
  }, [loadNotifications]);

  // 4. Load User Bookings and Wishlist
  const refreshBookings = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { data: authData } = await supabase.auth.getSession();
      const user = authData?.session?.user;

      const mergedMap = new Map<string, Booking>();

      // 4a. Fetch from travel_records (where category = 'bookings')
      const { data: travelBookings } = await supabase
        .from("travel_records")
        .select("id, reference, title, amount, status, details, created_at")
        .eq("category", "bookings")
        .order("created_at", { ascending: false });

      if (travelBookings && travelBookings.length > 0) {
        for (const tb of travelBookings) {
          const det = (tb.details as Record<string, unknown>) || {};
          const bookingCode = tb.reference || tb.id;
          mergedMap.set(bookingCode, {
            id: bookingCode,
            packageId: String(det.package_id || "annahl-plus-desember-9h"),
            packageName: String(det.package_name || tb.title),
            price: Number(tb.amount),
            createdAt: tb.created_at,
            status: validStatus(tb.status),
            travelers: readTravelers(det.travelers),
            paymentMethod: String(det.payment_method || "Transfer Bank - BSI"),
          });
        }
      }

      // 4b. Fetch from bookings table
      let bkgQuery = supabase
        .from("bookings")
        .select("id, package_id, package_name, total_amount, created_at, status, travelers, payment_method");

      if (user) {
        bkgQuery = bkgQuery.or(`user_id.eq.${user.id},user_id.is.null`);
      } else {
        bkgQuery = bkgQuery.limit(30);
      }

      const { data: bData, error: bError } = await bkgQuery.order("created_at", { ascending: false });
      if (!bError && bData) {
        for (const b of bData) {
          mergedMap.set(b.id, {
            id: b.id,
            packageId: b.package_id,
            packageName: b.package_name,
            price: Number(b.total_amount),
            createdAt: b.created_at,
            status: validStatus(b.status),
            travelers: readTravelers(b.travelers),
            paymentMethod: b.payment_method,
          });
        }
      }

      const remoteBookings = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (remoteBookings.length > 0) {
        setBookings(remoteBookings);
      }
    } catch (err) {
      console.warn("Gagal memperbarui pesanan dari Supabase.", err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const local = readLocalStore();
        if (!active) return;
        setWishlist(local.wishlist);
        setCompare(local.compare);
        if (local.bookings.length > 0) {
          setBookings(local.bookings);
        }

        const supabase = getSupabase();
        if (supabase) {
          const { data: authData } = await supabase.auth.getSession();
          if (authData.session?.user) {
            const [wishlistResult] = await Promise.all([
              supabase.from("wishlist").select("package_id"),
            ]);
            if (!wishlistResult.error && active && wishlistResult.data) {
              setWishlist(wishlistResult.data.map((item) => item.package_id));
            }
          }
          await refreshBookings();
        }
      } catch (error) {
        console.error("Data akun Supabase tidak dapat dimuat.", error);
        if (active) setSyncError("Data akun gagal dimuat dari Supabase.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    // Subscribe to bookings and wishlist changes in real-time
    const supabase = getSupabase();
    if (supabase) {
      const bookingsChannel = supabase
        .channel("public-bookings-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
          void refreshBookings();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "travel_records" }, () => {
          void refreshBookings();
        })
        .subscribe();

      const wishlistChannel = supabase
        .channel("public-wishlist-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "wishlist" }, async () => {
          const { data: authData } = await supabase.auth.getSession();
          if (authData?.session?.user) {
            const { data } = await supabase.from("wishlist").select("package_id");
            if (data && active) {
              setWishlist(data.map((item) => item.package_id));
            }
          }
        })
        .subscribe();

      return () => {
        active = false;
        void supabase.removeChannel(bookingsChannel);
        void supabase.removeChannel(wishlistChannel);
      };
    }

    return () => { active = false; };
  }, [refreshBookings]);

  // Sync to local storage
  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ wishlist, compare, bookings }));
    } catch (error) {
      console.error("Tidak dapat menyimpan data UmrahQu di perangkat ini.", error);
    }
  }, [wishlist, compare, bookings, loading]);

  const toggleWishlist = useCallback((id: string) => {
    const adding = !wishlist.includes(id);
    setWishlist((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    const supabase = getSupabase();
    if (!supabase) return;
    void (async () => {
      try {
        const { data: authData } = await supabase.auth.getSession();
        if (!authData.session?.user) return;
        if (adding) {
          await supabase.from("wishlist").insert({ package_id: id });
        } else {
          await supabase.from("wishlist").delete().eq("package_id", id);
        }
      } catch (error) {
        console.error("Daftar keinginan tidak dapat disinkronkan.", error);
      }
    })();
  }, [wishlist]);

  const toggleCompare = useCallback((id: string) => {
    setCompare((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 3
        ? [...current, id]
        : current
    );
  }, []);

  const addBooking = useCallback(async (booking: Booking) => {
    const supabase = getSupabase();
    if (supabase) {
      const { data: authData } = await supabase.auth.getSession();
      const userId = authData?.session?.user?.id ?? null;

      // 1. Insert into travel_records (guaranteed public insert & realtime broadcast)
      try {
        await supabase.from("travel_records").insert({
          category: "bookings",
          title: `${booking.packageName} (${booking.travelers.length || 1} Pax)`,
          reference: booking.id,
          status: booking.status,
          amount: booking.price,
          branch: "Head office",
          role_target: "all",
          channel: "Marketplace",
          details: {
            package_id: booking.packageId,
            package_name: booking.packageName,
            payment_method: booking.paymentMethod,
            pilgrims_count: String(booking.travelers.length || 1),
            travelers: booking.travelers,
            user_id: userId,
            notes: "Pemesanan via Marketplace UmrahQu",
          },
          created_at: booking.createdAt || new Date().toISOString(),
        });
      } catch (err) {
        console.warn("Gagal mencatat pemesanan ke travel_records:", err);
      }

      // 2. Also try insert into bookings table
      try {
        await supabase.from("bookings").insert({
          id: booking.id,
          user_id: userId,
          package_id: booking.packageId,
          package_name: booking.packageName,
          total_amount: booking.price,
          status: booking.status,
          payment_method: booking.paymentMethod,
          travelers: booking.travelers,
        });
      } catch (err) {
        console.warn("Gagal menyimpan ke tabel bookings:", err);
      }

      // 3. Create a notification for user
      try {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: `Pesanan Baru ${booking.id}`,
          message: `Pesanan untuk ${booking.packageName} berhasil dibuat. Silakan selesaikan pembayaran untuk verifikasi.`,
          category: "booking",
          link: `/tracking?code=${booking.id}`,
        });
      } catch (err) {
        console.warn("Gagal membuat notifikasi:", err);
      }
    }

    setBookings((current) => [booking, ...current]);
  }, []);

  const updateBookingProof = useCallback(async (id: string, file: File) => {
    const supabase = getSupabase();
    if (supabase) {
      const { data: userData } = await supabase.auth.getSession();
      const userId = userData?.session?.user?.id ?? "guest";
      const path = `${userId}/${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;

      try {
        await supabase.storage.from("payment-proofs").upload(path, file, {
          upsert: false,
          contentType: file.type,
        });
      } catch (uploadError) {
        console.error("Bukti pembayaran tidak dapat diunggah ke storage.", uploadError);
      }

      try {
        await supabase.from("payment_proofs").insert({
          booking_id: id,
          storage_path: path,
          file_name: file.name,
        });
      } catch (err) {
        console.warn("Gagal mencatat payment_proofs:", err);
      }

      // Update booking status in travel_records
      try {
        await supabase
          .from("travel_records")
          .update({
            status: "Diproses",
            updated_at: new Date().toISOString(),
          })
          .eq("category", "bookings")
          .eq("reference", id);
      } catch (err) {
        console.warn("Gagal update status di travel_records:", err);
      }

      // Update booking status in bookings table
      try {
        await supabase.from("bookings").update({ status: "Diproses" }).eq("id", id);
      } catch (err) {
        console.warn("Gagal update status di bookings:", err);
      }
    }

    setBookings((current) =>
      current.map((booking) =>
        booking.id === id ? { ...booking, status: "Diproses", proofName: file.name } : booking
      )
    );
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications((current) =>
      current.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((current) => current.map((n) => ({ ...n, read: true })));
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from("notifications").update({ read: true }).neq("read", true);
    }
  }, []);

  const value = useMemo(
    () => ({
      packages,
      packagesLoading,
      packagesError,
      wishlist,
      compare,
      bookings,
      bankAccounts,
      notifications,
      realtimeConnected,
      toggleWishlist,
      toggleCompare,
      addBooking,
      updateBookingProof,
      markNotificationRead,
      markAllNotificationsRead,
      refreshBookings,
      loading,
      syncError,
    }),
    [
      packages,
      packagesLoading,
      packagesError,
      wishlist,
      compare,
      bookings,
      bankAccounts,
      notifications,
      realtimeConnected,
      toggleWishlist,
      toggleCompare,
      addBooking,
      updateBookingProof,
      markNotificationRead,
      markAllNotificationsRead,
      refreshBookings,
      loading,
      syncError,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore harus digunakan di dalam StoreProvider.");
  return store;
}

export function packageLabel(pkg: UmrahPackage) {
  return pkg.name;
}
