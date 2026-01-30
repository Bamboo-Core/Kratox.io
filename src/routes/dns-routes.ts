import { Router } from 'express';
import {
  getBlockedDomains,
  addBlockedDomain,
  removeBlockedDomain,
  updateBlockedDomain,
  generateRpzZoneFile,
} from '../controllers/dns-controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: DNS Blocking
 *   description: Manage DNS blocklists for a tenant
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
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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

/**
 * @swagger
 * /api/dns/blocked-domains/{id}:
 *   put:
 *     summary: Update a blocked domain by its ID
 *     tags: [DNS Blocking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique ID of the blocked domain entry to update.
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
 *                 description: The new domain name.
 *                 example: "updated-malware.com"
 *     responses:
 *       '200':
 *         description: Domain successfully updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlockedDomain'
 *       '400':
 *         description: Bad Request. Domain is required.
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden. Tenant ID is missing.
 *       '404':
 *         description: Not Found. The specified domain ID was not found for this tenant.
 *       '409':
 *         description: Conflict. The domain is already in the blocklist.
 *       '500':
 *         description: Internal Server Error.
 */
router.put('/blocked-domains/:id', updateBlockedDomain);

/**
 * @swagger
 * /api/dns/generate-rpz:
 *   get:
 *     summary: Generate a Response Policy Zone (RPZ) file for the current tenant
 *     tags: [DNS Blocking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: The generated RPZ file content.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rpzContent:
 *                   type: string
 *                   description: The full text content of the RPZ zone file.
 *                   example: |
 *                     $TTL 1h
 *                     @ IN SOA localhost. root.localhost. (2024052301 1h 15m 30d 2h)
 *                       IN NS  localhost.
 *                     ;
 *                     ; RPZ zone file generated by NOC AI for tenant ...
 *                     ;
 *                     malicious-site.com CNAME .
 *                     *.malicious-site.com CNAME .
 *       '401':
 *         description: Unauthorized.
 *       '500':
 *         description: Internal Server Error.
 */
router.get('/generate-rpz', generateRpzZoneFile);

export default router;
