import { Router } from 'express';
import { 
  getBlockedDomains,
  addBlockedDomain, 
  removeBlockedDomain 
} from '../controllers/dns-controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: DNS Blocking
 *   description: Manage DNS blocklists for a tenant
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     BlockedDomain:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: The unique identifier for the blocked domain entry.
 *         domain:
 *           type: string
 *           description: The domain name that is blocked.
 *         blockedAt:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the domain was blocked.
 *         tenant_id:
 *           type: string
 *           format: uuid
 *           description: The ID of the tenant to whom this rule belongs.
 *       example:
 *         id: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *         domain: "malicious-site.com"
 *         blockedAt: "2024-01-01T12:00:00.000Z"
 *         tenant_id: "f0e9d8c7-b6a5-4321-fedc-ba9876543210"
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

// Protect all DNS routes with the authentication middleware
router.use(authMiddleware);

/**
 * @swagger
 * /api/dns/blocked-domains:
 *   get:
 *     summary: Retrieve a list of blocked domains for the current tenant
 *     tags: [DNS Blocking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of blocked domains.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BlockedDomain'
 *       '401':
 *         description: Unauthorized. Invalid or missing token.
 *       '403':
 *         description: Forbidden. Tenant ID is missing from token.
 *       '500':
 *         description: Internal Server Error.
 */
router.get('/blocked-domains', getBlockedDomains);

/**
 * @swagger
 * /api/dns/blocked-domains:
 *   post:
 *     summary: Add a new domain to the blocklist for the current tenant
 *     tags: [DNS Blocking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - domain
 *             properties:
 *               domain:
 *                 type: string
 *                 description: The domain name to block.
 *                 example: "new-malware.com"
 *     responses:
 *       '201':
 *         description: The domain was successfully added to the blocklist.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlockedDomain'
 *       '400':
 *         description: Bad Request. Domain is required.
 *       '401':
 *         description: Unauthorized.
 *       '409':
 *         description: Conflict. The domain is already in the blocklist.
 *       '500':
 *         description: Internal Server Error.
 */
router.post('/blocked-domains', addBlockedDomain);

/**
 * @swagger
 * /api/dns/blocked-domains/{id}:
 *   delete:
 *     summary: Remove a blocked domain from the list by its ID
 *     tags: [DNS Blocking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: The unique ID of the blocked domain entry to delete.
 *     responses:
 *       '204':
 *         description: Domain successfully removed. No content returned.
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden. Tenant ID is missing.
 *       '404':
 *         description: Not Found. The specified domain ID was not found for this tenant.
 *       '500':
 *         description: Internal Server Error.
 */
router.delete('/blocked-domains/:id', removeBlockedDomain);

export default router;
