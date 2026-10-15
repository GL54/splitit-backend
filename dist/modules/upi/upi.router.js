"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upiRouter = void 0;
const express_1 = require("express");
const upi_controller_1 = require("./upi.controller");
const auth0_1 = require("../../middleware/auth0");
exports.upiRouter = (0, express_1.Router)();
exports.upiRouter.post('/verify', auth0_1.optionalAuth, upi_controller_1.verifyUpiHandler);
