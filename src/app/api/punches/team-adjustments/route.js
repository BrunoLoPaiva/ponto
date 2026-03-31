import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const user = getAuthUser(req);
    if (!user)
      return NextResponse.json({ error: "Acesso negado." }, { status: 401 });

    const managerUsername = user.username?.toLowerCase().trim() || "";
    // Separa o primeiro e último nome do usuário (ex: vinicius e parente)
    const [first, last] = managerUsername.split(".");

    const db = await getDb();
    const results = await db.all(
      "SELECT * FROM punch_adjustments WHERE status IN ('PENDENTE_FUNCIONARIO', 'PENDENTE_CHEFIA', 'CONCLUIDO') ORDER BY data_registro DESC",
    );

    // Função para remover acentos para a comparação ficar precisa
    const normalize = (str) =>
      str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

    const firstNorm = normalize(first);
    const lastNorm = normalize(last);

    // Filtra os resultados da equipe
    const filtered = results.filter((row) => {
      if (!row.nome_chefia) return false;
      const nomeChefiaDb = normalize(row.nome_chefia);
      
      // Se tiver primeiro e último nome (padrão de rede), verifica se o nome completo do banco contém ambos
      if (firstNorm && lastNorm) {
         return nomeChefiaDb.includes(firstNorm) && nomeChefiaDb.includes(lastNorm);
      }
      
      // Fallback seguro caso o login tenha apenas 1 nome
      return nomeChefiaDb.includes(managerUsername);
    });

    return NextResponse.json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (error) {
    console.error("Erro team-adjustments:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}