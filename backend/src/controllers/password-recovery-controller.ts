import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { sendEmail } from '../config/mailersend.js';

const recoveryCodesStore = new Map<string, { code: string; expiresAt: Date }>();

const CODE_EXPIRATION_MINUTES = 15;

function generateRecoveryCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function getEmailTemplate(code: string, userName: string): string {
    return `
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
                                    ⚠️ Este código expira em ${CODE_EXPIRATION_MINUTES} minutos
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
`;
}

export async function sendRecoveryCode(req: Request, res: Response) {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email é obrigatório.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Formato de email inválido.' });
    }

    try {
        const userResult = await pool.query(
            'SELECT id, name, email FROM users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(200).json({
                message: 'Se o email estiver cadastrado, você receberá um código de recuperação.',
            });
        }

        const user = userResult.rows[0];
        const code = generateRecoveryCode();
        const expiresAt = new Date(Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000);

        recoveryCodesStore.set(email.toLowerCase(), { code, expiresAt });

        const emailSent = await sendEmail({
            to: email,
            subject: 'Código de Recuperação de Senha - KRATOX.IO',
            html: getEmailTemplate(code, user.name),
        });

        if (!emailSent) {
            console.error(`Failed to send recovery email to ${email}`);
            return res.status(500).json({
                error: 'Erro ao enviar email. Tente novamente mais tarde.',
            });
        }

        console.log(`Recovery code sent to ${email}`);

        res.status(200).json({
            message: 'Se o email estiver cadastrado, você receberá um código de recuperação.',
        });
    } catch (error) {
        console.error('Error in sendRecoveryCode:', error);
        res.status(500).json({
            error: 'Erro interno do servidor.',
        });
    }
}

export async function verifyRecoveryCode(req: Request, res: Response) {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ error: 'Email e código são obrigatórios.' });
    }

    const storedData = recoveryCodesStore.get(email.toLowerCase());

    if (!storedData) {
        return res.status(400).json({ error: 'Código inválido ou expirado.' });
    }

    if (new Date() > storedData.expiresAt) {
        recoveryCodesStore.delete(email.toLowerCase());
        return res.status(400).json({ error: 'Código expirado. Solicite um novo código.' });
    }

    if (storedData.code !== code) {
        return res.status(400).json({ error: 'Código inválido.' });
    }

    res.status(200).json({
        valid: true,
        message: 'Código válido. Você pode redefinir sua senha.',
    });
}

export async function resetPassword(req: Request, res: Response) {
    const { email, code, password, password_confirmation } = req.body;

    if (!email || !code || !password || !password_confirmation) {
        return res.status(400).json({
            error: 'Todos os campos são obrigatórios: email, code, password, password_confirmation.',
        });
    }

    if (password !== password_confirmation) {
        return res.status(400).json({ error: 'As senhas não coincidem.' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
    }

    const storedData = recoveryCodesStore.get(email.toLowerCase());

    if (!storedData) {
        return res.status(400).json({ error: 'Código inválido ou expirado.' });
    }

    if (new Date() > storedData.expiresAt) {
        recoveryCodesStore.delete(email.toLowerCase());
        return res.status(400).json({ error: 'Código expirado. Solicite um novo código.' });
    }

    if (storedData.code !== code) {
        return res.status(400).json({ error: 'Código inválido.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email',
            [hashedPassword, email]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        recoveryCodesStore.delete(email.toLowerCase());

        console.log(`Password reset successful for ${email}`);

        res.status(200).json({
            message: 'Senha redefinida com sucesso.',
        });
    } catch (error) {
        console.error('Error in resetPassword:', error);
        res.status(500).json({
            error: 'Erro interno do servidor.',
        });
    }
}
