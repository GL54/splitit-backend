"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordPaymentHandler = exports.saveAllocationsHandler = exports.joinBillHandler = exports.getBillByTokenHandler = exports.getBillHandler = exports.createBillHandler = void 0;
const bills_service_1 = require("./bills.service");
const createBillHandler = async (req, res, next) => {
    try {
        const { merchantName, title, items, taxPaise, discountPaise, serviceChargePaise, originalImagePath } = req.body;
        const ownerId = req.user?.id || req.body.ownerId || 'owner';
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Bill must contain at least one item' });
        }
        const bill = await bills_service_1.BillsService.createBill({
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
    }
    catch (err) {
        next(err);
    }
};
exports.createBillHandler = createBillHandler;
const getBillHandler = async (req, res, next) => {
    try {
        const id = req.params.id;
        const bill = await bills_service_1.BillsService.getBillById(id);
        if (!bill) {
            return res.status(404).json({ success: false, error: 'Bill not found' });
        }
        res.json({ success: true, data: bill });
    }
    catch (err) {
        next(err);
    }
};
exports.getBillHandler = getBillHandler;
const getBillByTokenHandler = async (req, res, next) => {
    try {
        const token = req.params.token;
        const bill = await bills_service_1.BillsService.getBillByToken(token);
        if (!bill) {
            return res.status(404).json({ success: false, error: 'Bill not found for token' });
        }
        res.json({ success: true, data: bill });
    }
    catch (err) {
        next(err);
    }
};
exports.getBillByTokenHandler = getBillByTokenHandler;
const joinBillHandler = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { name } = req.body;
        const userId = req.user?.isGuest ? undefined : req.user?.id;
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ success: false, error: 'Participant name is required' });
        }
        const participant = await bills_service_1.BillsService.joinBill(id, name, userId);
        res.status(201).json({ success: true, data: participant });
    }
    catch (err) {
        next(err);
    }
};
exports.joinBillHandler = joinBillHandler;
const saveAllocationsHandler = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { participantId, claims } = req.body;
        if (!participantId || !Array.isArray(claims)) {
            return res.status(400).json({ success: false, error: 'participantId and claims array are required' });
        }
        const updatedBill = await bills_service_1.BillsService.saveAllocations(id, participantId, claims);
        res.json({ success: true, data: updatedBill });
    }
    catch (err) {
        next(err);
    }
};
exports.saveAllocationsHandler = saveAllocationsHandler;
const recordPaymentHandler = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { participantId, payeeUpiId, amountPaise, referenceId } = req.body;
        if (!participantId || !payeeUpiId || !amountPaise) {
            return res.status(400).json({ success: false, error: 'participantId, payeeUpiId, and amountPaise are required' });
        }
        const paymentResult = await bills_service_1.BillsService.recordPayment(id, participantId, payeeUpiId, amountPaise, referenceId);
        res.json({ success: true, data: paymentResult });
    }
    catch (err) {
        next(err);
    }
};
exports.recordPaymentHandler = recordPaymentHandler;
