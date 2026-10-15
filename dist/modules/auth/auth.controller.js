"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devTokenHandler = exports.getMeHandler = exports.createGuestHandler = exports.syncUserHandler = void 0;
const auth_service_1 = require("./auth.service");
const auth0_1 = require("../../middleware/auth0");
const syncUserHandler = async (req, res, next) => {
    try {
        const { auth0Id, name, email, picture } = req.body;
        const sub = req.user?.auth0Id || auth0Id;
        if (!sub) {
            return res.status(400).json({ success: false, error: 'auth0Id or valid token is required' });
        }
        const user = await auth_service_1.AuthService.syncAuth0User({
            auth0Id: sub,
            name: req.user?.name || name,
            email: req.user?.email || email,
            picture,
        });
        res.json({ success: true, data: user });
    }
    catch (err) {
        next(err);
    }
};
exports.syncUserHandler = syncUserHandler;
const createGuestHandler = async (req, res, next) => {
    try {
        const { name } = req.body;
        const guest = await auth_service_1.AuthService.createGuestUser(name || 'Guest');
        res.json({ success: true, data: guest });
    }
    catch (err) {
        next(err);
    }
};
exports.createGuestHandler = createGuestHandler;
const getMeHandler = async (req, res, next) => {
    try {
        if (!req.user?.id && !req.user?.auth0Id) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        let user = null;
        if (req.user.id) {
            user = await auth_service_1.AuthService.getUserProfile(req.user.id);
        }
        else if (req.user.auth0Id) {
            user = await auth_service_1.AuthService.syncAuth0User({
                auth0Id: req.user.auth0Id,
                name: req.user.name,
                email: req.user.email,
            });
        }
        res.json({ success: true, data: user });
    }
    catch (err) {
        next(err);
    }
};
exports.getMeHandler = getMeHandler;
const devTokenHandler = async (req, res) => {
    const { id = 'dev-user-1', name = 'Dev User', email = 'dev@splitit.app' } = req.body;
    const token = (0, auth0_1.generateDevToken)({ id, name, email });
    res.json({ success: true, token });
};
exports.devTokenHandler = devTokenHandler;
