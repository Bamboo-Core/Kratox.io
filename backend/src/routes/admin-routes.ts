
import { Router } from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuth.js';
import {
  getAllTenants,
  createTenant,
  updateTenant,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAllBlockedDomains,
  addBlockedDomainForTenant,
  getAllBlocklists,
  createBlocklist,
  updateBlocklist,
  deleteBlocklist,
  getAllAutomationCriteria,
  createAutomationCriterion,
  updateAutomationCriterion,
  deleteAutomationCriterion,
  getAllAutomationActions,
  createAutomationAction,
  updateAutomationAction,
  deleteAutomationAction,
  // New imports for scriptable automation templates
  getAllAutomationTemplates,
  getAutomationTemplateById,
  createAutomationTemplate,
  updateAutomationTemplate,
  deleteAutomationTemplate,
  // Import do novo controller de teste do WhatsApp
  testWhatsapp,
} from '../controllers/admin-controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administration endpoints for managing tenants and users. Requires admin role.
 */

// All routes in this file are protected by the admin authentication middleware
router.use(adminAuthMiddleware);

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
router.get('/tenants', getAllTenants);

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
router.post('/tenants', createTenant);

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
router.put('/tenants/:id', updateTenant);


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
router.get('/users', getAllUsers);

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
router.get('/users/:id', getUserById);

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
router.post('/users', createUser);

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
router.put('/users/:id', updateUser);

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
router.delete('/users/:id', deleteUser);


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
router.get('/dns/all-blocked-domains', getAllBlockedDomains);

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
router.post('/dns/blocked-domains', addBlockedDomainForTenant);


// --- Admin DNS Blocklist Management ---
router.get('/dns/blocklists', getAllBlocklists);
router.post('/dns/blocklists', createBlocklist);
router.put('/dns/blocklists/:id', updateBlocklist);
router.delete('/dns/blocklists/:id', deleteBlocklist);

// --- Admin Automation Rule Components (Legacy) ---
router.get('/automation/criteria', getAllAutomationCriteria);
router.post('/automation/criteria', createAutomationCriterion);
router.put('/automation/criteria/:id', updateAutomationCriterion);
router.delete('/automation/criteria/:id', deleteAutomationCriterion);

router.get('/automation/actions', getAllAutomationActions);
router.post('/automation/actions', createAutomationAction);
router.put('/automation/actions/:id', updateAutomationAction);
router.delete('/automation/actions/:id', deleteAutomationAction);

// --- Admin Automation Templates (New) ---
router.get('/automation/templates', getAllAutomationTemplates);
router.get('/automation/templates/:id', getAutomationTemplateById);
router.post('/automation/templates', createAutomationTemplate);
router.put('/automation/templates/:id', updateAutomationTemplate);
router.delete('/automation/templates/:id', deleteAutomationTemplate);

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
router.post('/whatsapp/test-send', testWhatsapp);


export default router;
