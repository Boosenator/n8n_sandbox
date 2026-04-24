import { NextRequest, NextResponse } from "next/server";
import { createEscalation, logToolTrace } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    contact_id?: string;
    reason?: string;
    context?: string;
  };

  if (!body.contact_id || !body.reason) {
    await logToolTrace({
      toolName: "escalate_to_master",
      status: "error",
      input: body as Record<string, unknown>,
      output: { error: "contact_id and reason are required" },
      contactId: body.contact_id
    });
    return NextResponse.json(
      { success: false, error: "contact_id and reason are required" },
      { status: 400 }
    );
  }

  const escalation = await createEscalation({
    contactId: body.contact_id,
    reason: body.reason,
    context: body.context ?? ""
  });

  const response = {
    success: true,
    data: escalation
  };

  await logToolTrace({
    toolName: "escalate_to_master",
    status: "success",
    input: body as Record<string, unknown>,
    output: response,
    contactId: body.contact_id
  });

  return NextResponse.json(response);
}
