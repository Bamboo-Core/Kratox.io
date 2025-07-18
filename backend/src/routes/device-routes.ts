
import { Router } from 'express';
import { runCommandOnDevice } from '../controllers/device-controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Devices
 *   description: Endpoints for interacting with network devices
 */

// Protect all device routes with authentication
router.use(authMiddleware);

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
 *         description: Host not found or IP address could not be determined.
 *       '500':
 *         description: Internal Server Error (e.g., SSH connection failed).
 */
router.post('/run-command', runCommandOnDevice);

export default router;
