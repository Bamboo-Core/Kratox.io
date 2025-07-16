
import { Router } from 'express';
import { extractDomains } from '../controllers/ai-controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: AI-powered endpoints for text analysis and suggestions
 */

// Protect all AI routes with authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/ai/extract-domains:
 *   post:
 *     summary: Extracts domain names from a block of text
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: The text to analyze for domain names (e.g., an alert log, an email body).
 *                 example: "Warning: Suspicious activity detected from evil.com and its subdomain test.evil.com. Please investigate. Also check malware.org."
 *     responses:
 *       '200':
 *         description: Successfully extracted domains.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 domains:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["evil.com", "test.evil.com", "malware.org"]
 *       '400':
 *         description: Bad Request. The request body is invalid.
 *       '401':
 *         description: Unauthorized. Invalid or missing token.
 *       '500':
 *         description: Internal Server Error.
 */
router.post('/extract-domains', extractDomains);

export default router;
