import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role?.toUpperCase() !== "RH")
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

    const db = await getDb();
    // Busca os usuários RH e faz um JOIN para tentar pegar o Nome Completo caso ele já tenha logado no sistema
    const members = await db.all(`
      SELECT r.username, u.name as nome_completo 
      FROM rh_users r 
      LEFT JOIN users u ON r.username = u.username
    `);

    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao buscar membros." },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role?.toUpperCase() !== "RH")
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

    let { username } = await req.json();
    username = username.toLowerCase().trim().split("@")[0];

    if (!username)
      return NextResponse.json(
        { error: "Username é obrigatório." },
        { status: 400 },
      );

    const db = await getDb();
    await db.run("INSERT OR IGNORE INTO rh_users (username) VALUES (?)", [
      username,
    ]);
    await db.run("UPDATE users SET role = 'RH' WHERE username = ?", [username]);

    return NextResponse.json({
      success: true,
      message: "Acesso concedido com sucesso!",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao adicionar membro." },
      { status: 500 },
    );
  }
}

export async function DELETE(req) {
  try {
    const user = getAuthUser(req);
    if (!user || user.role?.toUpperCase() !== "RH")
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (username === user.username) {
      return NextResponse.json(
        { error: "Você não pode remover a si mesmo." },
        { status: 400 },
      );
    }

    const db = await getDb();
    await db.run("DELETE FROM rh_users WHERE username = ?", [username]);
    await db.run("UPDATE users SET role = 'USER' WHERE username = ?", [
      username,
    ]);

    return NextResponse.json({ success: true, message: "Acesso revogado." });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao remover membro." },
      { status: 500 },
    );
  }
}
