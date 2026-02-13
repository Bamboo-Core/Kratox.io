"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminAuth_js_1 = require("../middleware/adminAuth.js");
const admin_controller_js_1 = require("../controllers/admin-controller.js");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administration endpoints for managing tenants and users. Requires admin role.
 */
// All routes in this file are protected by the admin authentication middleware
router.use(adminAuth_js_1.adminAuthMiddleware);
// --- Tenant Routes ---
/**
 * @swagger
 * /api/admin/tenants:
 *   get:
 *     summary: Get all tenants
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of all tenants.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tenant'
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden. User is not an admin.
 */
router.get('/tenants', admin_controller_js_1.getAllTenants);
/**
 * @swagger
 * /api/admin/tenants:
 *   post:
 *     summary: Create a new tenant
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "New Tenant Inc."
 *               probe_api_url:
 *                 type: string
 *                 format: uri
 *                 example: "http://probe.newtenant.com/api"
 *     responses:
 *       '201':
 *         description: Tenant created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tenant'
 *       '400':
 *         description: Bad Request. Tenant name is required.
 *       '409':
 *         description: Conflict. Tenant with this name already exists.
 */
router.post('/tenants', admin_controller_js_1.createTenant);
/**
 * @swagger
 * /api/admin/tenants/{id}:
 *   put:
 *     summary: Update an existing tenant
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the tenant.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Tenant Inc."
 *               probe_api_url:
 *                 type: string
 *                 format: uri
 *                 example: "http://new-probe.updatedtenant.com/api"
 *     responses:
 *       '200':
 *         description: Tenant updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tenant'
 *       '404':
 *         description: Tenant not found.
 */
router.put('/tenants/:id', admin_controller_js_1.updateTenant);
// --- User Routes ---
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users across all tenants
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of all users, enriched with tenant and Zabbix group names.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       '403':
 *         description: Forbidden.
 */
router.get('/users', admin_controller_js_1.getAllUsers);
/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get a single user by their ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the user.
 *     responses:
 *       '200':
 *         description: The user object.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '404':
 *         description: User not found.
 */
router.get('/users/:id', admin_controller_js_1.getUserById);
/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Jane Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jane.doe@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "strongpassword123"
 *               role:
 *                 type: string
 *                 enum: [admin, collaborator]
 *                 example: "collaborator"
 *               tenantId:
 *                 type: string
 *                 format: uuid
 *                 description: Required if role is 'collaborator'. The ID of the tenant to associate the user with.
 *                 example: "00000000-0000-0000-0000-000000000000"
 *               zabbix_hostgroup_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: "Optional. Array of Zabbix host group IDs for 'collaborator' users."
 *     responses:
 *       '201':
 *         description: User created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '400':
 *         description: Bad Request. Missing required fields.
 *       '409':
 *         description: Conflict. User with this email already exists.
 */
router.post('/users', admin_controller_js_1.createUser);
/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Update an existing user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the user to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Jane Doe Smith"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jane.smith@example.com"
 *               role:
 *                 type: string
 *                 enum: [admin, collaborator]
 *                 example: "admin"
 *               tenantId:
 *                 type: string
 *                 format: uuid
 *                 description: "Required if role is 'collaborator'"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Optional. Leave blank to keep current password.
 *                 example: "newstrongpassword456"
 *               zabbix_hostgroup_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: "Optional. Array of Zabbix host group IDs for 'collaborator' users."
 *     responses:
 *       '200':
 *         description: User updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '404':
 *         description: User not found.
 */
router.put('/users/:id', admin_controller_js_1.updateUser);
/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the user to delete.
 *     responses:
 *       '204':
 *         description: User deleted successfully.
 *       '404':
 *         description: User not found.
 */
router.delete('/users/:id', admin_controller_js_1.deleteUser);
// --- Admin DNS Routes ---
/**
 * @swagger
 * /api/admin/dns/all-blocked-domains:
 *   get:
 *     summary: Get all blocked domains for all tenants
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of all blocked domains, grouped by tenant.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AdminBlockedDomain'
 *       '403':
 *         description: Forbidden.
 */
router.get('/dns/all-blocked-domains', admin_controller_js_1.getAllBlockedDomains);
/**
 * @swagger
 * /api/admin/dns/blocked-domains:
 *   post:
 *     summary: Add a blocked domain for a specific tenant
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [domain, tenantId]
 *             properties:
 *               domain:
 *                 type: string
 *                 example: "malware-from-admin.com"
 *               tenantId:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the tenant to apply the block to.
 *     responses:
 *       '201':
 *         description: Domain blocked successfully for the tenant.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlockedDomain'
 *       '400':
 *         description: Bad Request. Missing domain or tenantId.
 *       '409':
 *         description: Conflict. Domain already blocked for this tenant.
 */
router.post('/dns/blocked-domains', admin_controller_js_1.addBlockedDomainForTenant);
// --- Admin DNS Blocklist Management ---
router.get('/dns/blocklists', admin_controller_js_1.getAllBlocklists);
router.post('/dns/blocklists', admin_controller_js_1.createBlocklist);
router.put('/dns/blocklists/:id', admin_controller_js_1.updateBlocklist);
router.delete('/dns/blocklists/:id', admin_controller_js_1.deleteBlocklist);
// --- Admin Automation Rule Components (Legacy) ---
router.get('/automation/criteria', admin_controller_js_1.getAllAutomationCriteria);
router.post('/automation/criteria', admin_controller_js_1.createAutomationCriterion);
router.put('/automation/criteria/:id', admin_controller_js_1.updateAutomationCriterion);
router.delete('/automation/criteria/:id', admin_controller_js_1.deleteAutomationCriterion);
router.get('/automation/actions', admin_controller_js_1.getAllAutomationActions);
router.post('/automation/actions', admin_controller_js_1.createAutomationAction);
router.put('/automation/actions/:id', admin_controller_js_1.updateAutomationAction);
router.delete('/automation/actions/:id', admin_controller_js_1.deleteAutomationAction);
// --- Admin Automation Templates (New) ---
/**
 * @swagger
 * /api/admin/automation/templates:
 *   post:
 *     summary: Create a new automation template
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               trigger_description:
 *                 type: string
 *               device_vendor:
 *                 type: string
 *               action_script:
 *                 type: string
 *               tenantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Optional. Array of tenant IDs to subscribe to this template upon creation.
 *     responses:
 *       '201':
 *         description: Template created.
 */
router.get('/automation/templates', admin_controller_js_1.getAllAutomationTemplates);
router.get('/automation/templates/:id', admin_controller_js_1.getAutomationTemplateById);
router.post('/automation/templates', admin_controller_js_1.createAutomationTemplate);
router.put('/automation/templates/:id', admin_controller_js_1.updateAutomationTemplate);
router.delete('/automation/templates/:id', admin_controller_js_1.deleteAutomationTemplate);
// --- Admin Test Routes ---
/**
 * @swagger
 * /api/admin/whatsapp/test-send:
 *   post:
 *     summary: Send a test WhatsApp message
 *     tags: [Admin]
 *     description: Endpoint for administrators to test the WhatsApp notification service.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [toNumber, message]
 *             properties:
 *               toNumber:
 *                 type: string
 *                 description: The destination phone number in international format (e.g., 5511999998888).
 *               message:
 *                 type: string
 *                 description: The text message to send.
 *     responses:
 *       '200':
 *         description: Test message sent to the configured provider successfully.
 *       '400':
 *         description: Bad Request. Missing required fields.
 *       '500':
 *         description: Internal Server Error.
 */
router.post('/whatsapp/test-send', admin_controller_js_1.testWhatsapp);
/**
 * @swagger
 * /api/admin/automation/test-log:
 *   post:
 *     summary: Simulate an automation log and trigger notification
 *     tags: [Admin]
 *     description: Creates a mock automation log for a host in the specified Zabbix group (default 15) and triggers the notification flow.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               groupId:
 *                 type: string
 *                 default: "15"
 *                 description: The Zabbix Host Group ID to select a host from.
 *     responses:
 *       '200':
 *         description: Log created and notification process started.
 *       '404':
 *         description: No host found in the specified group.
 *       '500':
 *         description: Internal Server Error.
 */
router.post('/automation/test-log', admin_controller_js_1.testAutomationLog);
exports.default = router;
