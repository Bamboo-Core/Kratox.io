"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuthMiddleware = adminAuthMiddleware;
const auth_js_1 = require("./auth.js");
// This middleware must be used *after* the standard authMiddleware.
// It checks if the authenticated user has the 'admin' role.
function adminAuthMiddleware(req, res, next) {
    // First, ensure the user is authenticated at all.
    (0, auth_js_1.authMiddleware)(req, res, () => {
        // If authMiddleware succeeds, req.user will be populated.
        // Now check for the admin role.
        if (req.user?.role === 'admin') {
            next(); // User is an admin, proceed to the next handler.
        }
        else {
            // User is authenticated but not an admin.
            res.status(403).json({ error: 'Forbidden: Access is restricted to administrators.' });
        }
    });
}
