
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { getPasswordValidationError } from '../utils/password-validator.js';

export async function updateUserProfile(req: Request, res: Response) {
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
        const passwordError = getPasswordValidationError(password);
        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }
    }

    try {
        const updates: any[] = [];
        let querySetters: string[] = [];

        if (name) {
            updates.push(name);
            querySetters.push(`name = $${updates.length}`);
        }

        // This block is now safe because of the validation above.
        // It only runs if `password` is a non-empty, validated string.
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
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

        const result = await pool.query(query, updates);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json(result.rows[0]);

    } catch (error) {
        // This will catch the TypeError if it ever happens again
        console.error('Error in updateUserProfile:', error);
        res.status(500).json({ error: 'Failed to update user profile.' });
    }
}

export async function deleteAccount(req: Request, res: Response) {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;

    if (!userId || !tenantId) {
        return res.status(401).json({ error: 'Unauthorized: Missing user or tenant context.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check user count for this tenant
        const countRes = await client.query(
            'SELECT COUNT(*)::int as count FROM users WHERE tenant_id = $1',
            [tenantId]
        );
        const userCount = countRes.rows[0].count;

        if (userCount === 1) {
            // Sole user: Delete the entire tenant (will cascade delete the user and all tenant data)
            console.log(`Deleting sole tenant ${tenantId} for user ${userId}`);
            await client.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
        } else {
            // Organization tenant: Delete only the user
            console.log(`Deleting user ${userId} from organization tenant ${tenantId}`);
            await client.query('DELETE FROM users WHERE id = $1', [userId]);
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Account deleted successfully.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in deleteAccount:', error);
        res.status(500).json({ error: 'Failed to delete account.' });
    } finally {
        client.release();
    }
}
