import { notifyEmployee, notifyController } from "@/lib/mailer";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/apiAuth";
import * as xlsx from "xlsx";

function toCamelCase(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (a) => a.toUpperCase())
    .replace(/\b(De|Da|Do|Das|Dos)\b/g, (match) => match.toLowerCase());
}

function generateUsername(input) {
  if (!input) return "";
  let clean = String(input).trim().toLowerCase();
  if (clean.includes("@")) return clean.split("@")[0];
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0]}.${parts[parts.length - 1]}`;
  return parts[0] || "";
}

function parseExcelDate(excelDate) {
  if (!excelDate) return "";
  if (typeof excelDate === "number") {
    const jsDate = new Date((excelDate - 25569) * 86400 * 1000);
    jsDate.setUTCMinutes(jsDate.getUTCMinutes() + jsDate.getTimezoneOffset());
    return `${String(jsDate.getDate()).padStart(2, "0")}/${String(jsDate.getMonth() + 1).padStart(2, "0")}/${jsDate.getFullYear()}`;
  }
  if (typeof excelDate === "string") {
    if (excelDate.includes("-")) {
      const parts = excelDate.split("T")[0].split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return excelDate.trim();
  }
  return String(excelDate);
}

// 1. APENAS LÊ O EXCEL E DEVOLVE PARA PRÉ-VISUALIZAÇÃO
export async function POST(req) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role?.toUpperCase() !== "RH")
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file)
      return NextResponse.json(
        { error: "Nenhum arquivo enviado." },
        { status: 400 },
      );
    if (file.size > 5 * 1024 * 1024)
      return NextResponse.json(
        { error: "O arquivo excede o limite de memória (5MB)." },
        { status: 413 },
      );

    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: "",
    });

    const parsedRecords = [];

    for (const row of data) {
      const nomeCompleto = toCamelCase(row["Nome"] || row["Funcionário"] || "");
      if (!nomeCompleto) continue;

      let batidas = [];
      Object.keys(row)
        .filter((key) => key.toLowerCase().startsWith("batida"))
        .forEach((key) => {
          const val = String(row[key] || "").trim();
          if (val) batidas.push(...val.split(/\s+/));
        });

      parsedRecords.push({
        nome_cr: row["Nome CR"] || row["Departamento"] || "",
        nome_chefia: toCamelCase(
          row["Nome Chefia"] || row["Nome Gestor"] || "",
        ),
        nome_controlador: toCamelCase(
          row["NOME CONTROLADOR"] || row["Nome Controlador"] || "",
        ),
        matricula: String(row["Matrícula"] || row["Matricula"] || "")
          .trim()
          .replace(".0", ""),
        nome_completo: nomeCompleto,
        descricao_horario:
          row["Descrição Horário"] || row["Descricao Horario"] || "",
        data_registro: parseExcelDate(row["Data"] || row["DATA"]),
        dia: row["Dia"] || row["DIA"] || "",
        batidas_originais: JSON.stringify(batidas),
      });
    }

    return NextResponse.json({ success: true, data: parsedRecords });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao processar o arquivo. Verifique o formato." },
      { status: 500 },
    );
  }
}

// 2. SALVA NO BANCO OS DADOS CONFIRMADOS E EDIDADOS PELO RH
export async function PUT(req) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role?.toUpperCase() !== "RH")
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

    const { records } = await req.json();
    if (!records || !Array.isArray(records))
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

    const db = await getDb();
    let insertedCount = 0;
    let duplicatedCount = 0;
    const funcionariosNotificados = new Map();
    const controladoresNotificados = new Set();

    for (const row of records) {
      // Recalcula os logins baseados no que o RH possa ter editado na tela
      const usernameFuncionario = generateUsername(row.nome_completo);
      const usernameChefia = generateUsername(row.nome_chefia);
      let usernameControlador = generateUsername(row.nome_controlador);

      if (
        usernameChefia &&
        usernameControlador &&
        usernameChefia === usernameControlador
      ) {
        usernameControlador = "";
        row.nome_controlador = "";
      }

      const jaExiste = await db.get(
        `SELECT id FROM punch_adjustments WHERE matricula = ? AND data_registro = ?`,
        [row.matricula, row.data_registro],
      );

      if (jaExiste) {
        duplicatedCount++;
        continue;
      }

      await db.run(
        `INSERT INTO punch_adjustments (
          nome_cr, nome_chefia, nome_controlador, username_chefia, username_controlador, 
          matricula, nome_completo, username, descricao_horario, data_registro, dia, batidas_originais, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE_FUNCIONARIO')`,
        [
          row.nome_cr,
          row.nome_chefia,
          row.nome_controlador,
          usernameChefia,
          usernameControlador,
          row.matricula,
          row.nome_completo,
          usernameFuncionario,
          row.descricao_horario,
          row.data_registro,
          row.dia,
          row.batidas_originais,
        ],
      );

      insertedCount++;
      if (usernameFuncionario)
        funcionariosNotificados.set(usernameFuncionario, row.nome_completo);
      if (usernameControlador)
        controladoresNotificados.add(usernameControlador);
    }

    const emailPromises = [];
    funcionariosNotificados.forEach((nomeReal, username) =>
      emailPromises.push(
        notifyEmployee(username, nomeReal).catch(console.error),
      ),
    );
    controladoresNotificados.forEach((usernameControlador) =>
      emailPromises.push(
        notifyController(usernameControlador).catch(console.error),
      ),
    );
    Promise.all(emailPromises).catch((err) =>
      console.error("Erro emails em background:", err),
    );

    return NextResponse.json({
      success: true,
      message: `${insertedCount} registros importados. ${duplicatedCount > 0 ? `(${duplicatedCount} ignorados por duplicidade)` : ""}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao salvar registros." },
      { status: 500 },
    );
  }
}
