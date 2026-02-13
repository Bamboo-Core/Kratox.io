"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rules_controller_js_1 = require("../controllers/rules-controller.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Automation Rules
 *   description: Manage automation rules and templates for the tenant
 */
// Protect all rules routes with authentication
router.use(auth_js_1.authMiddleware);
// --- LEGACY ROUTES (for when FF is off) ---
router.get('/', rules_controller_js_1.getRules);
router.post('/', rules_controller_js_1.createRule);
router.put('/:id', rules_controller_js_1.updateRule);
router.delete('/:id', rules_controller_js_1.deleteRule);
// --- NEW SCRIPTABLE TEMPLATE ROUTES (for when FF is on) ---
router.get('/templates', rules_controller_js_1.getAutomationTemplatesForClient);
router.get('/subscriptions', rules_controller_js_1.getMyTemplateSubscriptions);
router.post('/subscriptions', rules_controller_js_1.subscribeToTemplate);
router.delete('/subscriptions/:templateId', rules_controller_js_1.unsubscribeFromTemplate);
exports.default = router;
