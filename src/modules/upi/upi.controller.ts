import { Request, Response, NextFunction } from 'express';
import { UpiVerificationService } from './upi.service';
import { prisma } from '../../db/prisma';

const getUserId = (req: Request): string | null =>
  (req as any).user?.id || req.headers['x-user-id'] as string || null;

// ── Verify UPI ID (public endpoint) ─────────────────────────────────────────
export const verifyUpiHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { upiId, name, userId } = req.body;

    if (!upiId || typeof upiId !== 'string') {
      return res.status(400).json({ success: false, error: 'UPI ID is required' });
    }

    const result = await UpiVerificationService.verifyUpiId(upiId, name);

    // Update legacy single UPI field on User for backwards compat
    const targetUserId = getUserId(req) || userId;
    if (result.valid && targetUserId) {
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          upiId: result.upiId,
          upiVerified: true,
          upiPayeeName: result.registeredPayeeName,
        },
      }).catch(() => {});
    }

    return res.status(result.valid ? 200 : 400).json({ success: result.valid, data: result });
  } catch (err) {
    next(err);
  }
};

// ── List all UPI IDs for user ─────────────────────────────────────────────────
export const listUpiIdsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const upiIds = await prisma.userUpi.findMany({
      where: { userId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({ success: true, data: upiIds });
  } catch (err) {
    next(err);
  }
};

// ── Add a UPI ID (verify then store) ─────────────────────────────────────────
export const addUpiIdHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const { upiId } = req.body;
    if (!upiId) return res.status(400).json({ success: false, error: 'upiId is required' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Verify UPI with NPCI
    const verification = await UpiVerificationService.verifyUpiId(upiId, user.name);

    if (!verification.valid) {
      return res.status(400).json({ success: false, error: verification.message || 'Invalid UPI ID' });
    }

    // Check if this UPI ID is already added for this user
    const existing = await prisma.userUpi.findFirst({
      where: { userId, upiId: verification.upiId },
    });

    if (existing) {
      return res.status(409).json({ success: false, error: 'This UPI ID is already added to your account.' });
    }

    // First UPI? Make it primary
    const existingCount = await prisma.userUpi.count({ where: { userId } });
    const isPrimary = existingCount === 0;

    const newUpi = await prisma.userUpi.create({
      data: {
        userId,
        upiId: verification.upiId,
        bankName: verification.bankName,
        handle: verification.handle,
        payeeName: verification.registeredPayeeName,
        isVerified: true,
        isPrimary,
      },
    });

    // Keep legacy field in sync
    if (isPrimary) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          upiId: verification.upiId,
          upiVerified: true,
          upiPayeeName: verification.registeredPayeeName,
        },
      }).catch(() => {});
    }

    res.json({ success: true, data: newUpi });
  } catch (err) {
    next(err);
  }
};

// ── Delete a UPI ID ───────────────────────────────────────────────────────────
export const deleteUpiIdHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const { upiIdRecordId } = req.params;

    const record = await prisma.userUpi.findFirst({
      where: { id: upiIdRecordId, userId },
    });

    if (!record) return res.status(404).json({ success: false, error: 'UPI ID not found' });

    await prisma.userUpi.delete({ where: { id: upiIdRecordId } });

    // If deleted was primary, promote the next one
    if (record.isPrimary) {
      const next = await prisma.userUpi.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (next) {
        await prisma.userUpi.update({ where: { id: next.id }, data: { isPrimary: true } });
        await prisma.user.update({
          where: { id: userId },
          data: { upiId: next.upiId, upiVerified: next.isVerified, upiPayeeName: next.payeeName },
        }).catch(() => {});
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: { upiId: null, upiVerified: false, upiPayeeName: null },
        }).catch(() => {});
      }
    }

    res.json({ success: true, message: 'UPI ID removed' });
  } catch (err) {
    next(err);
  }
};

// ── Set primary UPI ID ────────────────────────────────────────────────────────
export const setPrimaryUpiHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const { upiIdRecordId } = req.params;

    const record = await prisma.userUpi.findFirst({
      where: { id: upiIdRecordId, userId },
    });

    if (!record) return res.status(404).json({ success: false, error: 'UPI ID not found' });

    // Unset all primaries, then set the selected one
    await prisma.userUpi.updateMany({ where: { userId }, data: { isPrimary: false } });
    await prisma.userUpi.update({ where: { id: upiIdRecordId }, data: { isPrimary: true } });

    // Sync legacy field
    await prisma.user.update({
      where: { id: userId },
      data: { upiId: record.upiId, upiVerified: record.isVerified, upiPayeeName: record.payeeName },
    }).catch(() => {});

    res.json({ success: true, message: 'Primary UPI updated' });
  } catch (err) {
    next(err);
  }
};
