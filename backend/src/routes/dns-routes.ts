
import { Router } from 'express';
import { handleExtractDomains } from '../controllers/dns-controller';

const router = Router();

router.post('/extract-domains', handleExtractDomains);

export default router;
