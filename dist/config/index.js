"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    auth0: {
        domain: process.env.AUTH0_DOMAIN || '',
        audience: process.env.AUTH0_AUDIENCE || '',
    },
    upi: {
        provider: process.env.UPI_VERIFICATION_PROVIDER || 'sandbox',
        cashfree: {
            appId: process.env.CASHFREE_APP_ID || '',
            secretKey: process.env.CASHFREE_SECRET_KEY || '',
            env: process.env.CASHFREE_ENV || 'TEST',
        },
    },
};
