import nodemailer from 'nodemailer';

const getTransporter = () => {
  const secure = process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === 'true';
  const port = Number(process.env.SMTP_PORT)

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: port,
    secure: secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    debug: true,
    logger: true
  });
};

export const sendVerificationEmail = async (to: string, code: string) => {
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Kratox" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Código de Verificação - KRATOX.IO',
      text: `Seu código de verificação é: ${code}`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verificação de E-mail - Kratox.io</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #222B36;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #2C3543; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); padding: 30px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                Kratox.io
                            </h1>
                            <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                                Sistema de Monitoramento Inteligente
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 22px; font-weight: 500;">
                                Verificação de Acesso
                            </h2>

                            <p style="margin: 0 0 25px 0; color: #9CA3AF; font-size: 16px; line-height: 1.6;">
                                Para concluir seu login no Kratox.io, utilize o código de segurança abaixo:
                            </p>

                            <!-- Code Box -->
                            <div style="background-color: #384252; border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0;">
                                <p style="margin: 0 0 10px 0; color: #9CA3AF; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                                    Seu código de verificação
                                </p>
                                <div style="font-size: 36px; font-weight: 700; color: #F97316; letter-spacing: 8px; font-family: monospace;">
                                    ${code}
                                </div>
                            </div>

                            <!-- Warning -->
                            <div style="background-color: rgba(249, 115, 22, 0.1); border-left: 4px solid #F97316; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 25px 0;">
                                <p style="margin: 0; color: #FB923C; font-size: 14px; font-weight: 500;">
                                    ⚠️ Este código expira em 10 minutos
                                </p>
                            </div>

                            <p style="margin: 25px 0 0 0; color: #9CA3AF; font-size: 14px; line-height: 1.6;">
                                Se você não tentou realizar o login, ignore este email. Sua conta permanecerá segura.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #1E2530; padding: 25px 40px; text-align: center; border-top: 1px solid #384252;">
                            <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 12px;">
                                Este é um email automático, por favor não responda.
                            </p>
                            <p style="margin: 0; color: #4B5563; font-size: 12px;">
                                © ${new Date().getFullYear()} Kratox.io. Todos os direitos reservados.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
      `,
    });
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};

export const sendPasswordRecoveryEmail = async (to: string, code: string, userName?: string) => {
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Kratox" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Código de Recuperação de Senha - KRATOX.IO',
      text: `Seu código de recuperação de senha é: ${code}`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperação de Senha - Kratox.io</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #222B36;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #2C3543; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); padding: 30px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                Kratox.io
                            </h1>
                            <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                                Sistema de Monitoramento Inteligente
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 22px; font-weight: 500;">
                                Olá${userName ? `, ${userName}` : ''}!
                            </h2>

                            <p style="margin: 0 0 25px 0; color: #9CA3AF; font-size: 16px; line-height: 1.6;">
                                Recebemos uma solicitação para redefinir a senha da sua conta. Use o código abaixo para continuar:
                            </p>

                            <!-- Code Box -->
                            <div style="background-color: #384252; border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0;">
                                <p style="margin: 0 0 10px 0; color: #9CA3AF; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                                    Seu código de verificação
                                </p>
                                <div style="font-size: 36px; font-weight: 700; color: #F97316; letter-spacing: 8px; font-family: monospace;">
                                    ${code}
                                </div>
                            </div>

                            <!-- Warning -->
                            <div style="background-color: rgba(249, 115, 22, 0.1); border-left: 4px solid #F97316; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 25px 0;">
                                <p style="margin: 0; color: #FB923C; font-size: 14px; font-weight: 500;">
                                    ⚠️ Este código expira em 15 minutos
                                </p>
                            </div>

                            <p style="margin: 25px 0 0 0; color: #9CA3AF; font-size: 14px; line-height: 1.6;">
                                Se você não solicitou a redefinição de senha, ignore este email. Sua conta permanecerá segura.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #1E2530; padding: 25px 40px; text-align: center; border-top: 1px solid #384252;">
                            <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 12px;">
                                Este é um email automático, por favor não responda.
                            </p>
                            <p style="margin: 0; color: #4B5563; font-size: 12px;">
                                © ${new Date().getFullYear()} Kratox.io. Todos os direitos reservados.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
      `,
    });

    return true;
  } catch (error) {
    console.error('Error sending recovery email:', error);
    return false;
  }
};

export const sendExtractionIssueReport = async (
  reportDetails: { type: string; comments: string; userEmail?: string },
  fileDataUri?: string,
  textAnalyzed?: string
) => {
  try {
    const transporter = getTransporter();
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.SMTP_USER || 'suporte@kratox.io';
    
    let attachments: any[] = [];
    if (fileDataUri) {
      // Extract base64 part
      const matches = fileDataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
         const buffer = Buffer.from(matches[2], 'base64');
         attachments.push({
           filename: 'documento_analisado.pdf', // you could parse actual name if passed, but this is fine
           content: buffer
         });
      }
    }

    const htmlContent = `
      <h2>Novo Relato de Problema na Extração por IA</h2>
      <p><strong>Usuário:</strong> ${reportDetails.userEmail || 'Desconhecido'}</p>
      <p><strong>Motivo Reportado:</strong> ${reportDetails.type}</p>
      <p><strong>Comentários:</strong></p>
      <blockquote style="background: #f9f9f9; padding: 10px; border-left: 4px solid #F97316;">
        ${reportDetails.comments || 'Nenhum comentário adicional.'}
      </blockquote>
      ${textAnalyzed ? `
        <p><strong>Texto Analisado:</strong></p>
        <blockquote style="background: #eee; padding: 10px;">
          ${textAnalyzed}
        </blockquote>
      ` : ''}
      <p><em>${attachments.length > 0 ? 'O arquivo analisado está em anexo.' : 'Nenhum arquivo anexado.'}</em></p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Kratox Platform" <${process.env.SMTP_USER}>`,
      to: supportEmail,
      subject: `[IA Extraction Report] ${reportDetails.type}`,
      html: htmlContent,
      attachments: attachments
    });

    return true;
  } catch (error) {
    console.error('Error sending extraction issue report:', error);
    return false;
  }
};
