import { NextRequest, NextResponse } from "next/server";
import { listAvailableSlots, logToolCall } from "@/lib/sandbox-store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    staff_id?: string;
    service_id?: string;
    date?: string;
    contact_id?: string;
  };

  if (!body.staff_id || !body.service_id || !body.date) {
    logToolCall({
      toolName: "get_available_slots",
      status: "error",
      input: body as Record<string, unknown>,
      output: { error: "staff_id, service_id and date are required" },
      contactId: body.contact_id
    });
    return NextResponse.json(
      { success: false, error: "staff_id, service_id and date are required" },
      { status: 400 }
    );
  }

  const response = {
    success: true,
    data: listAvailableSlots({
      staffId: body.staff_id,
      serviceId: body.service_id,
      date: body.date
    })
  };

  logToolCall({
    toolName: "get_available_slots",
    status: "success",
    input: body as Record<string, unknown>,
    output: response,
    contactId: body.contact_id
  });

  return NextResponse.json(response);
}
