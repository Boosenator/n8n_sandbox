import { NextRequest, NextResponse } from "next/server";
import {
  deleteServiceItem,
  getAdminSnapshot,
  upsertServiceItem
} from "@/lib/sandbox-store";
import { ServiceItem } from "@/lib/types";

export async function GET() {
  return NextResponse.json({
    ok: true,
    items: getAdminSnapshot().services
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<ServiceItem> & { name?: string };

  if (!body.name?.trim()) {
    return NextResponse.json(
      { ok: false, error: "name is required" },
      { status: 400 }
    );
  }

  const item = upsertServiceItem({
    ...body,
    name: body.name.trim()
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

  deleteServiceItem(id);

  return NextResponse.json({ ok: true });
}
