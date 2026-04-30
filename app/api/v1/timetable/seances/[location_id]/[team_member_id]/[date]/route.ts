import { NextRequest, NextResponse } from "next/server";
import { listAvailableSlots, logToolTrace } from "@/lib/supabase-admin";

// Mirrors: GET https://api.alteg.io/api/v1/timetable/seances/{location_id}/{team_member_id}/{date}
// Query params: ?service_id=... (required for duration calculation)
// date format: YYYY-MM-DD
// Header for logging: X-Contact-Id
export async function GET(
  request: NextRequest,
  {
    params
  }: {
    params: Promise<{
      location_id: string;
      team_member_id: string;
      date: string;
    }>;
  }
) {
  const { team_member_id, date } = await params;
  const serviceId = request.nextUrl.searchParams.get("service_id") ?? "";
  const contactId = request.headers.get("x-contact-id") ?? undefined;

  if (!serviceId) {
    return NextResponse.json(
      { success: false, error: "service_id query param is required" },
      { status: 400 }
    );
  }

  const slots = await listAvailableSlots({
    staffId: team_member_id,
    serviceId,
    date
  });

  const response = {
    success: true,
    data: slots.map((item) => ({
      time: item.datetime.slice(11, 16),
      datetime: item.datetime,
      staff_id: item.staff_id,
      service_id: item.service_id,
      seance_length: 0
    }))
  };

  await logToolTrace({
    toolName: "get_available_slots",
    status: "success",
    input: { staff_id: team_member_id, date, service_id: serviceId },
    output: response,
    contactId
  });

  return NextResponse.json(response);
}
