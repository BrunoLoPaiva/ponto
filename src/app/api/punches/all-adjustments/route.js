import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role?.toUpperCase() !== "RH") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const db = await getDb();
    const results = await db.all(
      "SELECT * FROM punch_adjustments ORDER BY id DESC",
    );

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error("Erro ao buscar registros RH:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
