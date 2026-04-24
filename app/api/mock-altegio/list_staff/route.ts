import { NextRequest, NextResponse } from "next/server";
import { listActiveStaff, logToolTrace } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    service_id?: string;
    contact_id?: string;
  };

  const response = {
    success: true,
    data: (await listActiveStaff(body.service_id)).map((staff) => ({
      id: staff.id,
      name: staff.name,
      specialization: staff.notes,
      position: staff.role
    }))
  };

  await logToolTrace({
    toolName: "list_staff",
    status: "success",
    input: body as Record<string, unknown>,
    output: response,
    contactId: body.contact_id
  });

  return NextResponse.json(response);
}
