import { prisma } from '../../db/prisma';
import crypto from 'crypto';

export interface CreateBillInput {
  ownerId: string;
  merchantName: string;
  title: string;
  items: {
    name: string;
    quantity: number;
    unitPricePaise: number;
    totalPricePaise: number;
    taxable?: boolean;
  }[];
  taxPaise?: number;
  discountPaise?: number;
  serviceChargePaise?: number;
  originalImagePath?: string;
  ownerName?: string;
  upiId?: string;
  payeeName?: string;
}

export class BillsService {
  /**
   * Generate an 8-character uppercase alphanumeric share token
   */
  static generateShareToken(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Create a new bill with strict server-side calculation
   */
  static async createBill(input: CreateBillInput) {
    // 1. Calculate and validate subtotal on server
    let calculatedSubtotal = 0;
    const validatedItems = input.items.map((item, index) => {
      const quantity = Math.max(1, item.quantity);
      const unitPrice = Math.max(0, item.unitPricePaise);
      const totalPrice = unitPrice * quantity;
      calculatedSubtotal += totalPrice;
      return {
        name: item.name.trim() || `Item ${index + 1}`,
        quantity,
        unitPricePaise: unitPrice,
        totalPricePaise: totalPrice,
        taxable: item.taxable ?? true,
        orderIndex: index,
      };
    });

    const tax = Math.max(0, input.taxPaise || 0);
    const discount = Math.max(0, input.discountPaise || 0);
    const serviceCharge = Math.max(0, input.serviceChargePaise || 0);
    const calculatedTotal = Math.max(0, calculatedSubtotal + tax - discount + serviceCharge);

    let token = this.generateShareToken();
    // Ensure token uniqueness
    while (await prisma.bill.findUnique({ where: { shareToken: token } })) {
      token = this.generateShareToken();
    }

    const upiId = input.upiId?.trim().toLowerCase() || undefined;
    const payeeName = input.payeeName?.trim() || undefined;
    const ownerName = input.ownerName?.trim() || undefined;

    // Ensure owner exists, and keep the UPI that will be paid on the share link.
    await prisma.user.upsert({
      where: { id: input.ownerId },
      update: {
        ...(ownerName ? { name: ownerName } : {}),
        ...(upiId
          ? {
              upiId,
              upiVerified: true,
              upiPayeeName: payeeName || ownerName,
            }
          : {}),
      },
      create: {
        id: input.ownerId,
        name: ownerName || 'Bill Owner',
        upiId,
        upiVerified: Boolean(upiId),
        upiPayeeName: payeeName || ownerName,
      },
    });

    const bill = await prisma.bill.create({
      data: {
        ownerId: input.ownerId,
        merchantName: input.merchantName.trim() || 'Restaurant / Store',
        title: input.title.trim() || 'My Bill',
        subtotalPaise: calculatedSubtotal,
        taxPaise: tax,
        discountPaise: discount,
        serviceChargePaise: serviceCharge,
        totalPaise: calculatedTotal,
        shareToken: token,
        status: 'DRAFT',
        originalImagePath: input.originalImagePath,
        items: {
          create: validatedItems,
        },
      },
      include: {
        items: true,
        owner: true,
        participants: true,
      },
    });

    return bill;
  }

  /**
   * Get bill by ID with full relations
   */
  static async getBillById(id: string) {
    return prisma.bill.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { orderIndex: 'asc' },
          include: { allocations: true },
        },
        participants: {
          include: { allocations: true, payments: true },
        },
        owner: {
          select: {
            id: true,
            name: true,
            upiId: true,
            upiVerified: true,
            upiPayeeName: true,
          },
        },
      },
    });
  }

  /**
   * Get bill by share token
   */
  static async getBillByToken(token: string) {
    return prisma.bill.findUnique({
      where: { shareToken: token.toUpperCase() },
      include: {
        items: {
          orderBy: { orderIndex: 'asc' },
          include: { allocations: true },
        },
        participants: true,
        owner: {
          select: {
            id: true,
            name: true,
            upiId: true,
            upiVerified: true,
            upiPayeeName: true,
          },
        },
      },
    });
  }

  /**
   * Join a bill as participant
   */
  static async joinBill(billId: string, name: string, userId?: string) {
    const bill = await prisma.bill.findUnique({ where: { id: billId } });
    if (!bill) throw new Error('Bill not found');

    const participant = await prisma.participant.create({
      data: {
        billId,
        name: name.trim() || 'Guest',
        userId: userId || null,
        isGuest: !userId,
        paymentStatus: 'UNPAID',
      },
    });

    return participant;
  }

  /**
   * Submit participant item allocations and calculate exact participant shares
   */
  static async saveAllocations(
    billId: string,
    participantId: string,
    claims: { billItemId: string; quantity: number }[]
  ) {
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: { items: true, participants: true },
    });
    if (!bill) throw new Error('Bill not found');

    // 1. Update allocations for participant
    await prisma.itemAllocation.deleteMany({
      where: { participantId },
    });

    for (const claim of claims) {
      if (claim.quantity > 0) {
        await prisma.itemAllocation.create({
          data: {
            billItemId: claim.billItemId,
            participantId,
            quantityClaimed: claim.quantity,
          },
        });
      }
    }

    // 2. Recalculate participant share using server-side integer paise engine
    await this.recalculateShares(billId);

    return this.getBillById(billId);
  }

  /**
   * Server-side calculation of shares, proportional tax, and discounts
   */
  static async recalculateShares(billId: string) {
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        items: { include: { allocations: true } },
        participants: { include: { allocations: true } },
      },
    });
    if (!bill) return;

    for (const participant of bill.participants) {
      let claimedAmountPaise = 0;

      for (const allocation of participant.allocations) {
        const item = bill.items.find((i) => i.id === allocation.billItemId);
        if (!item) continue;

        // Total claim count across all participants for this item
        const totalAllocatedForThisItem = item.allocations.reduce(
          (sum, a) => sum + a.quantityClaimed,
          0
        );

        if (totalAllocatedForThisItem > 0) {
          // If split equally among claims
          const itemCostShare = Math.round(
            (item.totalPricePaise * allocation.quantityClaimed) / totalAllocatedForThisItem
          );
          claimedAmountPaise += itemCostShare;
        }
      }

      // Proportional tax and discount
      let taxAmountPaise = 0;
      let discountAmountPaise = 0;

      if (bill.subtotalPaise > 0) {
        taxAmountPaise = Math.round((bill.taxPaise * claimedAmountPaise) / bill.subtotalPaise);
        discountAmountPaise = Math.round(
          (bill.discountPaise * claimedAmountPaise) / bill.subtotalPaise
        );
      }

      const totalOwedPaise = Math.max(0, claimedAmountPaise + taxAmountPaise - discountAmountPaise);

      await prisma.participant.update({
        where: { id: participant.id },
        data: {
          claimedAmountPaise,
          taxAmountPaise,
          totalOwedPaise,
        },
      });
    }
  }

  /**
   * Record a payment and generate standard UPI Intent URI
   */
  static async recordPayment(
    billId: string,
    participantId: string,
    payeeUpiId: string,
    amountPaise: number,
    referenceId?: string
  ) {
    const amountRupees = (amountPaise / 100).toFixed(2);
    const bill = await prisma.bill.findUnique({ where: { id: billId } });

    // Format standard UPI payment intent link:
    // upi://pay?pa=payee@bank&pn=PayeeName&am=123.45&cu=INR&tn=SplitIt Bill Payment
    const payeeNameEncoded = encodeURIComponent(bill?.title || 'SplitIt Bill');
    const noteEncoded = encodeURIComponent(`SplitIt: ${bill?.merchantName || 'Bill'}`);
    const upiIntentUri = `upi://pay?pa=${payeeUpiId}&pn=${payeeNameEncoded}&am=${amountRupees}&cu=INR&tn=${noteEncoded}`;

    const payment = await prisma.payment.create({
      data: {
        billId,
        participantId,
        payeeUpiId,
        amountPaise,
        referenceId,
        status: 'PENDING',
      },
    });

    // Mark participant as PENDING or PAID
    await prisma.participant.update({
      where: { id: participantId },
      data: { paymentStatus: 'PENDING' },
    });

    return {
      payment,
      upiIntentUri,
    };
  }
}
