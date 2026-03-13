import { Router } from 'express';
import { registerUser, verifyEmail, resendVerificationCode } from '../controllers/register-user-controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: User Registration
 *   description: Public endpoints for user self-registration
 */

/**
 * @swagger
 * /api/register/user:
 *   post:
 *     summary: Register a new user account
 *     description: |
 *       Allows a user to create their own account from the login page.
 *       The user will be created with 'user' role and assigned to a default tenant.
 *       This endpoint is public and does not require authentication.
 *     tags: [User Registration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone_number
 *               - password
 *               - password_confirmation
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: The user's full name.
 *                 example: João Silva
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's email address. Must be unique.
 *                 example: joao.silva@example.com
 *               phone_number:
 *                 type: string
 *                 description: The user's phone number (Brazilian format preferred).
 *                 example: "+55 11 99999-9999"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: The user's password. Must be at least 8 characters long.
 *                 example: SecurePass123
 *               password_confirmation:
 *                 type: string
 *                 format: password
 *                 description: Password confirmation. Must match the password field.
 *                 example: SecurePass123
 *     responses:
 *       '201':
 *         description: User registered successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully.
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       description: The unique identifier of the user.
 *                     name:
 *                       type: string
 *                       description: The user's full name.
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: The user's email address.
 *                     phone_number:
 *                       type: string
 *                       description: The user's phone number.
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       description: The timestamp when the user was created.
 *       '400':
 *         description: Bad Request. Validation errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: All fields are required
 *             examples:
 *               missingFields:
 *                 summary: Missing required fields
 *                 value:
 *                   error: "All fields are required: name, email, phone_number, password, password_confirmation."
 *               passwordMismatch:
 *                 summary: Password confirmation mismatch
 *                 value:
 *                   error: "Password and password confirmation do not match."
 *               passwordTooShort:
 *                 summary: Password too short
 *                 value:
 *                   error: "Password must be at least 8 characters long."
 *               invalidEmail:
 *                 summary: Invalid email format
 *                 value:
 *                   error: "Invalid email format."
 *               invalidPhone:
 *                 summary: Invalid phone number
 *                 value:
 *                   error: "Invalid phone number format."
 *       '409':
 *         description: Conflict. Email already exists.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: A user with this email already exists.
 *       '500':
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: An internal server error occurred during registration.
 */
router.post('/user', registerUser);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification-code', resendVerificationCode);

export default router;
