import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import authRouter from './routes/auth.js';
import entitlementsRouter from './routes/entitlements.js';
import licenseRouter from './routes/license.js';
import cronRouter from './routes/cron.js';
import godownsRouter from './routes/godowns.js';
import productsRouter from './routes/products.js';
import customersRouter from './routes/customers.js';
import suppliersRouter from './routes/suppliers.js';
import salesOrdersRouter from './routes/salesOrders.js';
import purchaseOrdersRouter from './routes/purchaseOrders.js';
import transfersRouter from './routes/transfers.js';
import adjustmentsRouter from './routes/adjustments.js';
import ledgerRouter from './routes/ledger.js';
import invoicesRouter from './routes/invoices.js';
import reportsRouter from './routes/reports.js';
import settingsRouter from './routes/settings.js';

import { enforceLicenseState } from './middlewares/entitlements.js';

export const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));

// Health check endpoint
app.get(['/health', '/api/health', '/api/v1/health'], (req, res) => {
  res.json({ status: 'ok', platform: 'Invenaro', timestamp: new Date().toISOString() });
});

// Enforce operational license state globally (blocks mutations when read_only or unlicensed)
app.use(enforceLicenseState);

// Mount routes on both /api/v1 and /api to support seamless local & Vercel deployment
const mountRoutes = (prefix: string) => {
  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/entitlements`, entitlementsRouter);
  app.use(`${prefix}/license`, licenseRouter);
  app.use(`${prefix}/cron`, cronRouter);
  app.use(`${prefix}/godowns`, godownsRouter);
  app.use(`${prefix}/products`, productsRouter);
  app.use(`${prefix}/customers`, customersRouter);
  app.use(`${prefix}/suppliers`, suppliersRouter);
  app.use(`${prefix}/sales-orders`, salesOrdersRouter);
  app.use(`${prefix}/purchase-orders`, purchaseOrdersRouter);
  app.use(`${prefix}/transfers`, transfersRouter);
  app.use(`${prefix}/adjustments`, adjustmentsRouter);
  app.use(`${prefix}/ledger`, ledgerRouter);
  app.use(`${prefix}/invoices`, invoicesRouter);
  app.use(`${prefix}/reports`, reportsRouter);
  app.use(`${prefix}/settings`, settingsRouter);
};

mountRoutes('/api/v1');
mountRoutes('/api');

// Centralized error handler - prevents leaking stack traces in API responses
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  const statusCode =
    typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600
      ? err.statusCode
      : 500;

  res.status(statusCode).json({
    error: err.code || err.name || 'internal_server_error',
    message: err.message || 'An unexpected error occurred.',
  });
});

export default app;
