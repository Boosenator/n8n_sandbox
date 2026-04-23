import { NextRequest, NextResponse } from "next/server";
import { listActiveStaff, logToolCall } from "@/lib/sandbox-store";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    service_id?: string;
    contact_id?: string;
  };

  const response = {
    success: true,
    data: listActiveStaff(body.service_id).map((staff) => ({
      id: staff.id,
      name: staff.name,
      specialization: staff.notes,
      position: staff.role
    }))
  };

  logToolCall({
    toolName: "list_staff",
    status: "success",
    input: body as Record<string, unknown>,
    output: response
  });

  return NextResponse.json(response);
}
