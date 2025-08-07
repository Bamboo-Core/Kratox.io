
import { Router } from 'express';
import { 
    extractDomains, 
    suggestAutomationRule,
    extractDomainsFromFileController,
    suggestCommandsForAlert
} from '../controllers/ai-controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: AI-powered endpoints for text analysis and suggestions
 */

// Protect all AI routes with authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/ai/extract-domains:
 *   post:
 *     summary: Extracts domain names from a block of text
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: The text to analyze for domain names (e.g., an alert log, an email body).
 *                 example: "Warning: Suspicious activity detected from evil.com and its subdomain test.evil.com. Please investigate. Also check malware.org."
 *     responses:
 *       '200':
 *         description: Successfully extracted domains.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 domains:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["evil.com", "test.evil.com", "malware.org"]
 *       '400':
 *         description: Bad Request. The request body is invalid.
 *       '500':
 *         description: Internal Server Error.
 */
router.post('/extract-domains', extractDomains);


/**
 * @swagger
 * /api/ai/extract-domains-from-file:
 *   post:
 *     summary: Extracts domain names from an uploaded file (e.g., PDF)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileDataUri
 *             properties:
 *               fileDataUri:
 *                 type: string
 *                 description: The file content as a Base64 encoded data URI.
 *                 example: "data:application/pdf;base64,JVBERi0xLjQKJ..."
 *     responses:
 *       '200':
 *         description: Successfully extracted domains.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 domains:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["domain-from-pdf.com", "another.com"]
 *       '400':
 *         description: Bad Request. The request body is invalid.
 *       '500':
 *         description: Internal Server Error.
 */
router.post('/extract-domains-from-file', extractDomainsFromFileController);


/**
 * @swagger
 * /api/ai/suggest-rule:
 *   post:
 *     summary: Suggests an automation rule from a natural language description
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *                 description: A natural language description of a problem or desired automation.
 *                 example: "When a Zabbix alert says a server is down, create a high-priority ticket."
 *     responses:
 *       '200':
 *         description: Successfully generated a rule suggestion.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rule:
 *                   type: object
 *                   properties:
 *                     when:
 *                       type: string
 *                       description: The trigger for the rule.
 *                     if:
 *                       type: string
 *                       description: The condition to check.
 *                     action:
 *                       type: string
 *                       description: The action to perform.
 *                   example:
 *                     when: "Zabbix Alert Received"
 *                     if: "Alert message contains 'server is down'"
 *                     action: "Create a high-priority ticket with alert details."
 *       '400':
 *         description: Bad Request. The request body is invalid.
 *       '500':
 *         description: Internal Server Error.
 */
router.post('/suggest-rule', suggestAutomationRule);

/**
 * @swagger
 * /api/ai/suggest-commands:
 *   post:
 *     summary: Suggests diagnostic commands based on an alert message
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - alertMessage
 *             properties:
 *               alertMessage:
 *                 type: string
 *                 description: The text of the alert to analyze.
 *                 example: "High CPU utilization on router-nyc-01"
 *               deviceVendor:
 *                 type: string
 *                 description: "Optional. The vendor of the device (e.g., Cisco, Huawei)."
 *                 example: "Cisco"
 *     responses:
 *       '200':
 *         description: Successfully generated command suggestions.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 commands:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["show processes cpu sorted", "show memory allocating-process"]
 *                 reasoning:
 *                   type: string
 *                   example: "These commands help identify the specific process causing high CPU usage."
 *       '400':
 *         description: Bad Request. The request body is invalid.
 *       '500':
 *         description: Internal Server Error.
 */
router.post('/suggest-commands', suggestCommandsForAlert);


export default router;
