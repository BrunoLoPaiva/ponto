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
<div style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding: 30px 0;">
    <tr>
      <td align="center">
        
        <!-- Container -->
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#0078d4; padding:20px;">
              <span style="color:#ffffff; font-size:20px; font-weight:bold;">
                ${titulo}
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px; color:#333333; font-size:15px; line-height:1.6;">
              ${mensagem}

              <!-- Button -->
              <div style="text-align:center; margin-top:30px;">

                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"
                  href="${APP_URL}"
                  style="height:45px;v-text-anchor:middle;width:220px;"
                  arcsize="10%"
                  strokecolor="#0078d4"
                  fillcolor="#0078d4">
                  <w:anchorlock/>
                  <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">
                    Acessar Sistema
                  </center>
                </v:roundrect>
                <![endif]-->

                <!--[if !mso]><!-- -->
                <a href="${APP_URL}"
                  style="display:inline-block;
                         background-color:#0078d4;
                         color:#ffffff;
                         font-size:15px;
                         font-weight:bold;
                         line-height:45px;
                         text-align:center;
                         text-decoration:none;
                         width:220px;
                         border-radius:5px;">
                  Acessar Sistema
                </a>
                <!--<![endif]-->

              </div>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 30px;">
              <hr style="border:none; border-top:1px solid #eaeaea;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px; text-align:center; font-size:12px; color:#999999;">
              Este é um e-mail automático do Sistema de Assinatura ViaRondon.<br>
              Por favor, não responda este e-mail.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</div>
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
      [tipoTemplate],
    );
    if (!template) {
      console.warn(
        `[mailer] Template "${tipoTemplate}" não encontrado no banco.`,
      );
      return;
    }

    const assuntoPersonalizado = template.assunto.replace(
      /{{nome}}/g,
      nomeTarget,
    );
    const corpoPersonalizado = template.corpo.replace(/{{nome}}/g, nomeTarget);

    await transporter.sendMail({
      from: SYSTEM_EMAIL,
      to: email,
      subject: assuntoPersonalizado,
      html: generateEmailHtml(assuntoPersonalizado, corpoPersonalizado),
    });
  } catch (error) {
    console.error(
      `[mailer] Erro ao enviar [${tipoTemplate}] para ${email}:`,
      error,
    );
  }
}

// ── Exportações limpas ──────────────────────────────────────────────────────
export const notifyEmployee = (username, nome) =>
  dispararEmail(username, nome, "NOVO_AJUSTE_COLABORADOR");
export const notifySupervisor = (username, nome) =>
  dispararEmail(username, nome, "NOVO_AJUSTE_CHEFIA");
export const notifyController = (username) =>
  dispararEmail(username, "Controlador", "NOVO_AJUSTE_CONTROLADOR");
export const sendReminder = (username, nome) =>
  dispararEmail(username, nome, "LEMBRETE_PENDENCIA");
