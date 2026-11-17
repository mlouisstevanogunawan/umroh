import { NextResponse } from "next/server";
import {
  MIDTRANS_SERVER_KEY,
  MIDTRANS_SNAP_URL,
} from "@/lib/midtrans";

export async function POST(request: Request) {
  try {
    if (!MIDTRANS_SERVER_KEY) {
      return NextResponse.json(
        { error: "Kunci server Midtrans belum dikonfigurasi di server." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      bookingId,
      packageId,
      packageName,
      amount,
      travelers = [],
      customer = {},
      paymentScheme = "full",
    } = body;

    if (!bookingId || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Data pemesanan tidak valid. bookingId dan amount wajib diisi." },
        { status: 400 }
      );
    }

    const grossAmount = Math.round(Number(amount));
    const firstTraveler = Array.isArray(travelers) && travelers[0] ? travelers[0] : null;

    const customerName =
      customer?.name?.trim() ||
      firstTraveler?.name?.trim() ||
      "Jemaah UmrahQu";

    const customerPhone =
      customer?.phone?.trim() ||
      firstTraveler?.phone?.trim() ||
      "08123456789";

    const customerEmail =
      customer?.email?.trim() ||
      "jemaah@annahl-travel.com";

    const authHeader = `Basic ${Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString("base64")}`;

    const makePayload = (orderIdToUse: string) => ({
      transaction_details: {
        order_id: orderIdToUse,
        gross_amount: grossAmount,
      },
      item_details: [
        {
          id: String(packageId || "umrah-package").slice(0, 50),
          price: grossAmount,
          quantity: 1,
          name: `${paymentScheme === "dp" ? "DP " : ""}${String(packageName || "Paket Umrah").slice(0, 45)}`,
        },
      ],
      customer_details: {
        first_name: customerName.slice(0, 50),
        email: customerEmail,
        phone: customerPhone.slice(0, 20),
      },
      credit_card: {
        secure: true,
      },
      enabled_payments: [
        "credit_card",
        "bca_va",
        "bni_va",
        "bri_va",
        "permata_va",
        "other_va",
        "gopay",
        "shopeepay",
        "qris",
        "bank_transfer",
      ],
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/tracking?code=${bookingId}`,
      },
    });

    let res = await fetch(MIDTRANS_SNAP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(makePayload(bookingId)),
    });

    let data = await res.json();

    // If order_id already exists and is locked/settled, retry with an attempt suffix
    if (res.status === 400 && Array.isArray(data.error_messages) && data.error_messages.some((msg: string) => msg.includes("already been taken") || msg.includes("order_id"))) {
      const retryOrderId = `${bookingId}-${Date.now().toString().slice(-4)}`;
      res = await fetch(MIDTRANS_SNAP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(makePayload(retryOrderId)),
      });
      data = await res.json();
    }

    if (!res.ok) {
      console.error("Midtrans Snap API Error:", res.status, data);
      return NextResponse.json(
        {
          error:
            Array.isArray(data.error_messages) && data.error_messages.length > 0
              ? data.error_messages.join(", ")
              : "Gagal membuat sesi pembayaran Midtrans.",
          details: data,
        },
        { status: res.status }
      );
    }

    return NextResponse.json({
      token: data.token,
      redirect_url: data.redirect_url,
      order_id: bookingId,
    });
  } catch (error) {
    console.error("Server error creating Midtrans token:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada server saat menghubungi Midtrans.",
      },
      { status: 500 }
    );
  }
}
