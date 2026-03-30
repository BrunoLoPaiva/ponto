import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateToken } from "@/lib/jwt";

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username e Password obrigatórios." },
        { status: 400 },
      );
    }

    // Lógica simulada de LDAP (ajuste com seu authenticateLDAP real depois)
    let user = { username, name: username };

    if (password !== "password" && password !== "123") {
      return NextResponse.json(
        { success: false, message: "Credenciais inválidas." },
        { status: 401 },
      );
    }

    const db = await getDb();

    const isRh = await db.get("SELECT 1 FROM rh_users WHERE username = ?", [
      user.username,
    ]);
    const role = isRh ? "RH" : "USER";

    let dbUser = await db.get("SELECT * FROM users WHERE username = ?", [
      user.username,
    ]);
    if (!dbUser) {
      await db.run(
        "INSERT INTO users (username, name, role, last_login) VALUES (?, ?, ?, ?)",
        [user.username, user.name, role, new Date().toISOString()],
      );
    } else {
      await db.run(
        "UPDATE users SET last_login = ?, role = ? WHERE username = ?",
        [new Date().toISOString(), role, user.username],
      );
    }

    dbUser = await db.get("SELECT * FROM users WHERE username = ?", [
      user.username,
    ]);

    // Simplificando verificação de supervisor para o exemplo
    dbUser.isSupervisor = (await db.get(
      "SELECT 1 FROM punch_adjustments WHERE nome_chefia LIKE ? LIMIT 1",
      [`%${username}%`],
    ))
      ? true
      : false;

    const token = generateToken(dbUser);
    return NextResponse.json({ success: true, token, user: dbUser });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
