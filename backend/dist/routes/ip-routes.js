"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ip_controller_js_1 = require("../controllers/ip-controller.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: IP Blocking
 *   description: Manage IP blocklists for a tenant
 */
router.use(auth_js_1.authMiddleware);
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
router.get('/blocked-ips', ip_controller_js_1.getBlockedIps);
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
router.post('/blocked-ips', ip_controller_js_1.addBlockedIp);
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
router.delete('/blocked-ips', ip_controller_js_1.removeAllBlockedIps);
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
router.delete('/blocked-ips/:id', ip_controller_js_1.removeBlockedIp);
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
router.put('/blocked-ips/:id', ip_controller_js_1.updateBlockedIp);
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
router.get('/export/formats', ip_controller_js_1.getIpExportFormats);
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
router.get('/export', ip_controller_js_1.exportBlockedIps);
exports.default = router;
