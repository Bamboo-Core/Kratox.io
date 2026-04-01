import { Router } from 'express';
import { processIocBlock } from '../controllers/ioc-controller.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: IoC Management
 *   description: Centralized endpoint for blocking Indicators of Compromise (Domains and IPs)
 */

// Protect all IoC routes with authentication
// router.use(authMiddleware);

/**
 * @swagger
 * /api/ioc/block:
 *   post:
 *     summary: Process IoC blocking from text, direct target, or PDF file
 *     tags: [IoC Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: Free text containing potential IoCs.
 *               target:
 *                 type: string
 *                 description: Direct domain or IP address.
 *               file:
 *                 type: string
 *                 description: Data URI (Base64) of a PDF file to extract IoCs from.
 *     responses:
 *       '200':
 *         description: IoCs processed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_extracted:
 *                       type: integer
 *                     domains_count:
 *                       type: integer
 *                     ips_count:
 *                       type: integer
 *                     new_blocks:
 *                       type: integer
 *                     duplicates_skipped:
 *                       type: integer
 *                 data:
 *                   type: object
 *                   properties:
 *                     domains:
 *                       type: array
 *                       items:
 *                         type: string
 *                     ips:
 *                       type: array
 *                       items:
 *                         type: string
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     processed_at:
 *                       type: string
 *                     tenant_id:
 *                       type: string
 *       '400':
 *         description: Invalid request or payload.
 *       '403':
 *         description: Forbidden - Tenant ID missing.
 *       '500':
 *         description: Internal server error.
 */
router.post('/block', optionalAuthMiddleware, processIocBlock);

export default router;
