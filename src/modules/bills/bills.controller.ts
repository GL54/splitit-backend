import { Request, Response, NextFunction } from 'express';
import { BillsService } from './bills.service';

export const createBillHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { merchantName, title, items, taxPaise, discountPaise, serviceChargePaise, originalImagePath } = req.body;
    const ownerId = req.user?.id || req.body.ownerId || 'owner';

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Bill must contain at least one item' });
    }

    const bill = await BillsService.createBill({
      ownerId,
      merchantName,
      title,
      items,
      taxPaise,
      discountPaise,
      serviceChargePaise,
      originalImagePath,
    });

    res.status(201).json({ success: true, data: bill });
  } catch (err) {
    next(err);
  }
};

export const getBillHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const bill = await BillsService.getBillById(id);
    if (!bill) {
      return res.status(404).json({ success: false, error: 'Bill not found' });
    }
    res.json({ success: true, data: bill });
  } catch (err) {
    next(err);
  }
};

export const getBillByTokenHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token as string;
    const bill = await BillsService.getBillByToken(token);
    if (!bill) {
      return res.status(404).json({ success: false, error: 'Bill not found for token' });
    }
    res.json({ success: true, data: bill });
  } catch (err) {
    next(err);
  }
};

export const joinBillHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name } = req.body;
    const userId = req.user?.isGuest ? undefined : req.user?.id;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: 'Participant name is required' });
    }

    const participant = await BillsService.joinBill(id, name, userId);
    res.status(201).json({ success: true, data: participant });
  } catch (err) {
    next(err);
  }
};

export const saveAllocationsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { participantId, claims } = req.body;

    if (!participantId || !Array.isArray(claims)) {
      return res.status(400).json({ success: false, error: 'participantId and claims array are required' });
    }

    const updatedBill = await BillsService.saveAllocations(id, participantId, claims);
    res.json({ success: true, data: updatedBill });
  } catch (err) {
    next(err);
  }
};

export const recordPaymentHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { participantId, payeeUpiId, amountPaise, referenceId } = req.body;

    if (!participantId || !payeeUpiId || !amountPaise) {
      return res.status(400).json({ success: false, error: 'participantId, payeeUpiId, and amountPaise are required' });
    }

    const paymentResult = await BillsService.recordPayment(
      id,
      participantId,
      payeeUpiId,
      amountPaise,
      referenceId
    );

    res.json({ success: true, data: paymentResult });
  } catch (err) {
    next(err);
  }
};
