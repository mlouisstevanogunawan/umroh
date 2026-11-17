import { NextResponse } from "next/server";
import {
  MIDTRANS_SERVER_KEY,
  MIDTRANS_STATUS_URL,
  mapMidtransStatus,
  formatPaymentType,
} from "@/lib/midtrans";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://shgbbwevvislnfqswutc.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_2N36Ha-nVSxHXxBMWAfOPA_3pWiO4NC";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order_id");

    if (!orderId) {
      return NextResponse.json(
        { error: "order_id query parameter is required" },
        { status: 400 }
      );
    }

    const authHeader = `Basic ${Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString("base64")}`;

    const res = await fetch(`${MIDTRANS_STATUS_URL}/${orderId}/status`, {
      headers: {
        Accept: "application/json",
        Authorization: authHeader,
      },
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        {
          error: data.status_message || "Gagal memeriksa status pembayaran Midtrans.",
          data,
        },
        { status: res.status }
      );
    }

    const transactionStatus = data.transaction_status;
    const fraudStatus = data.fraud_status;
    const mapped = mapMidtransStatus(transactionStatus, fraudStatus);
    const cleanBookingId = orderId.replace(/-\d{4}$/, "");

    // Sync to Supabase in real-time
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    try {
      // 1. Update in travel_records
      const { data: existingRecords } = await supabase
        .from("travel_records")
        .select("id, details")
        .eq("category", "bookings")
        .or(`reference.eq.${orderId},reference.eq.${cleanBookingId}`)
        .limit(1);

      if (existingRecords && existingRecords.length > 0) {
        const record = existingRecords[0];
        const oldDetails = (record.details as Record<string, unknown>) || {};
        await supabase
          .from("travel_records")
          .update({
            status: mapped.bookingStatus,
            updated_at: new Date().toISOString(),
            details: {
              ...oldDetails,
              payment_status: mapped.paymentStatus,
              midtrans_transaction_id: data.transaction_id,
              midtrans_status: transactionStatus,
              payment_type: formatPaymentType(data.payment_type),
              settlement_time: data.settlement_time || data.transaction_time,
              va_numbers: data.va_numbers || null,
            },
          })
          .eq("id", record.id);
      }

      // 2. Update in bookings table
      await supabase
        .from("bookings")
        .update({
          status: mapped.bookingStatus,
        })
        .or(`id.eq.${orderId},id.eq.${cleanBookingId}`);

      // 3. If settled / paid, notify user
      if (mapped.isSuccess) {
        await supabase.from("notifications").insert({
          title: `Pembayaran Berhasil! (${cleanBookingId})`,
          message: `Pembayaran sebesar Rp ${Number(data.gross_amount).toLocaleString("id-ID")} melalui ${formatPaymentType(data.payment_type)} telah berhasil diverifikasi oleh Midtrans.`,
          category: "booking",
          link: `/tracking?code=${cleanBookingId}`,
        });
      }
    } catch (syncErr) {
      console.warn("Gagal sinkronisasi otomatis status Midtrans ke Supabase:", syncErr);
    }

    return NextResponse.json({
      order_id: orderId,
      booking_id: cleanBookingId,
      transaction_status: transactionStatus,
      fraud_status: fraudStatus,
      payment_type: formatPaymentType(data.payment_type),
      raw_payment_type: data.payment_type,
      gross_amount: data.gross_amount,
      booking_status: mapped.bookingStatus,
      payment_status: mapped.paymentStatus,
      is_success: mapped.isSuccess,
      va_numbers: data.va_numbers || null,
      bill_key: data.bill_key || null,
      biller_code: data.biller_code || null,
      transaction_time: data.transaction_time,
      settlement_time: data.settlement_time,
    });
  } catch (error) {
    console.error("Error in /api/midtrans/status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
