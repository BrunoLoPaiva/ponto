import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/apiAuth";
import crypto from "crypto";

// Função auxiliar para traduzir o User-Agent
const parseUserAgent = (ua) => {
  if (!ua || ua === "Navegador Desconhecido") return ua;
  let browser = "Navegador Desconhecido";
  let os = "SO Desconhecido";

  if (ua.includes("Edg")) browser = "Microsoft Edge";
  else if (ua.includes("Chrome")) browser = "Google Chrome";
  else if (ua.includes("Firefox")) browser = "Mozilla Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome"))
    browser = "Apple Safari";

  if (ua.includes("Windows NT 10.0")) os = "Windows 10/11";
  else if (ua.includes("Windows NT 6.")) os = "Windows 7/8";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return `${browser} em ${os}`;
};

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

    const rawIp =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "IP Local/Desconhecido";
    const ipSupervisor = rawIp.trim();
    const rawUa = req.headers.get("user-agent") || "Navegador Desconhecido";
    const userAgentSupervisor = parseUserAgent(rawUa);

    const db = await getDb();

    // 1. Buscar os dados do documento para criar a assinatura criptográfica
    const doc = await db.get(
      `SELECT username, data_registro, batidas_corrigidas, justificativa, employee_signature_date 
       FROM punch_adjustments 
       WHERE id = ? AND status = 'PENDENTE_CHEFIA' AND username_chefia = ?`,
      [id, user.username],
    );

    if (!doc) {
      return NextResponse.json(
        { error: "Ajuste não encontrado, não autorizado ou já assinado." },
        { status: 404 },
      );
    }

    // 2. Criar a "Impressão Digital" (Payload) do documento
    const payloadDocumento = JSON.stringify({
      document_id: id,
      colaborador: doc.username,
      data_ocorrencia: doc.data_registro,
      batidas: doc.batidas_corrigidas,
      justificativa: doc.justificativa,
      data_assinatura_colaborador: doc.employee_signature_date,
      data_assinatura_gestor: now,
      parecer_gestor: abonadoInt,
    });

    // 3. Gerar o Hash SHA-256 irreversível
    const hashValidacao = crypto
      .createHash("sha256")
      .update(payloadDocumento)
      .digest("hex");

    const nomeChefiaValido =
      user.name && !user.name.includes(".") ? user.name : null;

    // 4. Guardar tudo na base de dados
    const result = await db.run(
      `UPDATE punch_adjustments 
       SET supervisor_signature_date = ?, abonado = ?, status = 'CONCLUIDO',
           ip_supervisor = ?, user_agent_supervisor = ?, hash_validacao = ?,
           supervisor_signature_font = ?, 
           nome_chefia_completo = COALESCE(?, nome_chefia)
       WHERE id = ? AND status = 'PENDENTE_CHEFIA' AND username_chefia = ?`,
      [
        now,
        abonadoInt,
        ipSupervisor,
        userAgentSupervisor,
        hashValidacao,
        supervisor_font || null,
        nomeChefiaValido,
        id,
        user.username,
      ],
    );

    return NextResponse.json({
      success: true,
      message: "Aprovado e selado com sucesso.",
      hash: hashValidacao,
    });
  } catch (error) {
    console.error("Erro sign-supervisor:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
