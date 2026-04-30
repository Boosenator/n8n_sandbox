import { NextRequest, NextResponse } from "next/server";
import { listActiveServices, logToolTrace } from "@/lib/supabase-admin";

// Mirrors: GET https://api.alteg.io/api/v1/services/{location_id}
// Query params: ?staff_id=...
// Header for logging: X-Contact-Id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ location_id: string }> }
) {
  await params;
  const staffId = request.nextUrl.searchParams.get("staff_id") ?? undefined;
  const contactId = request.headers.get("x-contact-id") ?? undefined;

  const services = await listActiveServices(staffId);

  const response = {
    success: true,
    data: services.map((item) => ({
      id: item.id,
      title: item.name,
      price_min: Number(item.price_from ?? 0),
      price_max: Number(item.price_from ?? 0),
      seance_length:
        Number(
          (typeof item.staff_link === "object" &&
          item.staff_link &&
          "seance_length" in item.staff_link
            ? item.staff_link.seance_length
            : undefined) ?? item.duration_minutes ?? 60
        ) * 60,
      staff: []
    }))
  };

  await logToolTrace({
    toolName: "list_services",
    status: "success",
    input: { staff_id: staffId ?? null },
    output: response,
    contactId
  });

  return NextResponse.json(response);
}
