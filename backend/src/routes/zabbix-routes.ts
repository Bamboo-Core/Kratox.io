
import { Router } from 'express';
import { getHosts, getAlerts } from '../controllers/zabbix-controller.js';
import { authMiddleware } from '../middleware/auth.js';
import '../config/zabbix-config.js'; // Ensures Zabbix config is loaded and warnings are shown if vars are missing

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Zabbix
 *   description: Zabbix monitoring data integration
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ZabbixHost:
 *       type: object
 *       properties:
 *         hostid:
 *           type: string
 *           description: The unique ID of the host in Zabbix.
 *         name:
 *           type: string
 *           description: The visible name of the host.
 *         status:
 *           type: string
 *           description: "The status of the host (0 - monitored, 1 - not monitored)."
 *         description:
 *           type: string
 *           description: Description of the host.
 *       example:
 *         hostid: "10580"
 *         name: "router-ny-01"
 *         status: "0"
 *         description: "Core router for New York datacenter"
 *     ZabbixAlert:
 *       type: object
 *       properties:
 *         eventid:
 *           type: string
 *           description: The unique ID of the alert event in Zabbix.
 *         name:
 *           type: string
 *           description: The description of the alert.
 *         severity:
 *           type: string
 *           description: "Severity level of the alert (e.g., 4 for 'Average', 5 for 'High')."
 *         acknowledged:
 *           type: string
 *           description: "Whether the alert has been acknowledged (0 - no, 1 - yes)."
 *       example:
 *         eventid: "48123"
 *         name: "Server server-lon-db-01 is unreachable"
 *         severity: "5"
 *         acknowledged: "0"
 */

// Protect all Zabbix routes with the authentication middleware
router.use(authMiddleware);

/**
 * @swagger
 * /api/zabbix/hosts:
 *   get:
 *     summary: Get a list of monitored hosts from Zabbix (mocked)
 *     tags: [Zabbix]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of Zabbix hosts.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ZabbixHost'
 *       '401':
 *         description: Unauthorized. Invalid or missing token.
 *       '500':
 *         description: Internal Server Error.
 */
router.get('/hosts', getHosts);

/**
 * @swagger
 * /api/zabbix/alerts:
 *   get:
 *     summary: Get a list of active alerts from Zabbix (mocked)
 *     tags: [Zabbix]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of active Zabbix alerts.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ZabbixAlert'
 *       '401':
 *         description: Unauthorized. Invalid or missing token.
 *       '500':
 *         description: Internal Server Error.
 */
router.get('/alerts', getAlerts);

export default router;
