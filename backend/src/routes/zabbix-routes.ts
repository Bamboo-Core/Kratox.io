
import { Router } from 'express';
import { getHosts, getAlerts } from '../controllers/zabbix-controller.js';
import { authMiddleware } from '../middleware/auth.js';
import '../config/zabbix-config.js'; // Ensures Zabbix config is loaded and warnings are shown if vars are missing

const router = Router();

// Protect all Zabbix routes with the authentication middleware
router.use(authMiddleware);

// Route to get the list of monitored hosts
router.get('/hosts', getHosts);

// Route to get the list of active alerts/problems
router.get('/alerts', getAlerts);

export default router;
