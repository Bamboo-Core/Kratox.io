"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authMiddleware(req, res, next) {
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
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        // Construct the user object for the request, ensuring all properties from the type are present.
        req.user = {
            id: decoded.userId,
            tenantId: decoded.tenantId,
            role: decoded.role,
            zabbix_hostgroup_ids: decoded.zabbix_hostgroup_ids || [], // Ensure it's an array
        };
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
    }
}
