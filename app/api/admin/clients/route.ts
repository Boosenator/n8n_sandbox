import { NextRequest, NextResponse } from "next/server";
import { deleteClientItem, getAdminSnapshot, upsertClientItem } from "@/lib/sandbox-store";
import { ClientRecord } from "@/lib/types";

export async function GET() {
  return NextResponse.json({
    ok: true,
    items: getAdminSnapshot().clients
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

  const item = upsertClientItem({
    ...body,
    name: body.name.trim(),
    phone: body.phone.trim(),
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

  deleteClientItem(id);

  return NextResponse.json({ ok: true });
}
