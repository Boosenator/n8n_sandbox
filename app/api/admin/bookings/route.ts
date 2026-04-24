import { NextRequest, NextResponse } from "next/server";
import { deleteAdminBooking, getAdminBookings, upsertAdminBooking } from "@/lib/supabase-admin";
import { BookingRecord } from "@/lib/types";

export async function GET() {
  return NextResponse.json({
    ok: true,
    items: await getAdminBookings()
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<BookingRecord> & {
    staffId?: string;
    serviceId?: string;
    datetime?: string;
    clientName?: string;
    clientPhone?: string;
    status?: BookingRecord["status"];
    source?: BookingRecord["source"];
  };

  if (
    !body.staffId ||
    !body.serviceId ||
    !body.datetime?.trim() ||
    !body.clientName?.trim() ||
    !body.clientPhone?.trim()
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "staffId, serviceId, datetime, clientName and clientPhone are required"
      },
      { status: 400 }
    );
  }

  const item = await upsertAdminBooking({
    id: body.id,
    staffId: body.staffId,
    serviceId: body.serviceId,
    datetime: body.datetime.trim(),
    clientName: body.clientName.trim(),
    clientPhone: body.clientPhone.trim(),
    status: body.status ?? "confirmed",
    source: body.source ?? "manual"
  });

  return NextResponse.json({ ok: true, item });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "id is required" },
      { status: 400 }
    );
  }

  await deleteAdminBooking(id);

  return NextResponse.json({ ok: true });
}
