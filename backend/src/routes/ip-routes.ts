
import { Router } from 'express';
import {
    getBlockedIps,
    addBlockedIp,
    removeBlockedIp,
    updateBlockedIp,
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

export default router;
