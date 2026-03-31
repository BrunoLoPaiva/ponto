import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

let dbPromise = globalThis._sqliteDbPromise;

export async function getDb() {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const dbPath = path.join(process.cwd(), "database.sqlite");
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    await db.exec(`
      PRAGMA foreign_keys = 1;
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA cache_size = 2000;
      PRAGMA busy_timeout = 5000;
      PRAGMA temp_store = MEMORY;
    `);

    await initSchema(db);
    return db;
  })();

  globalThis._sqliteDbPromise = dbPromise;
  return dbPromise;
}

async function initSchema(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'USER',
      last_login DATETIME
    );
    CREATE TABLE IF NOT EXISTS rh_users (username TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS punch_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_cr TEXT, nome_chefia TEXT, nome_controlador TEXT, 
      username_chefia TEXT, username_controlador TEXT,
      matricula TEXT,
      nome_completo TEXT, username TEXT, descricao_horario TEXT, data_registro TEXT,
      dia TEXT, batidas_originais TEXT, batidas_corrigidas TEXT, marcacoes_faltantes TEXT,
      justificativa TEXT, status TEXT DEFAULT 'PENDENTE_FUNCIONARIO',
      abonado INTEGER, 
      employee_signature_date TEXT, 
      supervisor_signature_date TEXT,
      ip_funcionario TEXT,
      user_agent_funcionario TEXT,
      ip_supervisor TEXT,
      user_agent_supervisor TEXT,
      hash_validacao TEXT UNIQUE,
      signature_font TEXT
    );

    CREATE TABLE IF NOT EXISTS email_templates (
      tipo TEXT PRIMARY KEY,
      assunto TEXT,
      corpo TEXT
    );
  `);

  const temTemplates = await db.get(
    "SELECT COUNT(*) as count FROM email_templates",
  );
  if (temTemplates.count === 0) {
    await db.exec(`
      INSERT INTO email_templates (tipo, assunto, corpo) VALUES
      ('NOVO_AJUSTE_COLABORADOR', 'Ação Requerida: Assinatura de Justificativa de Ponto', 'Prezado(a) {{nome}},<br><br>Informamos que um novo formulário de justificativa de não marcação de ponto foi gerado e requer a sua validação e assinatura digital.<br><br>Por favor, acesse o sistema para revisar os dados e concluir o processo o mais breve possível.'),
      ('NOVO_AJUSTE_CHEFIA', 'Aprovação Pendente: Justificativa de Ponto - {{nome}}', 'Prezado(a) Gestor(a),<br><br>O(a) colaborador(a) {{nome}} preencheu e assinou digitalmente uma justificativa de não marcação de ponto.<br><br>A solicitação encontra-se disponível no seu painel para análise e assinatura.'),
      ('LEMBRETE_PENDENCIA', 'Lembrete: Pendência de Assinatura de Ponto', 'Prezado(a) {{nome}},<br><br>Este é um lembrete automático de que você possui formulários de justificativa de ponto aguardando a sua assinatura digital no sistema.<br><br>Solicitamos a gentileza de regularizar esta pendência com urgência, a fim de evitar impactos no fechamento da folha de pagamento.'),
      ('NOVO_AJUSTE_CONTROLADOR', 'Notificação: Novos Registros de Ponto para Colaboradores da sua Área', 'Prezado(a) Controlador(a),<br><br>Notificamos que novos formulários de ajuste de ponto foram gerados para os colaboradores alocados nas áreas sob a sua supervisão.<br><br>O progresso das assinaturas e aprovações pode ser acompanhado diretamente pelo seu painel de controle.')
    `);
  }

  const migrations = [
    "ALTER TABLE punch_adjustments ADD COLUMN signature_font TEXT",
    "ALTER TABLE punch_adjustments ADD COLUMN supervisor_signature_font TEXT",
    "ALTER TABLE punch_adjustments ADD COLUMN nome_chefia_completo TEXT",
    "ALTER TABLE punch_adjustments ADD COLUMN ip_funcionario TEXT",
    "ALTER TABLE punch_adjustments ADD COLUMN user_agent_funcionario TEXT",
    "ALTER TABLE punch_adjustments ADD COLUMN ip_supervisor TEXT",
    "ALTER TABLE punch_adjustments ADD COLUMN user_agent_supervisor TEXT",
    "ALTER TABLE punch_adjustments ADD COLUMN hash_validacao TEXT",
    "ALTER TABLE punch_adjustments ADD COLUMN abonado INTEGER",
    "ALTER TABLE punch_adjustments ADD COLUMN anexo_path TEXT",
    "ALTER TABLE punch_adjustments ADD COLUMN banco_horas INTEGER DEFAULT 0",
    "ALTER TABLE punch_adjustments ADD COLUMN username_chefia TEXT",
    "ALTER TABLE punch_adjustments ADD COLUMN username_controlador TEXT",
  ];

  for (const sql of migrations) {
    try {
      await db.exec(sql);
    } catch {
      // Ignora se a coluna já existir
    }
  }
}
