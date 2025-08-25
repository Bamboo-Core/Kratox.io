
import { Router } from 'express';
import { getAutomationLogs } from '../controllers/log-controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Logs
 *   description: Endpoints for retrieving system logs
 */

router.use(authMiddleware);

/**
 * @swagger
 * /api/logs/automation:
 *   get:
 *     summary: Get automation execution logs for the current tenant
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of automation log entries.
 *       '401':
 *         description: Unauthorized.
 */
router.get('/automation', getAutomationLogs);

export default router;
