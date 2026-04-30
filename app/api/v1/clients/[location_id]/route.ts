import { NextRequest, NextResponse } from "next/server";
import { createClientFromTool, logToolTrace } from "@/lib/supabase-admin";

// Mirrors: POST https://api.alteg.io/api/v1/clients/{location_id}
// Body: { name, phone, comment? }
// Header for logging: X-Contact-Id
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ location_id: string }> }
) {
  await params;
  const contactId = request.headers.get("x-contact-id") ?? undefined;

  const body = (await request.json()) as {
    name?: string;
    phone?: string;
    comment?: string;
  };

  if (!body.name?.trim() || !body.phone?.trim()) {
    await logToolTrace({
      toolName: "create_client",
      status: "error",
      input: body as Record<string, unknown>,
      output: { error: "name and phone are required" },
      contactId
    });
    return NextResponse.json(
      { success: false, error: "name and phone are required" },
      { status: 400 }
    );
  }

  const client = await createClientFromTool({
    name: body.name.trim(),
    phone: body.phone.trim(),
    notes: body.comment
  });

  if (!client) {
    return NextResponse.json(
      { success: false, error: "client_creation_failed" },
      { status: 500 }
    );
  }

  const response = {
    success: true,
    data: {
      id: client.id,
      name: client.name,
      phone: client.phone,
      visits_count: client.visitCount,
      tags: client.tags,
      comment: client.notes
    }
  };

  await logToolTrace({
    toolName: "create_client",
    status: "success",
    input: body as Record<string, unknown>,
    output: response,
    contactId
  });

  return NextResponse.json(response, { status: 201 });
}
