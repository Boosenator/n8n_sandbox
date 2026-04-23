import { NextRequest, NextResponse } from "next/server";
import { listActiveServices, logToolCall } from "@/lib/sandbox-store";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    staff_id?: string;
    contact_id?: string;
  };

  const items = listActiveServices(body.staff_id).map((service) => ({
    id: service.id,
    title: service.name,
    price_min: service.priceFrom,
    price_max: service.priceFrom,
    seance_length: service.durationMinutes * 60,
    staff: []
  }));

  const response = {
    success: true,
    data: items
  };

  logToolCall({
    toolName: "list_services",
    status: "success",
    input: body as Record<string, unknown>,
    output: response
  });

  return NextResponse.json(response);
}
