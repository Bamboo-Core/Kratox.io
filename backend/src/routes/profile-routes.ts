
import { Router } from 'express';
import { updateUserProfile } from '../controllers/profile-controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: User profile management for the logged-in user
 */

// Protect all profile routes with authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/profile:
 *   put:
 *     summary: Update the current user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The user's new full name.
 *                 example: "John Doe Updated"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: The user's new password. Must be at least 8 characters. Leave blank to keep current password.
 *                 example: "newStrongPassword123"
 *     responses:
 *       '200':
 *         description: Profile updated successfully. Returns the updated user object (without password).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                   format: email
 *       '400':
 *         description: Bad Request. Invalid data provided.
 *       '401':
 *         description: Unauthorized.
 *       '500':
 *         description: Internal Server Error.
 */
router.put('/', updateUserProfile);

export default router;
