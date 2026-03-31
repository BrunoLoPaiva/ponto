import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/apiAuth";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });
    }

    const user = getAuthUser(req);
    if (!user)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const db = await getDb();
    const row = await db.get(
      `SELECT anexo_path, matricula, username, nome_chefia FROM punch_adjustments WHERE id = ?`,
      [id],
    );

    if (!row || !row.anexo_path) {
      return NextResponse.json(
        { error: "Anexo não encontrado" },
        { status: 404 },
      );
    }

    const tokenUsername = user.username?.toLowerCase() || "";
    const tokenName = user.name?.toLowerCase() || "";
    const docUsername = row.username?.toLowerCase() || "";
    const docChefia = row.nome_chefia?.toLowerCase() || "";

    const isOwner = tokenUsername === docUsername;
    const isManager =
      tokenName.includes(docChefia) || tokenUsername === docChefia;
    const isRH = user.role?.toUpperCase() === "RH";

    if (!isOwner && !isManager && !isRH) {
      return NextResponse.json(
        { error: "Acesso negado ao anexo" },
        { status: 403 },
      );
    }

    if (!row || !row.anexo_path) {
      return NextResponse.json(
        { error: "Anexo não encontrado" },
        { status: 404 },
      );
    }

    const filePath = path.join(process.cwd(), row.anexo_path);
    const fileBuffer = await fs.readFile(filePath);

    // Mime type guessing
    const ext = path.extname(filePath).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".pdf") contentType = "application/pdf";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
      },
    });
  } catch (error) {
    console.error("Erro ao servir anexo:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar anexo" },
      { status: 500 },
    );
  }
}
