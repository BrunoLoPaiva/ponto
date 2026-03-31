import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/apiAuth";
import crypto from "crypto";

export async function POST(req) {
  try {
    const user = getAuthUser(req);
    if (!user)
      return NextResponse.json({ error: "Acesso negado." }, { status: 401 });

    const { id, abonado, supervisor_font } = await req.json();
    if (!id)
      return NextResponse.json(
        { error: "ID do ajuste é obrigatório." },
        { status: 400 },
      );

    const abonadoInt = abonado === true ? 1 : abonado === false ? 0 : null;
    const now = new Date().toISOString();

    // 1. Dados de Auditoria do Gestor
    const ipSupervisor =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "IP Local/Desconhecido";
    const userAgentSupervisor =
      req.headers.get("user-agent") || "Navegador Desconhecido";

    // 2. Geração do Código de Autenticidade (Hash Único)
    const hashValidacao = crypto.randomUUID();

    const db = await getDb();
    const result = await db.run(
      `UPDATE punch_adjustments 
       SET supervisor_signature_date = ?, abonado = ?, status = 'CONCLUIDO',
           ip_supervisor = ?, user_agent_supervisor = ?, hash_validacao = ?,
           supervisor_signature_font = ?, nome_chefia_completo = ?
       WHERE id = ? AND status = 'PENDENTE_CHEFIA' AND nome_chefia LIKE ?`,
      [
        now,
        abonadoInt,
        ipSupervisor,
        userAgentSupervisor,
        hashValidacao,
        supervisor_font || null,
        user.name || user.username,
        id,
        `%${user.username}%`,
      ],
    );

    if (result.changes === 0)
      return NextResponse.json(
        { error: "Ajuste não encontrado ou já assinado." },
        { status: 404 },
      );

    return NextResponse.json({
      success: true,
      message: "Aprovado e selado com sucesso.",
    });
  } catch (error) {
    console.error("Erro sign-supervisor:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
