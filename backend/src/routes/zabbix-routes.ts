
import { Router } from 'express';
import { 
    getHosts, 
    getAlerts, 
    getHostItems, 
    getHostGroups, 
    handleZabbixEvent, 
    getItemHistory, 
    getItemsForEvent,
    handleTestZabbixEvent // Import the new test controller
} from '../controllers/zabbix-controller.js';
import { authMiddleware } from '../middleware/auth.js';
import '../config/zabbix-config.js'; // Ensures Zabbix config is loaded

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Zabbix
 *   description: Zabbix monitoring data integration
 */

/**
 * @swagger
 * /api/zabbix/event-handler:
 *   post:
 *     summary: Receives event notifications from Zabbix via webhook
 *     tags: [Zabbix]
 *     description: This is a public endpoint designed to be called by Zabbix actions to notify the application about alert events.
 *     requestBody:
 *       description: The payload sent by the Zabbix webhook.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               host: "{HOST.NAME}"
 *               alert_name: "{EVENT.NAME}"
 *               host_groups: "{HOST.GROUPS}"
 *     responses:
 *       '200':
 *         description: Event received and acknowledged.
 */
router.post('/event-handler', handleZabbixEvent);


// Protect all subsequent Zabbix routes with the authentication middleware
router.use(authMiddleware);

/**
 * @swagger
 * /api/zabbix/test-event-handler:
 *   post:
 *     summary: Triggers a mock Zabbix event for testing automation rules
 *     tags: [Zabbix]
 *     security:
 *       - bearerAuth: []
 *     description: This is a protected endpoint for manually testing the rule engine. It requires a feature flag ('test_automation_rule_trigger') to be enabled for the tenant.
 *     responses:
 *       '202':
 *         description: Test event accepted for processing.
 *       '403':
 *         description: Forbidden. The feature flag is not enabled for the user's tenant.
 */
router.post('/test-event-handler', handleTestZabbixEvent);


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
 */
router.get('/hosts', getHosts);

/**
 * @swagger
 * /api/zabbix/alerts:
 *   get:
 *     summary: Get a list of active alerts (problems) from Zabbix
 *     tags: [Zabbix]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: time_from
 *         schema: { type: 'string', description: "Unix timestamp." }
 *       - in: query
 *         name: time_to
 *         schema: { type: 'string', description: "Unix timestamp." }
 *     responses:
 *       '200':
 *         description: A list of active Zabbix alerts.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ZabbixAlert'
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
 */
router.get('/host-groups', getHostGroups);

/**
 * @swagger
 * /api/zabbix/hosts/{hostId}/items:
 *   get:
 *     summary: Get a list of items (metrics) for a specific host
 *     tags: [Zabbix]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hostId
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       '200':
 *         description: A list of Zabbix items.
 */
router.get('/hosts/:hostId/items', getHostItems);


/**
 * @swagger
 * /api/zabbix/items/{itemId}/history:
 *   get:
 *     summary: Get historical data for a specific item
 *     tags: [Zabbix]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: 'string' }
 *       - in: query
 *         name: historyType
 *         required: true
 *         schema: { type: 'string', enum: ['0', '3'] }
 *       - in: query
 *         name: time_from
 *         schema: { type: 'string' }
 *       - in: query
 *         name: time_to
 *         schema: { type: 'string' }
 *     responses:
 *       '200':
 *         description: A list of historical data points.
 */
router.get('/items/:itemId/history', getItemHistory);

/**
 * @swagger
 * /api/zabbix/events/{eventId}/items:
 *   get:
 *     summary: Get items related to a specific Zabbix event
 *     tags: [Zabbix]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       '200':
 *         description: A list of Zabbix items associated with the event's trigger.
 */
router.get('/events/:eventId/items', getItemsForEvent);


export default router;
