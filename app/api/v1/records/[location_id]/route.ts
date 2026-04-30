import { NextRequest, NextResponse } from "next/server";
import { createBookingFromTool, getAdminBookings, logToolTrace } from "@/lib/supabase-admin";

// GET  — Mirrors: GET  https://api.alteg.io/api/v1/records/{location_id}
//         Query params: ?staff_id=&client_id=&start_date=&end_date=
// POST — Mirrors: POST https://api.alteg.io/api/v1/records/{location_id}
//         Body: { staff_id, services: [{ id, first_cost? }], client: { name, phone }, datetime }
// Header for logging: X-Contact-Id

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ location_id: string }> }
) {
  await params;
  const contactId = request.headers.get("x-contact-id") ?? undefined;
  const staffId = request.nextUrl.searchParams.get("staff_id") ?? undefined;
  const startDate = request.nextUrl.searchParams.get("start_date") ?? undefined;
  const endDate = request.nextUrl.searchParams.get("end_date") ?? undefined;

  const allBookings = await getAdminBookings();

  const filtered = allBookings.filter((item) => {
    if (staffId && item.staffId !== staffId) return false;
    if (startDate && item.datetime < startDate) return false;
    if (endDate && item.datetime > endDate) return false;
    return true;
  });

  const response = {
    success: true,
    data: filtered.map((item) => ({
      id: item.id,
      staff_id: item.staffId,
      services: [{ id: item.serviceId }],
      datetime: item.datetime,
      status: item.status,
      client: { name: item.clientName, phone: item.clientPhone }
    }))
  };

  await logToolTrace({
    toolName: "list_records",
    status: "success",
    input: { staff_id: staffId, start_date: startDate, end_date: endDate },
    output: { count: filtered.length },
    contactId
  });

  return NextResponse.json(response);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ location_id: string }> }
) {
  await params;
  const contactId = request.headers.get("x-contact-id") ?? undefined;

  const body = (await request.json()) as {
    staff_id?: string;
    services?: Array<{ id?: string; first_cost?: number }>;
    datetime?: string;
    client?: { name?: string; phone?: string };
    comment?: string;
  };

  const serviceId = body.services?.[0]?.id;

  if (!body.staff_id || !serviceId || !body.datetime || !body.client?.name || !body.client?.phone) {
    await logToolTrace({
      toolName: "create_record",
      status: "error",
      input: body as Record<string, unknown>,
      output: { error: "staff_id, services[0].id, datetime and client (name, phone) are required" },
      contactId
    });
    return NextResponse.json(
      { success: false, error: "staff_id, services[0].id, datetime and client (name, phone) are required" },
      { status: 400 }
    );
  }

  const result = await createBookingFromTool({
    staffId: body.staff_id,
    serviceId,
    datetime: body.datetime,
    clientName: body.client.name,
    clientPhone: body.client.phone,
    contactId
  });

  if (!result.success) {
    await logToolTrace({
      toolName: "create_record",
      status: "error",
      input: body as Record<string, unknown>,
      output: result as unknown as Record<string, unknown>,
      contactId
    });
    return NextResponse.json(result, { status: 409 });
  }

  const response = {
    success: true,
    data: {
      id: result.data.id,
      staff_id: result.data.staffId,
      services: [{ id: result.data.serviceId }],
      datetime: result.data.datetime,
      status: result.data.status,
      client: { name: result.data.clientName, phone: result.data.clientPhone }
    }
  };

  await logToolTrace({
    toolName: "create_record",
    status: "success",
    input: body as Record<string, unknown>,
    output: response,
    contactId
  });

  return NextResponse.json(response, { status: 201 });
}
