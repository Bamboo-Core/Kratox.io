
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// This must match the payload structure signed in the auth-controller
interface JwtPayload {
  userId: string;
  tenantId: string;
  role: 'admin' | 'cliente';
  zabbix_hostgroup_ids: string[];
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in auth middleware.');
    return res.status(500).json({ error: 'Internal server configuration error.' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    // Construct the user object for the request, ensuring all properties from the type are present.
    req.user = {
      id: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role,
      zabbix_hostgroup_ids: decoded.zabbix_hostgroup_ids || [], // Ensure it's an array
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
  }
}

/**
 * Optional Authentication Middleware.
 * Decodes the token if present, but allows the request to continue if not.
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continue without req.user
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in auth middleware.');
    return res.status(500).json({ error: 'Internal server configuration error.' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    req.user = {
      id: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role,
      zabbix_hostgroup_ids: decoded.zabbix_hostgroup_ids || [],
    };
    
    next();
  } catch (error) {
    // If a token was provided but it's invalid, still return 401
    return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
  }
}

