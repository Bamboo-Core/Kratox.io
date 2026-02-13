"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const log_controller_js_1 = require("../controllers/log-controller.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Logs
 *   description: Endpoints for retrieving system logs
 */
router.use(auth_js_1.authMiddleware);
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
router.get('/automation', log_controller_js_1.getAutomationLogs);
exports.default = router;
