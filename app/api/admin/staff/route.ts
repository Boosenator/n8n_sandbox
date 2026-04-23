import { NextRequest, NextResponse } from "next/server";
import {
  deleteStaffMember,
  getAdminSnapshot,
  upsertStaffMember
} from "@/lib/sandbox-store";
import { StaffMember } from "@/lib/types";

export async function GET() {
  return NextResponse.json({
    ok: true,
    items: getAdminSnapshot().staff
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<StaffMember> & { name?: string };

  if (!body.name?.trim()) {
    return NextResponse.json(
      { ok: false, error: "name is required" },
      { status: 400 }
    );
  }

  const item = upsertStaffMember({
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

  deleteStaffMember(id);

  return NextResponse.json({ ok: true });
}
