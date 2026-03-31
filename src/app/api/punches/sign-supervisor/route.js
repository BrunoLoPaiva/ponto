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

    const ipSupervisor =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "IP Local/Desconhecido";
    const userAgentSupervisor =
      req.headers.get("user-agent") || "Navegador Desconhecido";

    const hashValidacao = crypto.randomUUID();

    // Se user.name for nulo ou for igual ao login (com ponto), usamos null para forçar o sistema a usar o nome da planilha.
    const nomeChefiaValido = user.name && !user.name.includes('.') ? user.name : null;

    const db = await getDb();
    const result = await db.run(
      `UPDATE punch_adjustments 
       SET supervisor_signature_date = ?, abonado = ?, status = 'CONCLUIDO',
           ip_supervisor = ?, user_agent_supervisor = ?, hash_validacao = ?,
           supervisor_signature_font = ?, 
           nome_chefia_completo = COALESCE(?, nome_chefia)
       WHERE id = ? AND status = 'PENDENTE_CHEFIA' AND nome_chefia LIKE ?`,
      [
        now,
        abonadoInt,
        ipSupervisor,
        userAgentSupervisor,
        hashValidacao,
        supervisor_font || null,
        nomeChefiaValido,
        id,
        `%${user.username.split(".")[0]}%`, // Deixa a busca flexível para aprovação
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