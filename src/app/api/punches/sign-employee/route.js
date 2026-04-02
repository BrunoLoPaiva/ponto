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

    // 1. Captura os dados de auditoria do request
    const rawIp =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "IP Local/Desconhecido";
    const ipFuncionario = rawIp.trim();
    const rawUa = req.headers.get("user-agent") || "Navegador Desconhecido";
    const userAgentFuncionario = parseUserAgent(rawUa);

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
