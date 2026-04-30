import { NextRequest, NextResponse } from "next/server";
import { findClient, logToolTrace } from "@/lib/supabase-admin";

// Mirrors: POST https://api.alteg.io/api/v1/company/{location_id}/clients/search
// Body: { phone?, name?, page?, count? }
// Header for logging: X-Contact-Id
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ location_id: string }> }
) {
  await params;
  const contactId = request.headers.get("x-contact-id") ?? undefined;

  const body = (await request.json().catch(() => ({}))) as {
    phone?: string;
    name?: string;
    page?: number;
    count?: number;
  };

  const client = await findClient({ phone: body.phone, name: body.name });

  const response = {
    success: true,
    data: client
      ? [
          {
            id: client.id,
            name: client.name,
            phone: client.phone,
            visits_count: client.visitCount,
            tags: client.tags,
            comment: client.notes
          }
        ]
      : [],
    meta: { total_count: client ? 1 : 0, page: body.page ?? 1, count: body.count ?? 25 }
  };

  await logToolTrace({
    toolName: "find_client",
    status: "success",
    input: body as Record<string, unknown>,
    output: response,
    contactId
  });

  return NextResponse.json(response);
}
