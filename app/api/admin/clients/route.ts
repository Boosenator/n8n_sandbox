import { NextRequest, NextResponse } from "next/server";
import { deleteAdminClient, getAdminClients, upsertAdminClient } from "@/lib/supabase-admin";
import { ClientRecord } from "@/lib/types";

export async function GET() {
  return NextResponse.json({
    ok: true,
    items: await getAdminClients()
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<ClientRecord> & {
    name?: string;
    phone?: string;
  };

  if (!body.name?.trim() || !body.phone?.trim()) {
    return NextResponse.json(
      { ok: false, error: "name and phone are required" },
      { status: 400 }
    );
  }

  const item = await upsertAdminClient({
    id: body.id,
    name: body.name.trim(),
    phone: body.phone.trim(),
    notes: body.notes ?? "",
    tags: body.tags ?? []
  });

  return NextResponse.json({ ok: true, item });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "id is required" },
      { status: 400 }
    );
  }

  await deleteAdminClient(id);

  return NextResponse.json({ ok: true });
}
