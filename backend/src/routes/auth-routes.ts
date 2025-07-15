import { Router } from 'express';
import { login } from '../controllers/auth-controller.js';

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
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       format: uuid
 *                     tenantId:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [admin, collaborator]
 *                     tenantName:
 *                       type: string
 *       '400':
 *         description: Bad Request. Email and password are required.
 *       '401':
 *         description: Unauthorized. Invalid credentials provided.
 *       '500':
 *         description: Internal Server Error.
 */
router.post('/login', login);

export default router;
