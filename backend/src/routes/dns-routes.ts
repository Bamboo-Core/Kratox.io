
import { Router } from 'express';
import { handleExtractDomains } from '../controllers/dns-controller';
import blockedDomains from '../mocks/blocked-domains.json';

const router = Router();

router.post('/extract-domains', handleExtractDomains);

router.get('/blocked-domains', (req, res) => {
  res.json(blockedDomains);
});

export default router;


