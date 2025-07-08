import { Router } from 'express';
import { 
  getBlockedDomains,
  addBlockedDomain, 
  removeBlockedDomain 
} from '../controllers/dns-controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Protect all DNS routes with the authentication middleware
router.use(authMiddleware);

// Routes for managing the list of blocked domains
router.get('/blocked-domains', getBlockedDomains);
router.post('/blocked-domains', addBlockedDomain);
router.delete('/blocked-domains/:id', removeBlockedDomain);

export default router;
