import { NextRequest, NextResponse } from "next/server";
import { cancelBookingById, getBookingById, logToolTrace, rescheduleBooking } from "@/lib/supabase-admin";

type RouteContext = { params: Promise<{ location_id: string; record_id: string }> };

// GET    — Mirrors: GET    https://api.alteg.io/api/v1/record/{location_id}/{record_id}
// PUT    — Mirrors: PUT    https://api.alteg.io/api/v1/record/{location_id}/{record_id}
//           Body: { datetime?, staff_id? }
// DELETE — Mirrors: DELETE https://api.alteg.io/api/v1/record/{location_id}/{record_id}
// Header for logging: X-Contact-Id

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { record_id } = await params;
  const contactId = request.headers.get("x-contact-id") ?? undefined;

  const booking = await getBookingById(record_id);

  if (!booking) {
    await logToolTrace({
      toolName: "get_record",
      status: "error",
      input: { record_id },
      output: { error: "record_not_found" },
      contactId
    });
    return NextResponse.json({ success: false, error: "record_not_found" }, { status: 404 });
  }

  const response = {
    success: true,
    data: {
      id: booking.id,
      staff_id: booking.staffId,
      services: [{ id: booking.serviceId }],
      datetime: booking.datetime,
      status: booking.status,
      client: { name: booking.clientName, phone: booking.clientPhone }
    }
  };

  await logToolTrace({
    toolName: "get_record",
    status: "success",
    input: { record_id },
    output: response,
    contactId
  });

  return NextResponse.json(response);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { record_id } = await params;
  const contactId = request.headers.get("x-contact-id") ?? undefined;

  const body = (await request.json()) as {
    datetime?: string;
    staff_id?: string;
    comment?: string;
  };

  if (!body.datetime) {
    return NextResponse.json(
      { success: false, error: "datetime is required" },
      { status: 400 }
    );
  }

  const booking = await rescheduleBooking({
    id: record_id,
    datetime: body.datetime,
    staffId: body.staff_id
  });

  if (!booking) {
    await logToolTrace({
      toolName: "reschedule_record",
      status: "error",
      input: { record_id, ...body },
      output: { error: "record_not_found" },
      contactId
    });
    return NextResponse.json({ success: false, error: "record_not_found" }, { status: 404 });
  }

  const response = {
    success: true,
    data: {
      id: booking.id,
      staff_id: booking.staffId,
      services: [{ id: booking.serviceId }],
      datetime: booking.datetime,
      status: booking.status,
      client: { name: booking.clientName, phone: booking.clientPhone }
    }
  };

  await logToolTrace({
    toolName: "reschedule_record",
    status: "success",
    input: { record_id, ...body },
    output: response,
    contactId
  });

  return NextResponse.json(response);
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { record_id } = await params;
  const contactId = request.headers.get("x-contact-id") ?? undefined;

  const ok = await cancelBookingById(record_id);

  const response = { success: ok, error: ok ? undefined : "record_not_found" };

  await logToolTrace({
    toolName: "cancel_record",
    status: ok ? "success" : "error",
    input: { record_id },
    output: response,
    contactId
  });

  return NextResponse.json(response, { status: ok ? 200 : 404 });
}
