import { NextRequest, NextResponse } from "next/server";
import { cancelBooking, logToolCall } from "@/lib/sandbox-store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    booking_id?: string;
    contact_id?: string;
  };

  if (!body.booking_id) {
    logToolCall({
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

  const ok = cancelBooking(body.booking_id);

  const response = {
    success: ok,
    error: ok ? undefined : "booking_not_found"
  };

  logToolCall({
    toolName: "cancel_booking",
    status: ok ? "success" : "error",
    input: body as Record<string, unknown>,
    output: response,
    contactId: body.contact_id
  });

  return NextResponse.json(response);
}
