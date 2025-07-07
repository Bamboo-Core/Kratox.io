import { Router } from 'express';
import { 
  getBlockedDomains, // Changed getBlockedDomains to listBlockedDomains
  addBlockedDomain, 
  removeBlockedDomain 
} from '../controllers/dns-controller.js';

const router = Router();

// Routes for managing the list of blocked domains
router.get('/blocked-domains', getBlockedDomains); // Using the updated function name
router.post('/blocked-domains', addBlockedDomain);
router.delete('/blocked-domains/:id', removeBlockedDomain);

export default router;
