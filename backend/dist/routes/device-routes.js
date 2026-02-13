"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const device_controller_js_1 = require("../controllers/device-controller.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Devices
 *   description: Endpoints for interacting with network devices
 */
// Protect all device routes with authentication
router.use(auth_js_1.authMiddleware);
/**
 * @swagger
 * /api/devices/run-command:
 *   post:
 *     summary: Executes a read-only command on a network device via SSH
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hostId
 *               - command
 *             properties:
 *               hostId:
 *                 type: string
 *                 description: The ID of the host in Zabbix.
 *                 example: "10580"
 *               command:
 *                 type: string
 *                 description: The read-only command to execute.
 *                 example: "show version"
 *     responses:
 *       '200':
 *         description: Command executed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 output:
 *                   type: string
 *                   description: The text output from the command execution.
 *       '400':
 *         description: Bad Request. Missing hostId or command.
 *       '401':
 *         description: Unauthorized.
 *       '404':
 *         description: Host not found, IP address could not be determined, or credentials are not configured.
 *       '500':
 *         description: Internal Server Error (e.g., SSH connection failed).
 */
router.post('/run-command', device_controller_js_1.runCommandOnDevice);
/**
 * @swagger
 * /api/devices/{hostId}/credentials:
 *   post:
 *     summary: Save or update credentials for a specific device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hostId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Zabbix host ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, device_type]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               port:
 *                  type: integer
 *                  description: Optional SSH port. Defaults to 22.
 *               device_type:
 *                  type: string
 *                  description: The Netmiko device type (e.g., 'huawei', 'cisco_ios').
 *     responses:
 *       '200':
 *         description: Credentials saved successfully.
 *       '400':
 *         description: Missing required fields.
 */
router.post('/:hostId/credentials', device_controller_js_1.saveDeviceCredentials);
/**
 * @swagger
 * /api/devices/{hostId}/credentials:
 *   get:
 *     summary: Get credentials (excluding password) for a specific device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hostId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Zabbix host ID.
 *     responses:
 *       '200':
 *         description: Credential details for the device.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 username:
 *                   type: string
 *                 port:
 *                   type: integer
 *                 device_type:
 *                   type: string
 *       '404':
 *          description: Credentials not found.
 */
router.get('/:hostId/credentials', device_controller_js_1.getDeviceCredentials);
exports.default = router;
