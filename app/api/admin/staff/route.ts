import { NextRequest, NextResponse } from "next/server";
import { deleteAdminStaff, getAdminStaff, upsertAdminStaff } from "@/lib/supabase-admin";
import { StaffMember } from "@/lib/types";

export async function GET() {
  return NextResponse.json({
    ok: true,
    items: await getAdminStaff()
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

  const item = await upsertAdminStaff({
    ...body,
    name: body.name.trim(),
    serviceIds: body.serviceIds ?? []
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

  await deleteAdminStaff(id);

  return NextResponse.json({ ok: true });
}
