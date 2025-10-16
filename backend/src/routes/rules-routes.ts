

import { Router } from 'express';
import {
    getRules,
    createRule,
    updateRule,
    deleteRule,
    // New imports for template subscriptions
    getAutomationTemplatesForClient,
    getMyTemplateSubscriptions,
    subscribeToTemplate,
    unsubscribeFromTemplate,
} from '../controllers/rules-controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Automation Rules
 *   description: Manage automation rules and templates for the tenant
 */

// Protect all rules routes with authentication
router.use(authMiddleware);

// --- LEGACY ROUTES (for when FF is off) ---
router.get('/', getRules);
router.post('/', createRule);
router.put('/:id', updateRule);
router.delete('/:id', deleteRule);

// --- NEW SCRIPTABLE TEMPLATE ROUTES (for when FF is on) ---
router.get('/templates', getAutomationTemplatesForClient);
router.get('/subscriptions', getMyTemplateSubscriptions);
router.post('/subscriptions', subscribeToTemplate);
router.delete('/subscriptions/:templateId', unsubscribeFromTemplate);


export default router;

    