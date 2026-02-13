"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserProfile = updateUserProfile;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_js_1 = __importDefault(require("../config/database.js"));
const password_validator_js_1 = require("../utils/password-validator.js");
async function updateUserProfile(req, res) {
    // The user ID is extracted from the JWT token by the authMiddleware
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: User ID not found in token.' });
    }
    const { name, password, passwordConfirmation, phone_number } = req.body;
    // Basic validation
    if (!name && !password && !phone_number) {
        return res.status(400).json({ error: 'Bad Request: You must provide at least one field to update.' });
    }
    if (name && (typeof name !== 'string' || name.length < 2)) {
        return res.status(400).json({ error: 'Name must be a string with at least 2 characters.' });
    }
    // Password validation logic - only if user is trying to change the password
    if (password || passwordConfirmation) {
        if (password !== passwordConfirmation) {
            return res.status(400).json({ error: 'Passwords do not match.' });
        }
        const passwordError = (0, password_validator_js_1.getPasswordValidationError)(password);
        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }
    }
    try {
        const updates = [];
        let querySetters = [];
        if (name) {
            updates.push(name);
            querySetters.push(`name = $${updates.length}`);
        }
        // This block is now safe because of the validation above.
        // It only runs if `password` is a non-empty, validated string.
        if (password) {
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            updates.push(hashedPassword);
            querySetters.push(`password_hash = $${updates.length}`);
        }
        if (phone_number) {
            updates.push(phone_number);
            querySetters.push(`phone_number = $${updates.length}`);
        }
        updates.push(userId);
        const query = `
            UPDATE users
            SET ${querySetters.join(', ')}
            WHERE id = $${updates.length}
            RETURNING id, name, email, phone_number
        `;
        const result = await database_js_1.default.query(query, updates);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.status(200).json(result.rows[0]);
    }
    catch (error) {
        // This will catch the TypeError if it ever happens again
        console.error('Error in updateUserProfile:', error);
        res.status(500).json({ error: 'Failed to update user profile.' });
    }
}
