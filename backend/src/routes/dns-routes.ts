
import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';

interface BlockedDomain {
  id: string;
  domain: string;
  blockedAt: string;
}

const blockedDomainsPath = path.join(__dirname, '../mocks/blocked-domains.json');

const router = Router();

router.post('/extract-domains', (req, res) => {
 const newDomains: string[] = req.body;
 if (!Array.isArray(newDomains)) {
 return res.status(400).json({ error: 'Request body must be an array of domains' });
 }

  let blockedDomainsData = JSON.parse(fs.readFileSync(blockedDomainsPath, 'utf-8'));
  const currentBlockedDomains: BlockedDomain[] = blockedDomainsData.blockedDomains || [];


  const newBlockedDomains: BlockedDomain[] = newDomains.map(domain => ({
    id: Date.now().toString() + Math.random().toString(36).substring(2, 15), // Simple unique ID
    domain: domain,
    blockedAt: new Date().toISOString(),
  }));

  const combinedBlockedDomains = [...currentBlockedDomains, ...newBlockedDomains];
  blockedDomainsData.blockedDomains = combinedBlockedDomains;
 fs.writeFileSync(blockedDomainsPath, JSON.stringify(blockedDomainsData, null, 2));

  res.json(blockedDomainsData);
});

router.get('/blocked-domains', (req, res) => {
  const blockedDomainsData = JSON.parse(fs.readFileSync(blockedDomainsPath, 'utf-8'));
 res.json(blockedDomainsData);
});

export default router;
