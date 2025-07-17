
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

export async function updateUserProfile(req: Request, res: Response) {
    // The user ID is extracted from the JWT token by the authMiddleware
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: User ID not found in token.' });
    }

    const { name, password } = req.body;

    // Basic validation
    if (!name && !password) {
        return res.status(400).json({ error: 'Bad Request: You must provide a name or a new password.' });
    }
    if (name && typeof name !== 'string' || name.length < 2) {
        return res.status(400).json({ error: 'Name must be a string with at least 2 characters.' });
    }
     if (password && typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Password must be a string with at least 8 characters.' });
    }


    try {
        const updates: any[] = [];
        let querySetters: string[] = [];

        if (name) {
            updates.push(name);
            querySetters.push(`name = $${updates.length}`);
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push(hashedPassword);
            querySetters.push(`password_hash = $${updates.length}`);
        }

        updates.push(userId);
        const query = `
            UPDATE users
            SET ${querySetters.join(', ')}
            WHERE id = $${updates.length}
            RETURNING id, name, email
        `;

        const result = await pool.query(query, updates);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error('Error in updateUserProfile:', error);
        res.status(500).json({ error: 'Failed to update user profile.' });
    }
}
