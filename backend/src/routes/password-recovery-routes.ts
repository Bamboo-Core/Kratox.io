import { Router } from 'express';
import {
    sendRecoveryCode,
    verifyRecoveryCode,
    resetPassword,
} from '../controllers/password-recovery-controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Password Recovery
 *   description: Endpoints for password recovery flow
 */

/**
 * @swagger
 * /api/password-recovery/send-code:
 *   post:
 *     summary: Send a 6-digit recovery code to the user's email
 *     description: |
 *       Sends a 6-digit verification code to the provided email address.
 *       The code expires after 15 minutes. For security reasons, this endpoint
 *       always returns a success message, even if the email is not registered.
 *     tags: [Password Recovery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's registered email address.
 *                 example: user@example.com
 *     responses:
 *       '200':
 *         description: Request processed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Se o email estiver cadastrado, você receberá um código de recuperação.
 *       '400':
 *         description: Bad Request. Email is required or invalid format.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Email é obrigatório.
 *       '500':
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Erro ao enviar email. Tente novamente mais tarde.
 */
router.post('/send-code', sendRecoveryCode);

/**
 * @swagger
 * /api/password-recovery/verify-code:
 *   post:
 *     summary: Verify if a recovery code is valid
 *     description: |
 *       Checks if the provided 6-digit code is valid for the given email.
 *       The code must not be expired (15 minutes validity).
 *     tags: [Password Recovery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's email address.
 *                 example: user@example.com
 *               code:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 description: The 6-digit recovery code.
 *                 example: "123456"
 *     responses:
 *       '200':
 *         description: Code is valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Código válido. Você pode redefinir sua senha.
 *       '400':
 *         description: Bad Request. Invalid or expired code.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Código inválido ou expirado.
 */
router.post('/verify-code', verifyRecoveryCode);

/**
 * @swagger
 * /api/password-recovery/reset-password:
 *   post:
 *     summary: Reset the user's password
 *     description: |
 *       Resets the user's password using a valid recovery code.
 *       The code is invalidated after successful password reset.
 *     tags: [Password Recovery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *               - password
 *               - password_confirmation
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's email address.
 *                 example: user@example.com
 *               code:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 description: The 6-digit recovery code.
 *                 example: "123456"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: The new password. Must be at least 8 characters.
 *                 example: NewSecurePass123
 *               password_confirmation:
 *                 type: string
 *                 format: password
 *                 description: Password confirmation. Must match the password field.
 *                 example: NewSecurePass123
 *     responses:
 *       '200':
 *         description: Password reset successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Senha redefinida com sucesso.
 *       '400':
 *         description: Bad Request. Validation errors or invalid code.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               missingFields:
 *                 summary: Missing required fields
 *                 value:
 *                   error: "Todos os campos são obrigatórios: email, code, password, password_confirmation."
 *               passwordMismatch:
 *                 summary: Password confirmation mismatch
 *                 value:
 *                   error: "As senhas não coincidem."
 *               passwordTooShort:
 *                 summary: Password too short
 *                 value:
 *                   error: "A senha deve ter pelo menos 8 caracteres."
 *               invalidCode:
 *                 summary: Invalid or expired code
 *                 value:
 *                   error: "Código inválido ou expirado."
 *       '404':
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Usuário não encontrado.
 *       '500':
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Erro interno do servidor.
 */
router.post('/reset-password', resetPassword);

export default router;
