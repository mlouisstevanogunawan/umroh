// Midtrans Payment Gateway Integration (Sandbox & Production)

export const MIDTRANS_CLIENT_KEY =
  process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "Mid-client-3VmmMjpElJ_qkOyE";

export const MIDTRANS_SERVER_KEY =
  process.env.MIDTRANS_SERVER_KEY || "SB-Mid-server-~mu32fQVn0e-hirTlV~FC5GK";

export const MIDTRANS_IS_PRODUCTION =
  process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";

export const MIDTRANS_SNAP_URL = MIDTRANS_IS_PRODUCTION
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";

export const MIDTRANS_STATUS_URL = MIDTRANS_IS_PRODUCTION
  ? "https://api.midtrans.com/v2"
  : "https://api.sandbox.midtrans.com/v2";

export const MIDTRANS_SNAP_SCRIPT_URL = MIDTRANS_IS_PRODUCTION
  ? "https://app.midtrans.com/snap/snap.js"
  : "https://app.sandbox.midtrans.com/snap/snap.js";

export type MidtransSnapResult = {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  transaction_status:
    | "capture"
    | "settlement"
    | "pending"
    | "deny"
    | "expire"
    | "cancel";
  fraud_status?: string;
  pdf_url?: string;
  finish_redirect_url?: string;
  va_numbers?: { bank: string; va_number: string }[];
  bca_va_number?: string;
  bni_va_number?: string;
  permata_va_number?: string;
  bill_key?: string;
  biller_code?: string;
  qr_string?: string;
};

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: MidtransSnapResult) => void;
          onPending?: (result: MidtransSnapResult) => void;
          onError?: (result: MidtransSnapResult) => void;
          onClose?: () => void;
        }
      ) => void;
      embed?: (
        token: string,
        options: {
          embedId: string;
          onSuccess?: (result: MidtransSnapResult) => void;
          onPending?: (result: MidtransSnapResult) => void;
          onError?: (result: MidtransSnapResult) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

/**
 * Loads the Midtrans Snap script into the browser DOM
 */
export function loadSnapScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    if (window.snap) {
      resolve();
      return;
    }

    const existingScript = document.getElementById("midtrans-snap-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", (err) => reject(err));
      // In case it already loaded
      if (window.snap) resolve();
      return;
    }

    const script = document.createElement("script");
    script.id = "midtrans-snap-script";
    script.src = MIDTRANS_SNAP_SCRIPT_URL;
    script.setAttribute("data-client-key", MIDTRANS_CLIENT_KEY);
    script.async = true;

    script.onload = () => {
      resolve();
    };

    script.onerror = (error) => {
      console.error("Gagal memuat script Midtrans Snap.", error);
      reject(new Error("Gagal memuat sistem pembayaran Midtrans"));
    };

    document.head.appendChild(script);
  });
}

/**
 * Maps Midtrans transaction_status to app Booking status
 */
export function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string
): {
  bookingStatus: "Lunas" | "Dikonfirmasi" | "Diproses" | "Menunggu" | "Dibatalkan";
  paymentStatus: "Lunas" | "Pending" | "Gagal" | "Dibatalkan";
  isSuccess: boolean;
} {
  if (transactionStatus === "capture") {
    if (fraudStatus === "challenge") {
      return {
        bookingStatus: "Diproses",
        paymentStatus: "Pending",
        isSuccess: false,
      };
    }
    return {
      bookingStatus: "Lunas",
      paymentStatus: "Lunas",
      isSuccess: true,
    };
  }

  if (transactionStatus === "settlement") {
    return {
      bookingStatus: "Lunas",
      paymentStatus: "Lunas",
      isSuccess: true,
    };
  }

  if (transactionStatus === "pending") {
    return {
      bookingStatus: "Menunggu",
      paymentStatus: "Pending",
      isSuccess: false,
    };
  }

  if (
    transactionStatus === "deny" ||
    transactionStatus === "cancel" ||
    transactionStatus === "expire"
  ) {
    return {
      bookingStatus: "Dibatalkan",
      paymentStatus: "Dibatalkan",
      isSuccess: false,
    };
  }

  return {
    bookingStatus: "Diproses",
    paymentStatus: "Pending",
    isSuccess: false,
  };
}

/**
 * Format label for Midtrans payment types
 */
export function formatPaymentType(paymentType?: string): string {
  switch (paymentType) {
    case "bank_transfer":
      return "Virtual Account (Bank Transfer)";
    case "echannel":
      return "Mandiri Bill Payment";
    case "bca_va":
      return "BCA Virtual Account";
    case "bni_va":
      return "BNI Virtual Account";
    case "bri_va":
      return "BRI Virtual Account";
    case "permata_va":
      return "Permata Virtual Account";
    case "cimb_va":
      return "CIMB Niaga Virtual Account";
    case "credit_card":
      return "Kartu Kredit / Debit Online";
    case "gopay":
      return "GoPay / QRIS";
    case "shopeepay":
      return "ShopeePay / QRIS";
    case "qris":
      return "QRIS Instant";
    case "cstore":
      return "Indomaret / Alfamart";
    case "akulaku":
      return "Akulaku PayLater";
    case "kredivo":
      return "Kredivo";
    default:
      return paymentType ? `Midtrans (${paymentType.replace(/_/g, " ").toUpperCase()})` : "Midtrans Gateway";
  }
}
