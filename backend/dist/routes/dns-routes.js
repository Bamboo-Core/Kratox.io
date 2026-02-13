"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dns_controller_js_1 = require("../controllers/dns-controller.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: DNS Blocking
 *   description: Manage DNS blocklists for a tenant
 */
// Protect all DNS routes with the authentication middleware
router.use(auth_js_1.authMiddleware);
// --- Manual Domain Management ---
/**
 * @swagger
 * /api/dns/blocked-domains:
 *   get:
 *     summary: Retrieve a list of blocked domains for the current tenant
 *     tags: [DNS Blocking]
 *     responses:
 *       '200':
 *         description: A list of blocked domains.
 */
router.get('/blocked-domains', dns_controller_js_1.getBlockedDomains);
/**
 * @swagger
 * /api/dns/blocked-domains:
 *   post:
 *     summary: Add a new domain to the blocklist for the current tenant
 *     tags: [DNS Blocking]
 *     responses:
 *       '201':
 *         description: The domain was successfully added.
 */
router.post('/blocked-domains', dns_controller_js_1.addBlockedDomain);
/**
 * @swagger
 * /api/dns/blocked-domains:
 *   delete:
 *     summary: Remove ALL manually blocked domains
 *     tags: [DNS Blocking]
 *     responses:
 *       '204':
 *         description: All manual domains successfully removed.
 */
router.delete('/blocked-domains', dns_controller_js_1.removeAllBlockedDomains);
/**
 * @swagger
 * /api/dns/blocked-domains/{id}:
 *   delete:
 *     summary: Remove a manually added blocked domain by its ID
 *     tags: [DNS Blocking]
 *     responses:
 *       '204':
 *         description: Domain successfully removed.
 */
router.delete('/blocked-domains/:id', dns_controller_js_1.removeBlockedDomain);
/**
 * @swagger
 * /api/dns/blocked-domains/{id}:
 *   put:
 *     summary: Update a manually added blocked domain by its ID
 *     tags: [DNS Blocking]
 *     responses:
 *       '200':
 *         description: Domain successfully updated.
 */
router.put('/blocked-domains/:id', dns_controller_js_1.updateBlockedDomain);
/**
 * @swagger
 * /api/dns/generate-rpz:
 *   get:
 *     summary: Generate a Response Policy Zone (RPZ) file for the current tenant
 *     tags: [DNS Blocking]
 *     responses:
 *       '200':
 *         description: The generated RPZ file content.
 */
router.get('/generate-rpz', dns_controller_js_1.generateRpzZoneFile);
// --- Domain Exclusion Management ---
/**
 * @swagger
 * /api/dns/exclusions:
 *   get:
 *     summary: Get all excluded domains for the current tenant
 *     tags: [DNS Blocking]
 *     responses:
 *       '200':
 *         description: List of excluded domains.
 */
router.get('/exclusions', dns_controller_js_1.getExcludedDomains);
/**
 * @swagger
 * /api/dns/exclusions:
 *   post:
 *     summary: Exclude a domain from subscribed blocklists (won't block this domain)
 *     tags: [DNS Blocking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               domain:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Domain excluded successfully.
 */
router.post('/exclusions', dns_controller_js_1.excludeDomain);
/**
 * @swagger
 * /api/dns/exclusions/{domain}:
 *   delete:
 *     summary: Re-include a previously excluded domain (will block again)
 *     tags: [DNS Blocking]
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '204':
 *         description: Exclusion removed successfully.
 */
router.delete('/exclusions/:domain', dns_controller_js_1.reincludeDomain);
// --- Blocklist Feed Subscription Management ---
/**
 * @swagger
 * /api/dns/blocklists:
 *   get:
 *     summary: Get all available blocklist feeds for subscription
 *     tags: [DNS Blocking]
 *     responses:
 *       '200':
 *         description: A list of available blocklist feeds.
 */
router.get('/blocklists', dns_controller_js_1.getAvailableBlocklists);
/**
 * @swagger
 * /api/dns/subscriptions:
 *   get:
 *     summary: Get the IDs of blocklists the current tenant is subscribed to
 *     tags: [DNS Blocking]
 *     responses:
 *       '200':
 *         description: An array of blocklist UUIDs.
 */
router.get('/subscriptions', dns_controller_js_1.getMySubscriptions);
/**
 * @swagger
 * /api/dns/subscriptions:
 *   post:
 *     summary: Subscribe the current tenant to a blocklist feed
 *     tags: [DNS Blocking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               blocklistId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       '201':
 *         description: Subscription successful.
 */
router.post('/subscriptions', dns_controller_js_1.subscribeToBlocklist);
/**
 * @swagger
 * /api/dns/subscriptions/{blocklistId}:
 *   delete:
 *     summary: Unsubscribe the current tenant from a blocklist feed
 *     tags: [DNS Blocking]
 *     parameters:
 *       - in: path
 *         name: blocklistId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '204':
 *         description: Unsubscription successful.
 */
router.delete('/subscriptions/:blocklistId', dns_controller_js_1.unsubscribeFromBlocklist);
// --- Blocklist Export ---
/**
 * @swagger
 * /api/dns/export/formats:
 *   get:
 *     summary: Get available export formats
 *     tags: [DNS Blocking]
 *     responses:
 *       '200':
 *         description: List of available export formats with descriptions.
 */
router.get('/export/formats', dns_controller_js_1.getExportFormats);
/**
 * @swagger
 * /api/dns/export:
 *   get:
 *     summary: Export blocklist in specified format
 *     tags: [DNS Blocking]
 *     parameters:
 *       - in: query
 *         name: format
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hosts, unbound, bind, json, csv]
 *         description: Export format
 *       - in: query
 *         name: tenantId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tenant ID (admin only)
 *     responses:
 *       '200':
 *         description: Blocklist file in the requested format.
 *       '400':
 *         description: Invalid format specified.
 */
router.get('/export', dns_controller_js_1.exportBlocklist);
/**
 * @swagger
 * /api/dns/generate-link-token:
 *   post:
 *     summary: Generate a signed token for public blocklist download
 *     tags: [DNS Blocking]
 *     responses:
 *       '200':
 *         description: A signed JWT token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 */
router.post('/generate-link-token', dns_controller_js_1.generateDownloadToken);
/**
 * @swagger
 * /api/dns/download-link-info:
 *   get:
 *     summary: Retrieve the currently active download link info for the tenant
 *     tags: [DNS Blocking]
 *     responses:
 *       '200':
 *         description: The active link token and format, or null if none.
 */
router.get('/download-link-info', dns_controller_js_1.getDownloadLinkInfo);
/**
 * @swagger
 * /api/dns/download-link:
 *   delete:
 *     summary: Delete a download link token
 *     tags: [DNS Blocking]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '204':
 *         description: Token deleted successfully.
 */
router.delete('/download-link', dns_controller_js_1.deleteDownloadToken);
exports.default = router;
