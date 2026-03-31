import nodemailer from "nodemailer";
import { getDb } from "@/lib/db";

const transporter = nodemailer.createTransport({
  host: "10.0.0.10",
  port: 25,
  secure: false,
  tls: { rejectUnauthorized: false },
});

const SYSTEM_EMAIL = '"Ajuste de Ponto" <ponto@viarondon.com.br>';
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

<body style="margin:0; padding:0; background-color:#f1f5f9; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">

<div style="display:none; max-height:0; overflow:hidden; font-size:1px; line-height:1px; color:#ffffff; opacity:0;">
  Você tem uma assinatura pendente no sistema.
</div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9; table-layout:fixed;">
  <tr>
    <td align="center" style="padding: 20px 10px;">

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background-color:#ffffff; border:1px solid #e2e8f0; margin:0 auto;">

        <tr>
          <td align="center" style="background-color:#1e1b4b; padding:30px 20px;">
            <span style="color:#ffffff; font-family:Arial, sans-serif; font-size:22px; font-weight:bold;">
              ViaRondon
            </span>
            <br>
            <span style="color:#c7d2fe; font-family:Arial, sans-serif; font-size:13px;">
              Gestão de Ponto Eletrônico
            </span>
          </td>
        </tr>

        <tr><td height="30" style="font-size:1px; line-height:1px;">&nbsp;</td></tr>

        <tr>
          <td align="center" style="padding:0 30px;">
            <span style="font-family:Arial, sans-serif; font-size:20px; color:#0f172a; font-weight:bold;">
              ${titulo}
            </span>
          </td>
        </tr>

        <tr><td height="15" style="font-size:1px; line-height:1px;">&nbsp;</td></tr>

        <tr>
          <td style="padding:0 30px; font-family:Arial, sans-serif; font-size:15px; color:#475569; line-height:1.6;">
            ${mensagem}
          </td>
        </tr>

        <tr><td height="30" style="font-size:1px; line-height:1px;">&nbsp;</td></tr>

        <tr>
          <td align="center">

            <a href="${APP_URL}"
              style="display:inline-block;
                     background-color:#0078d4;
                     color:#ffffff;
                     font-family:Arial,sans-serif;
                     font-size:15px;
                     font-weight:bold;
                     text-decoration:none;
                     text-align:center;
                     line-height:45px;
                     width:220px;
                     border-radius:4px;
                     -webkit-text-size-adjust:none;">
              Acessar Sistema
            </a>
            </td>
        </tr>

        <tr><td height="40" style="font-size:1px; line-height:1px;">&nbsp;</td></tr>

        <tr>
          <td style="background-color:#f8fafc; padding:20px 30px; border-top:1px solid #e2e8f0; text-align:center;">
            <span style="font-family:Arial, sans-serif; font-size:12px; color:#64748b; line-height:1.5;">
              Este é um aviso automático do <strong>Sistema ViaRondon</strong>.<br>
              Não responda este e-mail. Em caso de dúvidas, procure o RH.
            </span>
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