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
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Tenant created successfully.
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
 *     responses:
 *       '200':
 *         description: The user object.
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
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, collaborator]
 *               tenantId:
 *                 type: string
 *     responses:
 *       '201':
 *         description: User created successfully.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, collaborator]
 *               tenantId:
 *                 type: string
 *               password:
 *                 type: string
 *                 description: Optional. Leave blank to keep current password.
 *     responses:
 *       '200':
 *         description: User updated successfully.
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
 *     responses:
 *       '204':
 *         description: User deleted successfully.
 *       '404':
 *         description: User not found.
 */
router.delete('/users/:id', deleteUser);

export default router;
