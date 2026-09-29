import test from 'node:test';
import assert from 'node:assert/strict';
import { LicenseService } from './license/index.js';
import { getLicenseState } from './license/state.js';
import { DEFAULT_PLAN_MODULES } from '@invenaro/shared';

test('LOCAL-BASIC-01: Local Basic mode activates ONLY when development and LOCAL_BASIC_MODE=true', async () => {
  const origMode = process.env.LOCAL_BASIC_MODE;
  const origNodeEnv = process.env.NODE_ENV;
  const origVercel = process.env.VERCEL;

  try {
    process.env.LOCAL_BASIC_MODE = 'true';
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL;

    assert.equal(LicenseService.isLocalBasic(), true, 'Should report isLocalBasic() as true in dev');

    const entitlements = await LicenseService.getEntitlements();
    assert.equal(entitlements.plan, 'basic');
    assert.equal(entitlements.state.state, 'active');
    assert.deepEqual(entitlements.modules, DEFAULT_PLAN_MODULES.basic);

    const status = await LicenseService.getStatus();
    assert.equal(status.plan, 'basic');
    assert.equal(status.state, 'active');
    assert.deepEqual(status.modules, DEFAULT_PLAN_MODULES.basic);

    // Verify all business/enterprise modules are locked
    assert.equal(await LicenseService.hasModule('multi_godown'), false);
    assert.equal(await LicenseService.hasModule('transfers'), false);
    assert.equal(await LicenseService.hasModule('invoices_returns'), false);
    assert.equal(await LicenseService.hasModule('payments_dues'), false);
    assert.equal(await LicenseService.hasModule('stock_control'), false);
    assert.equal(await LicenseService.hasModule('gst'), false);
    assert.equal(await LicenseService.hasModule('ledger_ui'), false);
    assert.equal(await LicenseService.hasModule('reports_advanced'), false);
    assert.equal(await LicenseService.hasModule('import_export'), false);
    assert.equal(await LicenseService.hasModule('batch_expiry'), false);
    assert.equal(await LicenseService.hasModule('barcode'), false);
    assert.equal(await LicenseService.hasModule('ai_data_assistant'), false);
    assert.equal(await LicenseService.hasModule('ai_knowledge_assistant'), false);
  } finally {
    process.env.LOCAL_BASIC_MODE = origMode;
    process.env.NODE_ENV = origNodeEnv;
    if (origVercel !== undefined) process.env.VERCEL = origVercel;
    else delete process.env.VERCEL;
  }
});

test('LOCAL-BASIC-02: Local Basic mode is strictly ignored in production and on Vercel', async () => {
  const origMode = process.env.LOCAL_BASIC_MODE;
  const origNodeEnv = process.env.NODE_ENV;
  const origVercel = process.env.VERCEL;

  try {
    // 1. In production
    process.env.LOCAL_BASIC_MODE = 'true';
    process.env.NODE_ENV = 'production';
    delete process.env.VERCEL;

    assert.equal(LicenseService.isLocalBasic(), false, 'Must NOT activate when NODE_ENV is production');
    const prodState = getLicenseState({ claims: null, nodeEnv: 'production' });
    assert.equal(prodState.state, 'unlicensed', 'Production must remain unlicensed without valid token');

    // 2. On Vercel
    process.env.NODE_ENV = 'development';
    process.env.VERCEL = '1';
    assert.equal(LicenseService.isLocalBasic(), false, 'Must NOT activate when process.env.VERCEL is set');
  } finally {
    process.env.LOCAL_BASIC_MODE = origMode;
    process.env.NODE_ENV = origNodeEnv;
    if (origVercel !== undefined) process.env.VERCEL = origVercel;
    else delete process.env.VERCEL;
  }
});
