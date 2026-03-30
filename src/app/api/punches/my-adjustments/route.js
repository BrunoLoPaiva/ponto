import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/apiAuth";

export async function GET(req) {
  const user = getAuthUser(req);
  if (!user)
    return NextResponse.json({ error: "Acesso negado." }, { status: 401 });

  try {
    const db = await getDb();
    const results = await db.all(
      "SELECT * FROM punch_adjustments WHERE username = ? ORDER BY id DESC",
      [user.username],
    );
    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
