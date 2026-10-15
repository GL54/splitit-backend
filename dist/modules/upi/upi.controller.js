"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyUpiHandler = void 0;
const upi_service_1 = require("./upi.service");
const prisma_1 = require("../../db/prisma");
const verifyUpiHandler = async (req, res, next) => {
    try {
        const { upiId, name, userId } = req.body;
        if (!upiId || typeof upiId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'UPI ID is required',
            });
        }
        const result = await upi_service_1.UpiVerificationService.verifyUpiId(upiId, name);
        // If user is identified and UPI is valid, update user record in database
        const targetUserId = req.user?.id || userId;
        if (result.valid && targetUserId) {
            await prisma_1.prisma.user.upsert({
                where: { id: targetUserId },
                update: {
                    upiId: result.upiId,
                    upiVerified: true,
                    upiPayeeName: result.registeredPayeeName,
                },
                create: {
                    id: targetUserId,
                    name: name || 'User',
                    upiId: result.upiId,
                    upiVerified: true,
                    upiPayeeName: result.registeredPayeeName,
                },
            }).catch((err) => {
                console.warn('Could not auto-update user UPI status:', err.message);
            });
        }
        return res.status(result.valid ? 200 : 400).json({
            success: result.valid,
            data: result,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.verifyUpiHandler = verifyUpiHandler;
