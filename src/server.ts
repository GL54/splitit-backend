import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import os from 'os';
import { config } from './config';
import { errorHandler } from './middleware/error';
import { authRouter } from './modules/auth/auth.router';
import { upiRouter } from './modules/upi/upi.router';
import { billsRouter } from './modules/bills/bills.router';

import { renderBillSplitPage } from './modules/bills/bills.web';
import { BillsService } from './modules/bills/bills.service';

/** First non-internal IPv4, preferring a typical home Wi-Fi address. */
export function lanIPv4(): string | null {
  const found: string[] = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      const family = addr.family as string | number;
      const isV4 = family === 'IPv4' || family === 4;
      if (!isV4 || addr.internal) continue;
      if (addr.address.startsWith('169.254.')) continue;
      found.push(addr.address);
    }
  }
  return (
    found.find((a) => a.startsWith('192.168.')) ||
    found.find((a) => a.startsWith('10.')) ||
    found.find((a) => a.startsWith('172.')) ||
    found[0] ||
    null
  );
}

export function publicWebBaseUrl(): string {
  const lan = lanIPv4();
  return lan ? `http://${lan}:${config.port}` : `http://localhost:${config.port}`;
}

const app = express();

// Security & Parsing Middleware (disable CSP so inline scripts and fonts work on participant SSR page)
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Request logging in development
if (config.nodeEnv !== 'production') {
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
    auth0Configured: Boolean(config.auth0.domain && config.auth0.audience),
    upiProvider: config.upi.provider,
    webBaseUrl: publicWebBaseUrl(),
  });
});

// Address phones on the same Wi-Fi should use for share links.
app.get('/api/config', (req, res) => {
  const webBaseUrl = publicWebBaseUrl();
  res.json({
    success: true,
    data: {
      webBaseUrl,
      apiBaseUrl: `${webBaseUrl}/api`,
    },
  });
});

// Web Participant Bill Split Page
// Participants open this URL: http://localhost:3000/split/:token?upi=user@okaxis&name=John
app.get('/split/:token', async (req, res, next) => {
  try {
    const token = (req.params.token as string).toUpperCase();
    const queryUpi = (req.query.upi as string) || '';
    const queryName = (req.query.name as string) || '';

    const bill = await BillsService.getBillByToken(token);
    if (!bill) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Bill Not Found — SplitIt</title>
          <style>
            body { background: #0a0a0a; color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
            .card { background: #141414; border: 1px solid #2a2a2a; border-radius: 16px; padding: 40px 24px; max-width: 400px; }
            h2 { font-size: 20px; margin-bottom: 8px; }
            p { color: #888; font-size: 14px; margin: 0 0 16px; }
            .tag { display: inline-block; background: #222; color: #aaa; font-family: monospace; padding: 6px 12px; border-radius: 6px; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Bill Not Found</h2>
            <p>The link might be invalid, or the bill has expired.</p>
            <span class="tag">TOKEN: ${token}</span>
          </div>
        </body>
        </html>
      `);
    }

    const html = renderBillSplitPage(bill, queryUpi, queryName);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/upi', upiRouter);
app.use('/api/bills', billsRouter);

// Centralized error handling
app.use(errorHandler);

const PORT = config.port;
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================`);
    console.log(`  SplitIt Backend API`);
    console.log(`  Running on http://0.0.0.0:${PORT}`);
    console.log(`  Auth0 Mode: ${config.auth0.domain ? 'Production (JWKS)' : 'Development (JWT/Dev Token)'}`);
    console.log(`  UPI Provider: ${config.upi.provider}`);
    console.log(`  Share links:  ${publicWebBaseUrl()}/split/<token>`);
    console.log(`========================================`);
  });
}

export default app;
