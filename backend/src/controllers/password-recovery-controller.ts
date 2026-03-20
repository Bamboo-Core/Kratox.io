import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { sendPasswordRecoveryEmail } from '../services/email-service.js';
import { getPasswordValidationError } from '../utils/password-validator.js';

const recoveryCodesStore = new Map<string, { code: string; expiresAt: Date }>();

const CODE_EXPIRATION_MINUTES = 15;

function generateRecoveryCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
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

        const emailSent = await sendPasswordRecoveryEmail(email, code, user.name);

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

    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
        return res.status(400).json({ error: passwordError });
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
