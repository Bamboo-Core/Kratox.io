
import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const blockedDomainsPath = path.join(__dirname, '../mocks/blocked-domains.json');

const router = Router();

router.post('/extract-domains', (req, res) => {
 const newDomains: string[] = req.body;
 if (!Array.isArray(newDomains)) {
 return res.status(400).json({ error: 'Request body must be an array of domains' });
 }

  let blockedDomains = JSON.parse(fs.readFileSync(blockedDomainsPath, 'utf-8'));
  const updatedBlockedDomains = Array.from(new Set([...blockedDomains, ...newDomains]));
 fs.writeFileSync(blockedDomainsPath, JSON.stringify(updatedBlockedDomains, null, 2));

  res.json(updatedBlockedDomains);
});

router.get('/blocked-domains', (req, res) => {
  const blockedDomains = JSON.parse(fs.readFileSync(blockedDomainsPath, 'utf-8'));
 res.json(blockedDomains);
});

export default router;


