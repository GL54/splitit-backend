import { Router } from 'express';
import {
  createBillHandler,
  getBillHandler,
  getBillByTokenHandler,
  joinBillHandler,
  saveAllocationsHandler,
  recordPaymentHandler,
} from './bills.controller';
import { optionalAuth } from '../../middleware/auth0';

export const billsRouter = Router();

billsRouter.post('/', optionalAuth, createBillHandler);
billsRouter.get('/share/:token', getBillByTokenHandler);
billsRouter.get('/:id', getBillHandler);
billsRouter.post('/:id/join', optionalAuth, joinBillHandler);
billsRouter.post('/:id/allocations', optionalAuth, saveAllocationsHandler);
billsRouter.post('/:id/payments', optionalAuth, recordPaymentHandler);
