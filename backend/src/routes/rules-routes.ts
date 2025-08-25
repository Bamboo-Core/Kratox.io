

import { Router } from 'express';
import {
    getRules,
    createRule,
    updateRule,
    deleteRule,
} from '../controllers/rules-controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Automation Rules
 *   description: Manage automation rules for the tenant
 */

// Protect all rules routes with authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/rules:
 *   get:
 *     summary: Get all automation rules for the current tenant
 *     tags: [Automation Rules]
 *     responses:
 *       200:
 *         description: A list of automation rules.
 */
router.get('/', getRules);

/**
 * @swagger
 * /api/rules:
 *   post:
 *     summary: Create a new automation rule
 *     tags: [Automation Rules]
 *     responses:
 *       201:
 *         description: The rule was created successfully.
 */
router.post('/', createRule);

/**
 * @swagger
 * /api/rules/{id}:
 *   put:
 *     summary: Update an existing automation rule
 *     tags: [Automation Rules]
 *     responses:
 *       200:
 *         description: The rule was updated successfully.
 */
router.put('/:id', updateRule);

/**
 * @swagger
 * /api/rules/{id}:
 *   delete:
 *     summary: Delete an automation rule
 *     tags: [Automation Rules]
 *     responses:
 *       204:
 *         description: The rule was deleted successfully.
 */
router.delete('/:id', deleteRule);


export default router;
