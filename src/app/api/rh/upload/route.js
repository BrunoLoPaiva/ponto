import { notifyEmployee, notifyController } from "@/lib/mailer";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/apiAuth";
import * as xlsx from "xlsx";

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

export async function POST(req) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role?.toUpperCase() !== "RH") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado." },
        { status: 400 },
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "O arquivo excede o limite de memória (5MB)." },
        { status: 413 },
      );
    }

    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: "",
    });

    const db = await getDb();

    let insertedCount = 0;
    let duplicatedCount = 0;

    const funcionariosNotificados = new Map();
    const controladoresNotificados = new Set();

    for (const row of data) {
      const nomeCompleto = row["Nome"] || row["Funcionário"] || "";
      if (!nomeCompleto) continue;

      const nomeCr = row["Nome CR"] || row["Departamento"] || "";
      // Pegamos o nome exato da chefia:
      const nomeChefiaStr = row["Nome Chefia"] || row["Nome Gestor"] || "";
      const nomeControladorStr =
        row["NOME CONTROLADOR"] || row["Nome Controlador"] || "";
      let matricula = String(row["Matrícula"] || row["Matricula"] || "")
        .trim()
        .replace(".0", "");
      const descricaoHorario =
        row["Descrição Horário"] || row["Descricao Horario"] || "";
      const dataRegistro = parseExcelDate(row["Data"] || row["DATA"]);
      const dia = row["Dia"] || row["DIA"] || "";

      const usernameFuncionario = generateUsername(nomeCompleto);
      const usernameControlador = generateUsername(nomeControladorStr);

      let batidas = [];
      Object.keys(row)
        .filter((key) => key.toLowerCase().startsWith("batida"))
        .forEach((key) => {
          const val = String(row[key] || "").trim();
          if (val) {
            batidas.push(...val.split(/\s+/));
          }
        });

      const jaExiste = await db.get(
        `SELECT id FROM punch_adjustments WHERE matricula = ? AND data_registro = ?`,
        [matricula, dataRegistro],
      );

      if (jaExiste) {
        duplicatedCount++;
        continue;
      }

      await db.run(
        `
        INSERT INTO punch_adjustments (
          nome_cr, nome_chefia, nome_controlador, matricula, nome_completo, 
          username, descricao_horario, data_registro, dia, batidas_originais, status
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          nomeCr,
          nomeChefiaStr, // CORREÇÃO: Salva o nome COMPLETO do Gestor
          usernameControlador || nomeControladorStr,
          matricula,
          nomeCompleto.toUpperCase(),
          usernameFuncionario,
          descricaoHorario,
          dataRegistro,
          dia,
          JSON.stringify(batidas),
          "PENDENTE_FUNCIONARIO",
        ],
      );

      insertedCount++;

      if (usernameFuncionario) {
        if (!funcionariosNotificados.has(usernameFuncionario)) {
          funcionariosNotificados.set(usernameFuncionario, nomeCompleto);
        }
      }

      if (usernameControlador) {
        controladoresNotificados.add(usernameControlador);
      }
    }

    const emailPromises = [];

    funcionariosNotificados.forEach((nomeReal, username) => {
      emailPromises.push(
        notifyEmployee(username, nomeReal).catch(console.error),
      );
    });

    controladoresNotificados.forEach((usernameControlador) => {
      emailPromises.push(
        notifyController(usernameControlador).catch(console.error),
      );
    });

    Promise.all(emailPromises).catch((err) => 
      console.error("Erro no envio de emails em background:", err)
    );

    return NextResponse.json({
      success: true,
      message: `Processamento concluído. ${insertedCount} novos registros importados. ${duplicatedCount > 0 ? `(${duplicatedCount} ignorados por já existirem)` : ""}`,
    });
  } catch (error) {
    console.error("Erro no upload:", error);
    return NextResponse.json(
      { error: "Erro ao processar o arquivo. Verifique o formato." },
      { status: 500 },
    );
  }
}