import { NextRequest, NextResponse } from "next/server";
import { estimatePrice, logToolTrace } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    staff_id?: string;
    service_id?: string;
    contact_id?: string;
  };

  if (!body.staff_id || !body.service_id) {
    await logToolTrace({
      toolName: "estimate_price",
      status: "error",
      input: body as Record<string, unknown>,
      output: { error: "staff_id and service_id are required" },
      contactId: body.contact_id
    });
    return NextResponse.json(
      { success: false, error: "staff_id and service_id are required" },
      { status: 400 }
    );
  }

  const result = await estimatePrice({
    staffId: body.staff_id,
    serviceId: body.service_id
  });

  if (!result) {
    await logToolTrace({
      toolName: "estimate_price",
      status: "error",
      input: body as Record<string, unknown>,
      output: { error: "pricing_not_found" },
      contactId: body.contact_id
    });
    return NextResponse.json(
      { success: false, error: "pricing_not_found" },
      { status: 404 }
    );
  }

  const response = {
    success: true,
    data: result
  };

  await logToolTrace({
    toolName: "estimate_price",
    status: "success",
    input: body as Record<string, unknown>,
    output: response,
    contactId: body.contact_id
  });

  return NextResponse.json(response);
}
