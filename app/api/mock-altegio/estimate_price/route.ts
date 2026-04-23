import { NextRequest, NextResponse } from "next/server";
import { estimatePrice, logToolCall } from "@/lib/sandbox-store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    staff_id?: string;
    service_id?: string;
    contact_id?: string;
  };

  if (!body.staff_id || !body.service_id) {
    logToolCall({
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

  const result = estimatePrice({
    staffId: body.staff_id,
    serviceId: body.service_id
  });

  if (!result) {
    logToolCall({
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

  logToolCall({
    toolName: "estimate_price",
    status: "success",
    input: body as Record<string, unknown>,
    output: response,
    contactId: body.contact_id
  });

  return NextResponse.json(response);
}
