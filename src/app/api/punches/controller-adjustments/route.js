import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const user = getAuthUser(req);
    if (!user)
      return NextResponse.json({ error: "Acesso negado." }, { status: 401 });

    const username = user.username?.toLowerCase() || "";

    const db = await getDb();
    const results = await db.all(
      "SELECT * FROM punch_adjustments WHERE status IN ('PENDENTE_FUNCIONARIO', 'PENDENTE_CHEFIA', 'CONCLUIDO') ORDER BY data_registro DESC",
    );

    // Filtra os resultados onde o nome_controlador bate com o username logado
    const filtered = results.filter((row) => {
      if (!row.nome_controlador) return false;
      const nomeControladorStr = row.nome_controlador.toLowerCase().trim();
      return (
        nomeControladorStr === username ||
        nomeControladorStr.includes(username.split(".")[0])
      );
    });

    return NextResponse.json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (error) {
    console.error("Erro controller-adjustments:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
