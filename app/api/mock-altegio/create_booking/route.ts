import { NextRequest, NextResponse } from "next/server";
import { createBookingFromTool, logToolTrace } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    staff_id?: string;
    service_id?: string;
    datetime?: string;
    contact_id?: string;
    client?: {
      name?: string;
      phone?: string;
    };
  };

  if (!body.staff_id || !body.service_id || !body.datetime || !body.client?.name || !body.client?.phone) {
    await logToolTrace({
      toolName: "create_booking",
      status: "error",
      input: body as Record<string, unknown>,
      output: { error: "staff_id, service_id, datetime and client are required" },
      contactId: body.contact_id
    });
    return NextResponse.json(
      { success: false, error: "staff_id, service_id, datetime and client are required" },
      { status: 400 }
    );
  }

  const result = await createBookingFromTool({
    staffId: body.staff_id,
    serviceId: body.service_id,
    datetime: body.datetime,
    clientName: body.client.name,
    clientPhone: body.client.phone,
    contactId: body.contact_id
  });

  if (!result.success) {
    await logToolTrace({
      toolName: "create_booking",
      status: "error",
      input: body as Record<string, unknown>,
      output: result as unknown as Record<string, unknown>,
      contactId: body.contact_id
    });
    return NextResponse.json(result, { status: 409 });
  }

  const response = {
    success: true,
    data: {
      id: result.data.id,
      staff_id: result.data.staffId,
      service_id: result.data.serviceId,
      datetime: result.data.datetime,
      status: result.data.status
    }
  };

  await logToolTrace({
    toolName: "create_booking",
    status: "success",
    input: body as Record<string, unknown>,
    output: response,
    contactId: body.contact_id
  });

  return NextResponse.json(response);
}
