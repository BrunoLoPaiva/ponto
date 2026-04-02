import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/apiAuth";

export async function PUT(req) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role?.toUpperCase() !== "RH")
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

    const data = await req.json();
    const { id, nome_completo, nome_chefia, username_chefia, nome_cr } = data;

    if (!id)
      return NextResponse.json({ error: "ID é obrigatório." }, { status: 400 });

    const db = await getDb();

    // Atualiza apenas as informações do ponto
    const result = await db.run(
      `
      UPDATE punch_adjustments 
      SET nome_completo = ?, nome_chefia = ?, username_chefia = ?, nome_cr = ?
      WHERE id = ? AND status != 'CONCLUIDO'
    `,
      [nome_completo, nome_chefia, username_chefia?.toLowerCase(), nome_cr, id],
    );

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Documento já concluído ou não encontrado." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Dados do ponto corrigidos com sucesso!",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao corrigir ponto." },
      { status: 500 },
    );
  }
}
