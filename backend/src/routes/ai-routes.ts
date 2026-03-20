
import { Router } from 'express';
import {
    extractDomains,
    suggestAutomationRule,
    extractDomainsFromFileController,
    suggestCommandsForAlert,
    diagnoseNetwork,
    suggestScript,
    reportExtractionIssueController,
} from '../controllers/ai-controller.js';
import { chat as chatVercel, chatPublic } from '../controllers/chat-controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: AI-powered endpoints for text analysis and suggestions
 */

// Public chat endpoint (no auth required - for landing page)
router.post('/chat-public', chatPublic);

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
 *                 ipv4:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["192.168.1.1", "10.0.0.5"]
 *                 ipv6:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["2001:0db8:85a3:0000:0000:8a2e:0370:7334"]
 *       '400':
 *         description: Bad Request. The request body is invalid.
 *       '500':
 *         description: Internal Server Error.
 */
router.post('/extract-domains-from-file', extractDomainsFromFileController);

/**
 * @swagger
 * /api/ai/report-extraction-issue:
 *   post:
 *     summary: Report an issue with AI domain extraction
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.post('/report-extraction-issue', reportExtractionIssueController);



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
 *               - deviceVendor
 *             properties:
 *               alertMessage:
 *                 type: string
 *                 description: The text of the alert to analyze.
 *                 example: "High CPU utilization on router-nyc-01"
 *               deviceVendor:
 *                 type: string
 *                 description: "The Netmiko-compatible vendor of the device (e.g., cisco_ios, huawei)."
 *                 example: "cisco_ios"
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


/**
 * @swagger
 * /api/ai/diagnose-network:
 *   post:
 *     summary: Diagnoses a network issue using natural language and available tools
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
 *               - objective
 *             properties:
 *               objective:
 *                 type: string
 *                 description: A natural language description of the network problem to diagnose.
 *                 example: "O cliente da filial de São Paulo está reclamando de lentidão para acessar o Google. Você pode verificar o ping de dentro da rede dele?"
 *     responses:
 *       '200':
 *         description: The AI's response after diagnosing the issue.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                   example: "Executei um teste de ping para google.com a partir da rede da filial de São Paulo. A latência média é de 12ms com 0% de perda de pacotes, o que parece bom."
 *       '400':
 *         description: Bad Request. The request body is invalid.
 *       '500':
 *         description: Internal Server Error.
 */
router.post('/diagnose-network', diagnoseNetwork);

/**
 * @swagger
 * /api/ai/suggest-script:
 *   post:
 *     summary: Suggests an automation script for a given trigger
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
 *               - trigger_description
 *               - device_vendor
 *             properties:
 *               trigger_description:
 *                 type: string
 *                 description: A natural language description of the trigger alert.
 *                 example: "Alerta de alta utilização de CPU em dispositivo Cisco"
 *               device_vendor:
 *                 type: string
 *                 description: The Netmiko-compatible vendor of the device.
 *                 example: "cisco_ios"
 *     responses:
 *       '200':
 *         description: Successfully generated a script suggestion.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 suggested_script:
 *                   type: string
 *                   example: "show processes cpu sorted\nshow memory allocating-process"
 *       '400':
 *         description: Bad Request. The request body is invalid.
 *       '500':
 *         description: Internal Server Error.
 */
router.post('/suggest-script', suggestScript);


router.post('/suggest-script', suggestScript);


/**
 * @swagger
 * /api/ai/analyze-cidr:
 *   post:
 *     summary: Analyzes a CIDR block to calculate network details
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
 *               - cidr
 *             properties:
 *               cidr:
 *                 type: string
 *                 description: The CIDR string to analyze.
 *                 example: "192.168.0.10/24"
 *     responses:
 *       '200':
 *         description: Successfully analyzed CIDR.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 prefix:
 *                   type: string,
 *                   example: "/24"
 *                 mask:
 *                   type: string
 *                   example: "255.255.255.0"
 *                 total_ips:
 *                   type: number
 *                   example: 256
 *                 range_start:
 *                   type: string
 *                   example: "192.168.0.0"
 *                 range_end:
 *                   type: string
 *                   example: "192.168.0.255"
 *                 correction_message:
 *                   type: string
 *                   example: "Input IP 192.168.0.10 was corrected to network address 192.168.0.0"
 *       '400':
 *         description: Bad Request. The request body is invalid.
 *       '500':
 *         description: Internal Server Error.
 */
import { analyzeCidrController } from '../controllers/ai-controller.js';
router.post('/analyze-cidr', analyzeCidrController);

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Chat with AI (Vercel SDK)
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
 *               - messages
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                     content:
 *                       type: string
 *     responses:
 *       '200':
 *         description: Streamed response.
 */
router.post('/chat', chatVercel);


export default router;
