
import { Router } from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuth.js';
import {
  getAllTenants,
  createTenant,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAllBlockedDomains,
  addBlockedDomainForTenant,
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
 *         description: A list of all users.
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
 *                 enum: [admin, cliente]
 *                 example: "cliente"
 *               tenantId:
 *                 type: string
 *                 format: uuid
 *                 description: Required if role is 'cliente'. The ID of the tenant to associate the user with.
 *                 example: "00000000-0000-0000-0000-000000000000"
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
 *                 enum: [admin, cliente]
 *                 example: "admin"
 *               tenantId:
 *                 type: string
 *                 format: uuid
 *                 description: "Required if role is 'cliente'"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Optional. Leave blank to keep current password.
 *                 example: "newstrongpassword456"
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


export default router;
