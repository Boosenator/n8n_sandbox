import { NextRequest, NextResponse } from "next/server";
import { cancelBookingById, logToolTrace } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    booking_id?: string;
    contact_id?: string;
  };

  if (!body.booking_id) {
    await logToolTrace({
      toolName: "cancel_booking",
      status: "error",
      input: body as Record<string, unknown>,
      output: { error: "booking_id is required" },
      contactId: body.contact_id
    });
    return NextResponse.json(
      { success: false, error: "booking_id is required" },
      { status: 400 }
    );
  }

  const ok = await cancelBookingById(body.booking_id);

  const response = {
    success: ok,
    error: ok ? undefined : "booking_not_found"
  };

  await logToolTrace({
    toolName: "cancel_booking",
    status: ok ? "success" : "error",
    input: body as Record<string, unknown>,
    output: response,
    contactId: body.contact_id
  });

  return NextResponse.json(response);
}
