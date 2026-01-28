
import { Router } from 'express';
import {
    getBlockedIps,
    addBlockedIp,
    removeBlockedIp,
    updateBlockedIp,
    removeAllBlockedIps,
    getIpExportFormats,
    exportBlockedIps
} from '../controllers/ip-controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: IP Blocking
 *   description: Manage IP blocklists for a tenant
 */

router.use(authMiddleware);

/**
 * @swagger
 * /api/ip/blocked-ips:
 *   get:
 *     summary: Retrieve a list of blocked IPs for the current tenant
 *     tags: [IP Blocking]
 *     responses:
 *       '200':
 *         description: A list of blocked IPs.
 */
router.get('/blocked-ips', getBlockedIps);

/**
 * @swagger
 * /api/ip/blocked-ips:
 *   post:
 *     summary: Add a new IP to the blocklist for the current tenant
 *     tags: [IP Blocking]
 *     responses:
 *       '201':
 *         description: The IP was successfully added.
 */
router.post('/blocked-ips', addBlockedIp);

/**
 * @swagger
 * /api/ip/blocked-ips:
 *   delete:
 *     summary: Remove ALL blocked IPs
 *     tags: [IP Blocking]
 *     responses:
 *       '204':
 *         description: All IPs successfully removed.
 */
router.delete('/blocked-ips', removeAllBlockedIps);

/**
 * @swagger

/**
 * @swagger
 * /api/ip/blocked-ips/{id}:
 *   delete:
 *     summary: Remove a blocked IP by its ID
 *     tags: [IP Blocking]
 *     responses:
 *       '204':
 *         description: IP successfully removed.
 */
router.delete('/blocked-ips/:id', removeBlockedIp);

/**
 * @swagger
 * /api/ip/blocked-ips/{id}:
 *   put:
 *     summary: Update a blocked IP by its ID
 *     tags: [IP Blocking]
 *     responses:
 *       '200':
 *         description: IP successfully updated.
 */
router.put('/blocked-ips/:id', updateBlockedIp);

// --- IP Export Routes ---

/**
 * @swagger
 * /api/ip/export/formats:
 *   get:
 *     summary: Get available IP export formats (equipment types)
 *     tags: [IP Blocking]
 *     responses:
 *       '200':
 *         description: List of available equipment export formats.
 */
router.get('/export/formats', getIpExportFormats);

/**
 * @swagger
 * /api/ip/export:
 *   get:
 *     summary: Export blocked IPs in equipment-specific format
 *     tags: [IP Blocking]
 *     parameters:
 *       - in: query
 *         name: equipment
 *         required: true
 *         schema:
 *           type: string
 *           enum: [cisco, juniper, huawei, nokia, mikrotik, txt]
 *         description: Target equipment type
 *     responses:
 *       '200':
 *         description: Blocklist file in the requested format.
 *       '400':
 *         description: Invalid or missing equipment parameter.
 */
router.get('/export', exportBlockedIps);

export default router;
