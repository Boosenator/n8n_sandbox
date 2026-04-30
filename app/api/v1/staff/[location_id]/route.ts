import { NextRequest, NextResponse } from "next/server";
import { listActiveStaff, logToolTrace } from "@/lib/supabase-admin";

// Mirrors: GET https://api.alteg.io/api/v1/staff/{location_id}
// Query params: ?service_id=...
// Header for logging: X-Contact-Id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ location_id: string }> }
) {
  await params;
  const serviceId = request.nextUrl.searchParams.get("service_id") ?? undefined;
  const contactId = request.headers.get("x-contact-id") ?? undefined;

  const staff = await listActiveStaff(serviceId);

  const response = {
    success: true,
    data: staff.map((item) => ({
      id: item.id,
      name: item.name,
      specialization: item.notes ?? null,
      position: item.role ?? null
    }))
  };

  await logToolTrace({
    toolName: "list_staff",
    status: "success",
    input: { service_id: serviceId ?? null },
    output: response,
    contactId
  });

  return NextResponse.json(response);
}
