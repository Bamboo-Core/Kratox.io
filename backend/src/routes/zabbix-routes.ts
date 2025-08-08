
import { Router } from 'express';
import { getHosts, getAlerts, getHostItems, getHostGroups, handleZabbixWebhook } from '../controllers/zabbix-controller.js';
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
 * /api/zabbix/webhook:
 *   post:
 *     summary: Receives event notifications from Zabbix
 *     tags: [Zabbix]
 *     description: This is a public endpoint designed to be called by Zabbix actions to notify the application about alert events (creation, acknowledgment, resolution).
 *     requestBody:
 *       description: The payload sent by the Zabbix webhook. The structure is flexible and depends on the Zabbix action configuration.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               event_id: "{EVENT.ID}"
 *               status: "{EVENT.STATUS}"
 *               severity: "{EVENT.SEVERITY}"
 *               hostname: "{HOST.NAME}"
 *               problem_name: "{EVENT.NAME}"
 *     responses:
 *       '200':
 *         description: Webhook received and acknowledged.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: 'string', example: 'success' }
 *                 message: { type: 'string', example: 'Webhook received.' }
 *       '500':
 *         description: Internal server error while processing the webhook.
 */
router.post('/webhook', handleZabbixWebhook);


// Protect all subsequent Zabbix routes with the authentication middleware
router.use(authMiddleware);

/**
 * @swagger
 * /api/zabbix/hosts:
 *   get:
 *     summary: Get a list of monitored hosts from Zabbix
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
 *     summary: Get a list of active alerts (problems) from Zabbix for a given time range
 *     tags: [Zabbix]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: time_from
 *         schema:
 *           type: string
 *           description: "Unix timestamp. Return only problems created after or at this time."
 *         required: false
 *       - in: query
 *         name: time_to
 *         schema:
 *           type: string
 *           description: "Unix timestamp. Return only problems created before or at this time."
 *         required: false
 *     responses:
 *       '200':
 *         description: A list of active Zabbix alerts (problems).
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

/**
 * @swagger
 * /api/zabbix/host-groups:
 *   get:
 *     summary: Get a list of all host groups from Zabbix
 *     tags: [Zabbix]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of Zabbix host groups.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   groupid: { type: 'string' }
 *                   name: { type: 'string' }
 *       '401':
 *         description: Unauthorized. Invalid or missing token.
 *       '500':
 *         description: Internal Server Error.
 */
router.get('/host-groups', getHostGroups);

/**
 * @swagger
 * /api/zabbix/hosts/{hostId}/items:
 *   get:
 *     summary: Get a list of items (metrics) for a specific host from Zabbix
 *     tags: [Zabbix]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hostId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the Zabbix host.
 *     responses:
 *       '200':
 *         description: A list of Zabbix items for the specified host.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   itemid: { type: 'string' }
 *                   name: { type: 'string' }
 *                   key_: { type: 'string' }
 *                   value_type: { type: 'string' }
 *                   units: { type: 'string' }
 *       '400':
 *         description: Bad Request. Host ID is missing.
 *       '401':
 *         description: Unauthorized.
 *       '500':
 *         description: Internal Server Error.
 */
router.get('/hosts/:hostId/items', getHostItems);

export default router;
