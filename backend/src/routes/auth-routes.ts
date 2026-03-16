import { Router } from 'express';
import { login, refreshAccessToken, logout, logoutAll, verify2FA, resend2FA } from '../controllers/auth-controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and session management
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate a user and receive a JWT
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's email address.
 *                 example: admin@noc.ai
 *               password:
 *                 type: string
 *                 format: password
 *                 description: The user's password.
 *                 example: password123
 *     responses:
 *       '200':
 *         description: Login successful. Returns a JWT and user information.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: The JSON Web Token for authenticating subsequent requests.
 *                 user:
 *                   $ref: '#/components/schemas/AuthUser'
 *       '400':
 *         description: Bad Request. Email and password are required.
 *       '401':
 *         description: Unauthorized. Invalid credentials provided.
 *       '500':
 *         description: Internal Server Error.
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh the access token using the refresh token cookie
 *     tags: [Authentication]
 *     description: Uses the httpOnly refresh token cookie to generate a new access token. The refresh token is also rotated for security.
 *     responses:
 *       '200':
 *         description: Token refreshed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: The new access token.
 *                 user:
 *                   $ref: '#/components/schemas/AuthUser'
 *       '401':
 *         description: Invalid or expired refresh token.
 */
router.post('/refresh', refreshAccessToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout the current session
 *     tags: [Authentication]
 *     description: Revokes the current refresh token and clears the cookie.
 *     responses:
 *       '200':
 *         description: Logged out successfully.
 */
router.post('/logout', logout);

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     description: Revokes all refresh tokens for the authenticated user.
 *     responses:
 *       '200':
 *         description: Logged out from all devices successfully.
 *       '401':
 *         description: Unauthorized.
 */
router.post('/logout-all', authMiddleware, logoutAll);

/**
 * @swagger
 * /api/auth/verify-2fa:
 *   post:
 *     summary: Verify 2FA code and complete login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mfaToken
 *               - code
 *             properties:
 *               mfaToken:
 *                 type: string
 *               code:
 *                 type: string
 *               rememberDevice:
 *                 type: boolean
 *     responses:
 *       '200':
 *         description: Login successful.
 */
router.post('/verify-2fa', verify2FA);
router.post('/resend-2fa', resend2FA);

export default router;
