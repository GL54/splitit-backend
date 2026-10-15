"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const prisma_1 = require("../../db/prisma");
const auth0_1 = require("../../middleware/auth0");
class AuthService {
    /**
     * Sync or create user from Auth0 JWT payload
     */
    static async syncAuth0User(data) {
        return prisma_1.prisma.user.upsert({
            where: { auth0Id: data.auth0Id },
            update: {
                name: data.name || 'User',
                email: data.email,
            },
            create: {
                auth0Id: data.auth0Id,
                name: data.name || 'User',
                email: data.email,
            },
        });
    }
    /**
     * Create a lightweight guest user
     */
    static async createGuestUser(name) {
        const user = await prisma_1.prisma.user.create({
            data: {
                name: name.trim() || 'Guest',
            },
        });
        return {
            user,
            token: (0, auth0_1.generateDevToken)({ id: user.id, name: user.name }),
        };
    }
    /**
     * Get user profile by ID
     */
    static async getUserProfile(userId) {
        return prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                billsOwned: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }
}
exports.AuthService = AuthService;
