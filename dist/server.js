"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const config_1 = require("./config");
const error_1 = require("./middleware/error");
const auth_router_1 = require("./modules/auth/auth.router");
const upi_router_1 = require("./modules/upi/upi.router");
const bills_router_1 = require("./modules/bills/bills.router");
const app = (0, express_1.default)();
// Security & Parsing Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Request logging in development
if (config_1.config.nodeEnv !== 'production') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
        next();
    });
}
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'splitit-backend',
        version: '1.0.0',
        auth0Configured: Boolean(config_1.config.auth0.domain && config_1.config.auth0.audience),
        upiProvider: config_1.config.upi.provider,
    });
});
// API Routes
app.use('/api/auth', auth_router_1.authRouter);
app.use('/api/upi', upi_router_1.upiRouter);
app.use('/api/bills', bills_router_1.billsRouter);
// Centralized error handling
app.use(error_1.errorHandler);
const PORT = config_1.config.port;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================`);
    console.log(`  SplitIt Backend API`);
    console.log(`  Running on http://0.0.0.0:${PORT}`);
    console.log(`  Auth0 Mode: ${config_1.config.auth0.domain ? 'Production (JWKS)' : 'Development (JWT/Dev Token)'}`);
    console.log(`  UPI Provider: ${config_1.config.upi.provider}`);
    console.log(`========================================`);
});
exports.default = app;
