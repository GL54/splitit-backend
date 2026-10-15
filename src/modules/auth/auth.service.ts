import { prisma } from '../../db/prisma';
import { generateDevToken } from '../../middleware/auth0';

export class AuthService {
  /**
   * Sync or create user from Auth0 JWT payload
   */
  static async syncAuth0User(data: { auth0Id: string; name?: string; email?: string; picture?: string }) {
    return prisma.user.upsert({
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
  static async createGuestUser(name: string) {
    const user = await prisma.user.create({
      data: {
        name: name.trim() || 'Guest',
      },
    });

    return {
      user,
      token: generateDevToken({ id: user.id, name: user.name }),
    };
  }

  /**
   * Find or create user by Indian phone number
   */
  static async findOrCreateByPhone(phone: string, name?: string) {
    let user = await prisma.user.findFirst({ where: { phone } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          name: name?.trim() || `User ${phone.slice(-4)}`,
        },
      });
    } else if (name && user.name.startsWith('User ')) {
      // Update name if it was auto-generated
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: name.trim() },
      });
    }

    const token = generateDevToken({ id: user.id, name: user.name, phone: user.phone ?? undefined });
    return { user, token };
  }

  /**
   * Get user profile by ID (with UPI IDs)
   */
  static async getUserProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        upiIds: { orderBy: { createdAt: 'desc' } },
        billsOwned: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }
}
