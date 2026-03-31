import nodemailer from "nodemailer";
import { getDb } from "@/lib/db";

const transporter = nodemailer.createTransport({
  host: "10.0.0.10",
  port: 25,
  secure: false,
  tls: { rejectUnauthorized: false },
});

const SYSTEM_EMAIL = '"RH ViaRondon" <ponto@viarondon.com.br>';
const DOMAIN = "@viarondon.com.br";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const generateEmailHtml = (titulo, mensagem) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
  </head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  
  <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f1f5f9; margin: 0; padding: 0; width: 100%;">
    <tr>
      <td align="center" style="padding: 40px 15px;">
        
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          
          <tr>
            <td align="center" style="background-color: #1e1b4b; padding: 35px 20px; border-bottom: 4px solid #4f46e5;">
              <h1 style="color: #ffffff; font-family: Arial, sans-serif; font-size: 24px; margin: 0; font-weight: bold; text-align: center; letter-spacing: -0.5px;">
                ViaRondon
              </h1>
              <p style="color: #c7d2fe; font-family: Arial, sans-serif; font-size: 14px; margin: 5px 0 0 0; text-align: center; font-weight: 500;">
                Gestão de Ponto Eletrônico
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 40px 15px 40px; text-align: center;">
              <h2 style="color: #0f172a; font-family: Arial, sans-serif; font-size: 20px; margin: 0; font-weight: bold;">
                ${titulo}
              </h2>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 30px 40px; color: #475569; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; text-align: left;">
              ${mensagem}
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 10px 40px 45px 40px;">
              <div>
                <a href="${APP_URL}" style="background-color:#4f46e5; border-radius:5px; color:#ffffff; display:inline-block; font-family:Arial, sans-serif; font-size:16px; font-weight:bold; line-height:48px; text-align:center; text-decoration:none; width:260px; -webkit-text-size-adjust:none;">
                  Acessar Plataforma
                </a>
                </div>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f8fafc; padding: 25px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #64748b; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; margin: 0;">
                Este é um aviso automático gerado pelo <strong>Sistema de Assinatura ViaRondon</strong>.<br>
                Por favor, não responda a este e-mail. Caso tenha dúvidas, procure o departamento de Recursos Humanos.
              </p>
            </td>
          </tr>

        </table>
        
        </td>
    </tr>
  </table>

</body>
</html>
`;

/**
 * Função mestra: busca o template no banco, substitui {{nome}} e dispara o e-mail.
 */
async function dispararEmail(usernameTarget, nomeTarget, tipoTemplate) {
  if (!usernameTarget) return;
  const email = `${usernameTarget}${DOMAIN}`;

  try {
    const db = await getDb();
    const template = await db.get(
      "SELECT * FROM email_templates WHERE tipo = ?",
      [tipoTemplate]
    );
    if (!template) {
      console.warn(`[mailer] Template "${tipoTemplate}" não encontrado no banco.`);
      return;
    }

    const assuntoPersonalizado = template.assunto.replace(/{{nome}}/g, nomeTarget);
    const corpoPersonalizado = template.corpo.replace(/{{nome}}/g, `<strong>${nomeTarget}</strong>`);

    await transporter.sendMail({
      from: SYSTEM_EMAIL,
      to: email,
      subject: assuntoPersonalizado,
      html: generateEmailHtml(assuntoPersonalizado, corpoPersonalizado),
    });
  } catch (error) {
    console.error(`[mailer] Erro ao enviar [${tipoTemplate}] para ${email}:`, error);
  }
}

// ── Exportações ─────────────────────────────────────────────────────────────
export const notifyEmployee = (username, nome) =>
  dispararEmail(username, nome, "NOVO_AJUSTE_COLABORADOR");
export const notifySupervisor = (username, nome) =>
  dispararEmail(username, nome, "NOVO_AJUSTE_CHEFIA");
export const notifyController = (username) =>
  dispararEmail(username, "Controlador", "NOVO_AJUSTE_CONTROLADOR");
export const sendReminder = (username, nome) =>
  dispararEmail(username, nome, "LEMBRETE_PENDENCIA");