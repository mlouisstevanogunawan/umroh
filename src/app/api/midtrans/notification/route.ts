import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  MIDTRANS_SERVER_KEY,
  mapMidtransStatus,
  formatPaymentType,
} from "@/lib/midtrans";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://shgbbwevvislnfqswutc.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_2N36Ha-nVSxHXxBMWAfOPA_3pWiO4NC";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      payment_type,
      transaction_id,
      settlement_time,
      transaction_time,
      va_numbers,
    } = body;

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return NextResponse.json(
        { error: "Invalid notification payload from Midtrans" },
        { status: 400 }
      );
    }

    // Verify Midtrans SHA-512 signature
    const expectedSignature = crypto
      .createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`)
      .digest("hex");

    if (signature_key !== expectedSignature) {
      console.warn("Invalid Midtrans signature rejected for order:", order_id);
      return NextResponse.json(
        { error: "Invalid signature key" },
        { status: 401 }
      );
    }

    const mapped = mapMidtransStatus(transaction_status, fraud_status);
    const cleanBookingId = order_id.replace(/-\d{4}$/, "");

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 1. Update in travel_records
    const { data: existingRecords } = await supabase
      .from("travel_records")
      .select("id, details")
      .eq("category", "bookings")
      .or(`reference.eq.${order_id},reference.eq.${cleanBookingId}`)
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
            midtrans_transaction_id: transaction_id,
            midtrans_status: transaction_status,
            payment_type: formatPaymentType(payment_type),
            settlement_time: settlement_time || transaction_time,
            va_numbers: va_numbers || null,
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
      .or(`id.eq.${order_id},id.eq.${cleanBookingId}`);

    // 3. Insert notification if payment succeeded
    if (mapped.isSuccess) {
      await supabase.from("notifications").insert({
        title: `Pembayaran Berhasil! (${cleanBookingId})`,
        message: `Pembayaran sebesar Rp ${Number(gross_amount).toLocaleString("id-ID")} melalui ${formatPaymentType(payment_type)} telah berhasil diverifikasi oleh Midtrans.`,
        category: "booking",
        link: `/tracking?code=${cleanBookingId}`,
      });
    }

    return NextResponse.json({
      status: "ok",
      booking_status: mapped.bookingStatus,
      order_id,
    });
  } catch (error) {
    console.error("Error processing Midtrans notification webhook:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
