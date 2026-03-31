import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/apiAuth";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

const STATUS_LABEL = {
  PENDENTE_FUNCIONARIO: "Aguardando Funcionário",
  PENDENTE_CHEFIA: "Aguardando Gestor",
  CONCLUIDO: "Concluído",
};

export async function GET(req) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role?.toUpperCase() !== "RH") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const mes    = searchParams.get("mes");
    const cr     = searchParams.get("cr");
    const busca  = searchParams.get("busca");

    let query = "SELECT * FROM punch_adjustments WHERE 1=1";
    const params = [];

    if (status) { query += " AND status = ?"; params.push(status); }
    if (cr)     { query += " AND nome_cr = ?"; params.push(cr); }
    if (busca)  {
      query += " AND (nome_completo LIKE ? OR matricula LIKE ? OR username LIKE ?)";
      params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
    }
    if (mes) {
      // data_registro is stored as DD/MM/YYYY — filter by /MM/YYYY
      query += " AND data_registro LIKE ?";
      params.push(`%/${mes}`);
    }

    query += " ORDER BY id DESC";

    const db = await getDb();
    const rows = await db.all(query, params);

    const sheetData = rows.map((r) => ({
      "ID":              r.id,
      "Data Registro":   r.data_registro,
      "Nome Completo":   r.nome_completo,
      "Matrícula":       r.matricula,
      "Username":        r.username,
      "CR / Depto":      r.nome_cr,
      "Gestor":          r.nome_chefia_completo || r.nome_chefia,
      "Status":          STATUS_LABEL[r.status] ?? r.status,
      "Batidas Orig.":   r.batidas_originais,
      "Batidas Corrig.": r.batidas_corrigidas,
      "Justificativa":   r.justificativa,
      "Assinado Func.":  r.employee_signature_date ? "Sim" : "Não",
      "Assinado Gestor": r.supervisor_signature_date ? "Sim" : "Não",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetData);

    // Column widths
    ws["!cols"] = [
      { wch: 6 }, { wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 16 },
      { wch: 22 }, { wch: 22 }, { wch: 24 }, { wch: 30 }, { wch: 30 },
      { wch: 40 }, { wch: 14 }, { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Ajustes");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="relatorio_ponto_${new Date().toISOString().slice(0,10)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Erro ao exportar:", error);
    return NextResponse.json({ error: "Erro ao gerar relatório" }, { status: 500 });
  }
}
