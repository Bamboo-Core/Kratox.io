
import { Router } from 'express';
import { 
  handleExtractDomains, 
  getBlockedDomains, 
  addBlockedDomain, 
  removeBlockedDomain 
} from '../controllers/dns-controller';

const router = Router();

// Route for AI-powered domain extraction from text
router.post('/extract-domains', handleExtractDomains);

// Routes for managing the list of blocked domains
router.get('/blocked-domains', getBlockedDomains);
router.post('/blocked-domains', addBlockedDomain);
router.delete('/blocked-domains/:id', removeBlockedDomain);

export default router;
