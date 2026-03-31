import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role?.toUpperCase() !== "RH") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

    const db = await getDb();
    const templates = await db.all("SELECT * FROM email_templates");
    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error("Erro ao buscar templates:", error);
    return NextResponse.json({ error: "Erro ao buscar templates" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role?.toUpperCase() !== "RH") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

    const { tipo, assunto, corpo } = await req.json();

    if (!tipo || !assunto || !corpo) {
      return NextResponse.json({ error: "Campos obrigatórios: tipo, assunto, corpo." }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.run("UPDATE email_templates SET assunto = ?, corpo = ? WHERE tipo = ?", [assunto, corpo, tipo]);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Template não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Template atualizado com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar template:", error);
    return NextResponse.json({ error: "Erro ao atualizar template" }, { status: 500 });
  }
}
