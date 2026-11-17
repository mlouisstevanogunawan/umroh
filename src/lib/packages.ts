export type UmrahPackage = {
  id: string;
  name: string;
  agency: string;
  price: number;
  cashback: number;
  duration: number;
  departure: string;
  city: string;
  airline: string;
  hotelMakkah: string;
  hotelMadinah: string;
  stars: number;
  quota: number;
  seats: number;
  type: string;
  image: string;
  description: string;
  facilities: string[];
  itinerary: string[];
  isDemo: boolean;
};

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
