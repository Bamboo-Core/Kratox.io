// This declaration file allows us to extend the Express Request object
// to include our custom 'user' property after JWT verification.

declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      tenantId: string;
      role: 'admin' | 'collaborator';
    };
  }
}
