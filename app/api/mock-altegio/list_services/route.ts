import { NextRequest, NextResponse } from "next/server";
import { listActiveServices, logToolTrace } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    staff_id?: string;
    contact_id?: string;
  };

  const items = (await listActiveServices(body.staff_id)).map((service) => ({
    id: service.id,
    title: service.name,
    price_min: Number(service.price_from ?? 0),
    price_max: Number(service.price_from ?? 0),
    seance_length:
      Number(
        (typeof service.staff_link === "object" &&
        service.staff_link &&
        "seance_length" in service.staff_link
          ? service.staff_link.seance_length
          : undefined) ?? service.duration_minutes
      ) * 60,
    staff: []
  }));

  const response = {
    success: true,
    data: items
  };

  await logToolTrace({
    toolName: "list_services",
    status: "success",
    input: body as Record<string, unknown>,
    output: response,
    contactId: body.contact_id
  });

  return NextResponse.json(response);
}
