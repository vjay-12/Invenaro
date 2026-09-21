import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import authRouter from './routes/auth.js';
import entitlementsRouter from './routes/entitlements.js';
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

// Mount routes on both /api/v1 and /api to support seamless local & Vercel deployment
const mountRoutes = (prefix: string) => {
  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/entitlements`, entitlementsRouter);
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

export default app;
