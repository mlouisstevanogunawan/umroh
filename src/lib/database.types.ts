export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};

type PackageRow = {
  id: string;
  name: string;
  agency: string;
  price: number;
  cashback: number;
  duration: number;
  departure: string;
  city: string;
  airline: string;
  hotel_makkah: string;
  hotel_madinah: string;
  stars: number;
  quota: number;
  seats: number;
  type: string;
  image: string;
  description: string;
  facilities: Json;
  itinerary: Json;
  is_demo: boolean;
  active: boolean;
  created_at: string;
};

type BookingRow = {
  id: string;
  user_id: string | null;
  package_id: string;
  package_name: string;
  total_amount: number;
  status: string;
  payment_method: string;
  travelers: Json;
  created_at: string;
};

type NotificationRow = {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  category: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

type AppSettingRow = {
  key: string;
  value: Json;
  updated_at: string;
};

type TravelRecordRow = {
  id: string;
  category: string;
  title: string;
  reference: string;
  status: string;
  amount: number | null;
  branch: string | null;
  role_target: string | null;
  channel: string | null;
  details: Json;
  created_at: string;
  updated_at: string;
};

type PaymentProofRow = {
  id: string;
  booking_id: string;
  user_id: string;
  storage_path: string;
  file_name: string;
  created_at: string;
};

type TravelApplicationRow = {
  id: string;
  user_id: string;
  agency_name: string;
  subdomain: string;
  biography: string;
  operating_since: number;
  quota: number;
  license_number: string;
  logo_path: string | null;
  contact_name: string;
  contact_email: string;
  phone: string;
  city: string;
  address: string;
  status: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      packages: Table<PackageRow>;
      bookings: Table<
        BookingRow,
        Pick<BookingRow, "id" | "package_id" | "package_name" | "total_amount" | "payment_method" | "travelers"> &
          Partial<Pick<BookingRow, "user_id" | "status">>
      >;
      notifications: Table<NotificationRow>;
      app_settings: Table<AppSettingRow>;
      travel_records: Table<TravelRecordRow>;
      payment_proofs: Table<PaymentProofRow, Pick<PaymentProofRow, "booking_id" | "storage_path" | "file_name">>;
      travel_applications: Table<
        TravelApplicationRow,
        Pick<
          TravelApplicationRow,
          | "agency_name"
          | "subdomain"
          | "biography"
          | "operating_since"
          | "quota"
          | "license_number"
          | "logo_path"
          | "contact_name"
          | "contact_email"
          | "phone"
          | "city"
          | "address"
        >
      >;
      wishlist: Table<
        { user_id: string; package_id: string; created_at: string },
        Pick<{ user_id: string; package_id: string; created_at: string }, "package_id">
      >;
      profiles: Table<
        { id: string; full_name: string; phone: string; role?: string; branch?: string; email?: string | null; created_at: string; updated_at: string },
        Pick<{ id: string; full_name: string; phone: string }, "id" | "full_name" | "phone">
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
