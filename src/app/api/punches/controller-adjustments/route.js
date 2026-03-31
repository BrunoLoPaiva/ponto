import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });

    const db = await getDb();
    const results = await db.all(
      `SELECT * FROM punch_adjustments 
       WHERE status IN ('PENDENTE_FUNCIONARIO', 'PENDENTE_CHEFIA', 'CONCLUIDO') 
       AND username_controlador = ? 
       ORDER BY data_registro DESC`,
      [user.username]
    );

    return NextResponse.json({ success: true, count: results.length, data: results });
  } catch (error) {
    console.error("Erro controller-adjustments:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
