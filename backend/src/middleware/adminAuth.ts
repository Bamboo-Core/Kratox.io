import type { Request, Response, NextFunction } from 'express';
import { authMiddleware } from './auth.js';

// This middleware must be used *after* the standard authMiddleware.
// It checks if the authenticated user has the 'admin' role.
export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // First, ensure the user is authenticated at all.
  authMiddleware(req, res, () => {
    // If authMiddleware succeeds, req.user will be populated.
    // Now check for the admin role.
    if (req.user?.role === 'admin') {
      next(); // User is an admin, proceed to the next handler.
    } else {
      // User is authenticated but not an admin.
      res.status(403).json({ error: 'Forbidden: Access is restricted to administrators.' });
    }
  });
}
