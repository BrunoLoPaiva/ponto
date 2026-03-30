import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/apiAuth";
import { sendReminder } from "@/lib/mailer";

export async function POST(req) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });

    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ error: "Username obrigatório." }, { status: 400 });
    }

    // Busca o nome real do colaborador para personalizar o e-mail
    const db = await getDb();
    const row = await db.get("SELECT nome_completo FROM punch_adjustments WHERE username = ? LIMIT 1", [username]);

    if (!row) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    await sendReminder(username, row.nome_completo);

    return NextResponse.json({ success: true, message: "Lembrete enviado com sucesso!" });
  } catch (error) {
    console.error("Erro ao enviar lembrete:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
