import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/apiAuth";
import { notifySupervisor } from "@/lib/mailer";
import fs from "fs/promises";
import path from "path";

export async function POST(req) {
  try {
    const user = getAuthUser(req);
    if (!user)
      return NextResponse.json({ error: "Acesso negado." }, { status: 401 });

    const formData = await req.formData();
    const id = formData.get("id");

    const batidas_corrigidas = JSON.parse(
      formData.get("batidas_corrigidas") || "[]",
    );
    const marcacoes_faltantes = JSON.parse(
      formData.get("marcacoes_faltantes") || "[]",
    );
    const justificativa = formData.get("justificativa") || "";
    const signature_font = formData.get("signature_font") || "";
    const banco_horas = formData.get("banco_horas") === "true" ? 1 : 0;

    // Processamento do Anexo
    const file = formData.get("file");
    let anexo_path = null;

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadDir = path.join(process.cwd(), "uploads");
      await fs.mkdir(uploadDir, { recursive: true });

      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      anexo_path = `uploads/${fileName}`; // Path relativo

      await fs.writeFile(path.join(uploadDir, fileName), buffer);
    }

    // 1. Captura os dados de auditoria do request
    const ipFuncionario =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "IP Local/Desconhecido";
    const userAgentFuncionario =
      req.headers.get("user-agent") || "Navegador Desconhecido";

    const db = await getDb();

    const result = await db.run(
      `UPDATE punch_adjustments 
       SET batidas_corrigidas = ?, marcacoes_faltantes = ?, justificativa = ?, 
           employee_signature_date = ?, status = 'PENDENTE_CHEFIA',
           ip_funcionario = ?, user_agent_funcionario = ?,
           signature_font = ?, banco_horas = ?, anexo_path = ?
       WHERE id = ? AND status = 'PENDENTE_FUNCIONARIO' AND username = ?`,
      [
        JSON.stringify(batidas_corrigidas),
        JSON.stringify(marcacoes_faltantes),
        justificativa,
        new Date().toISOString(),
        ipFuncionario,
        userAgentFuncionario,
        signature_font || null,
        banco_horas,
        anexo_path,
        id,
        user.username,
      ],
    );

    if (result.changes === 0)
      return NextResponse.json(
        { error: "Ajuste não encontrado, não autorizado ou já assinado." },
        { status: 404 },
      );

    // Dispara e-mail para o supervisor
    const row = await db.get(
      `SELECT nome_chefia, nome_completo FROM punch_adjustments WHERE id = ?`,
      [id],
    );
    if (row && row.nome_chefia) {
      notifySupervisor(row.nome_chefia, row.nome_completo).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      message: "Assinado com sucesso e registrado log de auditoria.",
    });
  } catch (error) {
    console.error("Erro sign-employee:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
