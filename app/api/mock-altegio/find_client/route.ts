import { NextRequest, NextResponse } from "next/server";
import { findClient, logToolCall } from "@/lib/sandbox-store";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    phone?: string;
    name?: string;
    contact_id?: string;
  };

  const client = findClient({
    phone: body.phone,
    name: body.name
  });

  const response = {
    success: true,
    data: client
      ? {
          id: client.id,
          name: client.name,
          phone: client.phone,
          visit_count: client.visitCount,
          tags: client.tags,
          notes: client.notes
        }
      : null
  };

  logToolCall({
    toolName: "find_client",
    status: "success",
    input: body as Record<string, unknown>,
    output: response,
    contactId: body.contact_id
  });

  return NextResponse.json(response);
}
