import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

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

export const sendWelcomeEmail = async (to: string, userName: string) => {
    try {
        const transporter = getTransporter();

        // Os termos são enviados de acordo com o idioma no momento do cadastro
        const translationsPath = path.resolve(process.cwd(), '..', 'public', 'locales', 'pt', 'translation.json');
        let translations: any = {};

        try {
            const fileContent = fs.readFileSync(translationsPath, 'utf-8');
            translations = JSON.parse(fileContent);
        } catch (err) {
            console.error('Could not load translations for welcome email:', err);
            translations = {
                termsPage: { title: 'Termos de Uso', sections: {} },
                privacyPage: { title: 'Política de Privacidade', sections: {} }
            };
        }

        const terms = translations.termsPage || {};
        const privacy = translations.privacyPage || {};

        const formatSections = (sections: any) => {
            if (!sections || !sections.sections) return '<p style="color: #9CA3AF;">Conteúdo disponível em nosso site.</p>';
            let html = '';
            const sectionData = sections.sections;
            for (const key in sectionData) {
                const section = sectionData[key];
                html += `<div style="margin-bottom: 30px; padding-bottom: 15px; border-bottom: 1px solid #384252;">`;
                html += `<h3 style="color: #F97316; font-size: 18px; margin-bottom: 10px;">${section.title || key}</h3>`;

                if (section.content) {
                    html += `<p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">${section.content.replace(/<bold>(.*?)<\/bold>/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</p>`;
                }

                if (section.list && section.list.length > 0) {
                    html += `<ul style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin-bottom: 15px; padding-left: 20px;">`;
                    section.list.forEach((item: string) => {
                        html += `<li style="margin-bottom: 5px;">${item.replace(/<bold>(.*?)<\/bold>/g, '<strong>$1</strong>')}</li>`;
                    });
                    html += `</ul>`;
                }

                if (section.subsections && section.subsections.length > 0) {
                    section.subsections.forEach((sub: any) => {
                        if (sub.subtitle) html += `<h4 style="color: #ffffff; font-size: 15px; margin: 15px 0 8px 0;">${sub.subtitle}</h4>`;
                        if (sub.content) html += `<p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin-bottom: 8px;">${sub.content.replace(/<bold>(.*?)<\/bold>/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</p>`;
                        if (sub.list && sub.list.length > 0) {
                            html += `<ul style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin-bottom: 10px; padding-left: 20px;">`;
                            sub.list.forEach((item: string) => {
                                html += `<li style="margin-bottom: 4px;">${item.replace(/<bold>(.*?)<\/bold>/g, '<strong>$1</strong>')}</li>`;
                            });
                            html += `</ul>`;
                        }
                        if (sub.conclusion) html += `<p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin-top: 5px; font-style: italic;">${sub.conclusion.replace(/<bold>(.*?)<\/bold>/g, '<strong>$1</strong>')}</p>`;
                    });
                }

                if (section.conclusion) {
                    html += `<p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin-top: 10px; font-style: italic;">${section.conclusion.replace(/<bold>(.*?)<\/bold>/g, '<strong>$1</strong>')}</p>`;
                }

                html += `</div>`;
            }
            return html;
        };

        const termsHtml = formatSections(terms);
        const privacyHtml = formatSections(privacy);

        await transporter.sendMail({
            from: process.env.EMAIL_FROM || `"Kratox" <${process.env.SMTP_USER}>`,
            to,
            subject: 'Bem-vindo à Kratox.io - Termos e Privacidade',
            html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo à Kratox.io</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #222B36; color: #ffffff;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 700px; max-width: 100%; border-collapse: collapse; background-color: #2C3543; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); padding: 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                                Kratox.io
                            </h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                                Confirmamos seu cadastro com sucesso!
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                                Olá, ${userName}!
                            </h2>
                            <p style="margin: 0 0 30px 0; color: #9CA3AF; font-size: 16px; line-height: 1.6;">
                                É um prazer ter você conosco. Como parte do nosso compromisso com a transparência e segurança, estamos enviando uma cópia dos nossos Termos de Uso e Política de Privacidade que você aceitou durante o cadastro.
                            </p>

                            <div style="background-color: #384252; border-radius: 8px; padding: 25px; margin-bottom: 40px; border-left: 4px solid #F97316;">
                                <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 500;">
                                    Este documento serve como seu registro de concordância com as regras da nossa plataforma.
                                </p>
                            </div>

                            <hr style="border: 0; border-top: 1px solid #4B5563; margin: 40px 0;">

                            <h2 style="color: #F97316; font-size: 22px; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 1px;">Termos de Uso</h2>
                            <div style="margin-bottom: 50px;">
                                ${termsHtml}
                            </div>

                            <hr style="border: 0; border-top: 1px solid #4B5563; margin: 40px 0;">

                            <h2 style="color: #F97316; font-size: 22px; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 1px;">Política de Privacidade</h2>
                            <div>
                                ${privacyHtml}
                            </div>

                            <div style="margin-top: 50px; padding: 30px; background-color: rgba(249, 115, 22, 0.05); border-radius: 12px; border: 1px dashed rgba(249, 115, 22, 0.3); text-align: center;">
                                <p style="margin: 0; color: #9CA3AF; font-size: 14px;">
                                    Você pode acessar estas informações a qualquer momento em nosso site:
                                </p>
                                <div style="margin-top: 15px;">
                                    <a href="https://kratox.io/docs/terms" style="color: #F97316; text-decoration: none; font-weight: 600; margin: 0 10px;">Termos de Uso</a>
                                    <span style="color: #4B5563;">|</span>
                                    <a href="https://kratox.io/docs/privacy" style="color: #F97316; text-decoration: none; font-weight: 600; margin: 0 10px;">Política de Privacidade</a>
                                </div>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #1E2530; padding: 30px 40px; text-align: center; border-top: 1px solid #384252;">
                            <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 12px;">
                                Este é um e-mail informativo referente ao seu cadastro na plataforma.
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
      `
        });
        return true;
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return false;
    }
};
