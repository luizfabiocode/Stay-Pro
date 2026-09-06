import nodemailer, { Transporter } from 'nodemailer';

const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587', 10);
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';

let transporter: Transporter | null = null;

export function getEmailTransporter(): Transporter | null {
  if (!EMAIL_USER || !EMAIL_PASS) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  }

  return transporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendAppEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transport = getEmailTransporter();
    if (!transport) {
      console.log(`[EMAIL DISPATCH - SIMULATED] Para: ${options.to} | Assunto: "${options.subject}" (Configure EMAIL_USER e EMAIL_PASS para envio real via SMTP)`);
      return { success: true, messageId: 'simulated_' + Date.now() };
    }

    const info = await transport.sendMail({
      from: `"Stay Pro - Gestão de Aluguéis" <${EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(`[EMAIL DISPATCH] E-mail enviado para ${options.to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[EMAIL ERROR] Falha ao enviar e-mail para ${options.to}:`, error.message);
    return { success: false, error: error.message };
  }
}
