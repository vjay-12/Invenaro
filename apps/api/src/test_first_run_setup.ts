import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import { setupSchema, createUserSchema, loginSchema } from '@invenaro/validation';
import { LicenseClaimsSchema, DEFAULT_PLAN_MODULES } from '@invenaro/shared';
import { generateTemporaryPassword } from './utils/password.js';
import { authMiddleware } from './middlewares/auth.js';
import { LicenseService } from './services/license.js';
import authRouter from './routes/auth.js';
import settingsRouter from './routes/settings.js';
import { prisma } from './db.js';

function createMockReqRes(options: {
  method?: string;
  path?: string;
  originalUrl?: string;
  baseUrl?: string;
  body?: any;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  user?: any;
}) {
  const req: any = {
    method: options.method || 'GET',
    path: options.path || '/',
    originalUrl: options.originalUrl || options.path || '/',
    baseUrl: options.baseUrl || '',
    body: options.body || {},
    headers: options.headers || {},
    cookies: options.cookies || {},
    user: options.user,
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
  };

  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    cookies: {} as Record<string, any>,
    data: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.data = data;
      return this;
    },
    cookie(name: string, value: string, opts: any) {
      this.cookies[name] = { value, options: opts };
      return this;
    },
    clearCookie(name: string) {
      delete this.cookies[name];
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
  };

  return { req, res };
}

function getRouteHandler(router: any, routePath: string, method: string) {
  const layer = router.stack.find(
    (l: any) => l.route?.path === routePath && l.route?.methods?.[method.toLowerCase()]
  );
  if (!layer) {
    throw new Error(`Route handler not found for ${method.toUpperCase()} ${routePath}`);
  }
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

// =========================================================================
// SETUP TESTS (1 - 12)
// =========================================================================

test('SETUP-01: Zero users -> setup-status says needsSetup=true', async () => {
  const setupStatusHandler = getRouteHandler(authRouter, '/setup-status', 'GET');
  const { req, res } = createMockReqRes({ method: 'GET', path: '/setup-status' });

  // Mock zero users in DB
  const origCount = prisma.user.count;
  const origEntitlements = LicenseService.getEntitlements;
  const origAdminEmail = LicenseService.getVerifiedAdminEmail;

  (prisma.user as any).count = async () => 0;
  LicenseService.getEntitlements = async () => ({ state: { state: 'active' } }) as any;
  LicenseService.getVerifiedAdminEmail = async () => 'admin@customer.com';

  try {
    await setupStatusHandler(req, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.data, { needsSetup: true });
  } finally {
    prisma.user.count = origCount;
    LicenseService.getEntitlements = origEntitlements;
    LicenseService.getVerifiedAdminEmail = origAdminEmail;
  }
});

test('SETUP-02: Existing user -> setup-status says needsSetup=false', async () => {
  const setupStatusHandler = getRouteHandler(authRouter, '/setup-status', 'GET');
  const { req, res } = createMockReqRes({ method: 'GET', path: '/setup-status' });

  // Mock 1 user in DB
  const origCount = prisma.user.count;
  (prisma.user as any).count = async () => 1;

  try {
    await setupStatusHandler(req, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.data, { needsSetup: false });
  } finally {
    prisma.user.count = origCount;
  }
});

test('SETUP-03: Correct licensed admin email -> first OWNER created', async () => {
  const setupHandler = getRouteHandler(authRouter, '/setup', 'POST');
  const { req, res } = createMockReqRes({
    method: 'POST',
    path: '/setup',
    body: {
      name: 'Jane Customer',
      email: 'admin@customer.com',
      password: 'StrongAdminPassword123!',
      confirmPassword: 'StrongAdminPassword123!',
    },
  });

  const origCount = prisma.user.count;
  const origEntitlements = LicenseService.getEntitlements;
  const origAdminEmail = LicenseService.getVerifiedAdminEmail;
  const origTransaction = prisma.$transaction;

  let createdUserData: any = null;

  (prisma.user as any).count = async () => 0;
  LicenseService.getEntitlements = async () => ({ state: { state: 'active' } }) as any;
  LicenseService.getVerifiedAdminEmail = async () => 'admin@customer.com';

  (prisma as any).$transaction = async (cb: any) => {
    const mockTx: any = {
      user: {
        count: async () => 0,
        create: async (args: any) => {
          createdUserData = args.data;
          return {
            id: 'usr-owner-1',
            ...args.data,
            created_at: new Date(),
          };
        },
      },
      godown: {
        findFirst: async () => ({ id: 'gdn-1', name: 'Main Godown' }),
        create: async (args: any) => ({ id: 'gdn-1', ...args.data }),
      },
      session: {
        create: async (args: any) => ({ id: 'sess-1', ...args.data }),
      },
    };
    return cb(mockTx);
  };

  try {
    await setupHandler(req, res);
    assert.equal(res.statusCode, 201);
    assert.ok(createdUserData, 'User record must be created');
    assert.equal(createdUserData.role, 'OWNER');
    assert.equal(createdUserData.email, 'admin@customer.com');
    assert.equal(createdUserData.must_change_password, false);
  } finally {
    prisma.user.count = origCount;
    LicenseService.getEntitlements = origEntitlements;
    LicenseService.getVerifiedAdminEmail = origAdminEmail;
    prisma.$transaction = origTransaction;
  }
});

test('SETUP-04: Incorrect email -> setup rejected (403)', async () => {
  const setupHandler = getRouteHandler(authRouter, '/setup', 'POST');
  const { req, res } = createMockReqRes({
    method: 'POST',
    path: '/setup',
    body: {
      name: 'Jane Customer',
      email: 'wrong-email@gmail.com',
      password: 'StrongAdminPassword123!',
      confirmPassword: 'StrongAdminPassword123!',
    },
  });

  const origEntitlements = LicenseService.getEntitlements;
  const origAdminEmail = LicenseService.getVerifiedAdminEmail;
  const origTransaction = prisma.$transaction;

  let txCalled = false;
  LicenseService.getEntitlements = async () => ({ state: { state: 'active' } }) as any;
  LicenseService.getVerifiedAdminEmail = async () => 'admin@customer.com';
  (prisma as any).$transaction = async () => {
    txCalled = true;
  };

  try {
    await setupHandler(req, res);
    assert.equal(res.statusCode, 403);
    assert.equal(txCalled, false, 'Database transaction must not be executed on email mismatch');
    assert.equal(
      res.data.error,
      'The email address does not match the administrator email assigned to this deployment.'
    );
    assert.equal(res.data.error.includes('admin@customer.com'), false, 'Must not reveal licensed admin email');
  } finally {
    LicenseService.getEntitlements = origEntitlements;
    LicenseService.getVerifiedAdminEmail = origAdminEmail;
    prisma.$transaction = origTransaction;
  }
});

test('SETUP-05: Email comparison is case-insensitive', async () => {
  const setupHandler = getRouteHandler(authRouter, '/setup', 'POST');
  const { req, res } = createMockReqRes({
    method: 'POST',
    path: '/setup',
    body: {
      name: 'Jane Customer',
      email: 'Admin@Customer.COM', // Mixed uppercase
      password: 'StrongAdminPassword123!',
      confirmPassword: 'StrongAdminPassword123!',
    },
  });

  const origEntitlements = LicenseService.getEntitlements;
  const origAdminEmail = LicenseService.getVerifiedAdminEmail;
  const origTransaction = prisma.$transaction;

  let createdEmail = '';
  LicenseService.getEntitlements = async () => ({ state: { state: 'active' } }) as any;
  LicenseService.getVerifiedAdminEmail = async () => 'admin@customer.com';

  (prisma as any).$transaction = async (cb: any) => {
    const mockTx: any = {
      user: {
        count: async () => 0,
        create: async (args: any) => {
          createdEmail = args.data.email;
          return { id: 'usr-1', ...args.data };
        },
      },
      godown: {
        findFirst: async () => ({ id: 'gdn-1' }),
      },
      session: {
        create: async (args: any) => ({ id: 'sess-1', ...args.data }),
      },
    };
    return cb(mockTx);
  };

  try {
    await setupHandler(req, res);
    assert.equal(res.statusCode, 201, 'Case-insensitive comparison must succeed');
    assert.equal(createdEmail, 'admin@customer.com', 'Stored email must be trimmed and lowercased');
  } finally {
    LicenseService.getEntitlements = origEntitlements;
    LicenseService.getVerifiedAdminEmail = origAdminEmail;
    prisma.$transaction = origTransaction;
  }
});

test('SETUP-06: First user has role OWNER', async () => {
  const setupHandler = getRouteHandler(authRouter, '/setup', 'POST');
  const { req, res } = createMockReqRes({
    method: 'POST',
    path: '/setup',
    body: {
      name: 'Owner User',
      email: 'admin@customer.com',
      password: 'StrongAdminPassword123!',
      confirmPassword: 'StrongAdminPassword123!',
    },
  });

  const origEntitlements = LicenseService.getEntitlements;
  const origAdminEmail = LicenseService.getVerifiedAdminEmail;
  const origTransaction = prisma.$transaction;

  let userRole = '';
  LicenseService.getEntitlements = async () => ({ state: { state: 'active' } }) as any;
  LicenseService.getVerifiedAdminEmail = async () => 'admin@customer.com';

  (prisma as any).$transaction = async (cb: any) => {
    const mockTx: any = {
      user: {
        count: async () => 0,
        create: async (args: any) => {
          userRole = args.data.role;
          return { id: 'usr-1', ...args.data };
        },
      },
      godown: { findFirst: async () => ({ id: 'gdn-1' }) },
      session: { create: async (args: any) => ({ id: 'sess-1', ...args.data }) },
    };
    return cb(mockTx);
  };

  try {
    await setupHandler(req, res);
    assert.equal(userRole, 'OWNER');
    assert.equal(res.data.user.role, 'OWNER');
  } finally {
    LicenseService.getEntitlements = origEntitlements;
    LicenseService.getVerifiedAdminEmail = origAdminEmail;
    prisma.$transaction = origTransaction;
  }
});

test('SETUP-07: First user has mustChangePassword=false', async () => {
  const setupHandler = getRouteHandler(authRouter, '/setup', 'POST');
  const { req, res } = createMockReqRes({
    method: 'POST',
    path: '/setup',
    body: {
      name: 'Owner User',
      email: 'admin@customer.com',
      password: 'StrongAdminPassword123!',
      confirmPassword: 'StrongAdminPassword123!',
    },
  });

  const origEntitlements = LicenseService.getEntitlements;
  const origAdminEmail = LicenseService.getVerifiedAdminEmail;
  const origTransaction = prisma.$transaction;

  let mustChangePasswordVal: any = null;
  LicenseService.getEntitlements = async () => ({ state: { state: 'active' } }) as any;
  LicenseService.getVerifiedAdminEmail = async () => 'admin@customer.com';

  (prisma as any).$transaction = async (cb: any) => {
    const mockTx: any = {
      user: {
        count: async () => 0,
        create: async (args: any) => {
          mustChangePasswordVal = args.data.must_change_password;
          return { id: 'usr-1', ...args.data };
        },
      },
      godown: { findFirst: async () => ({ id: 'gdn-1' }) },
      session: { create: async (args: any) => ({ id: 'sess-1', ...args.data }) },
    };
    return cb(mockTx);
  };

  try {
    await setupHandler(req, res);
    assert.equal(mustChangePasswordVal, false, 'First OWNER must have must_change_password=false');
    assert.equal(res.data.user.must_change_password, false);
  } finally {
    LicenseService.getEntitlements = origEntitlements;
    LicenseService.getVerifiedAdminEmail = origAdminEmail;
    prisma.$transaction = origTransaction;
  }
});

test('SETUP-08: Successful setup logs the user in (sets cookie & returns token)', async () => {
  const setupHandler = getRouteHandler(authRouter, '/setup', 'POST');
  const { req, res } = createMockReqRes({
    method: 'POST',
    path: '/setup',
    body: {
      name: 'Owner User',
      email: 'admin@customer.com',
      password: 'StrongAdminPassword123!',
      confirmPassword: 'StrongAdminPassword123!',
    },
  });

  const origEntitlements = LicenseService.getEntitlements;
  const origAdminEmail = LicenseService.getVerifiedAdminEmail;
  const origTransaction = prisma.$transaction;

  LicenseService.getEntitlements = async () => ({ state: { state: 'active' } }) as any;
  LicenseService.getVerifiedAdminEmail = async () => 'admin@customer.com';

  (prisma as any).$transaction = async (cb: any) => {
    const mockTx: any = {
      user: { count: async () => 0, create: async (args: any) => ({ id: 'usr-1', ...args.data }) },
      godown: { findFirst: async () => ({ id: 'gdn-1' }) },
      session: { create: async (args: any) => ({ id: 'sess-1', ...args.data }) },
    };
    return cb(mockTx);
  };

  try {
    await setupHandler(req, res);
    assert.ok(res.cookies['invenaro_session'], 'invenaro_session cookie must be set');
    assert.equal(res.cookies['invenaro_session'].options.httpOnly, true);
    assert.ok(res.data.user, 'Response must include user object');
    assert.equal(res.data.user.email, 'admin@customer.com');
  } finally {
    LicenseService.getEntitlements = origEntitlements;
    LicenseService.getVerifiedAdminEmail = origAdminEmail;
    prisma.$transaction = origTransaction;
  }
});

test('SETUP-09: Second setup attempt returns 409 Conflict', async () => {
  const setupHandler = getRouteHandler(authRouter, '/setup', 'POST');
  const { req, res } = createMockReqRes({
    method: 'POST',
    path: '/setup',
    body: {
      name: 'Second Attempt User',
      email: 'admin@customer.com',
      password: 'StrongAdminPassword123!',
      confirmPassword: 'StrongAdminPassword123!',
    },
  });

  const origEntitlements = LicenseService.getEntitlements;
  const origAdminEmail = LicenseService.getVerifiedAdminEmail;
  const origTransaction = prisma.$transaction;

  LicenseService.getEntitlements = async () => ({ state: { state: 'active' } }) as any;
  LicenseService.getVerifiedAdminEmail = async () => 'admin@customer.com';

  // Inside transaction, tx.user.count() returns 1 (user already exists)
  (prisma as any).$transaction = async (cb: any) => {
    const mockTx: any = {
      user: {
        count: async () => 1,
      },
    };
    return cb(mockTx);
  };

  try {
    await setupHandler(req, res);
    assert.equal(res.statusCode, 409, 'Setup must return 409 Conflict when users exist');
  } finally {
    LicenseService.getEntitlements = origEntitlements;
    LicenseService.getVerifiedAdminEmail = origAdminEmail;
    prisma.$transaction = origTransaction;
  }
});

test('SETUP-10: Second setup attempt creates nothing', async () => {
  const setupHandler = getRouteHandler(authRouter, '/setup', 'POST');
  const { req, res } = createMockReqRes({
    method: 'POST',
    path: '/setup',
    body: {
      name: 'Second Attempt User',
      email: 'admin@customer.com',
      password: 'StrongAdminPassword123!',
      confirmPassword: 'StrongAdminPassword123!',
    },
  });

  const origEntitlements = LicenseService.getEntitlements;
  const origAdminEmail = LicenseService.getVerifiedAdminEmail;
  const origTransaction = prisma.$transaction;

  let createCalled = false;
  LicenseService.getEntitlements = async () => ({ state: { state: 'active' } }) as any;
  LicenseService.getVerifiedAdminEmail = async () => 'admin@customer.com';

  (prisma as any).$transaction = async (cb: any) => {
    const mockTx: any = {
      user: {
        count: async () => 1,
        create: async () => {
          createCalled = true;
        },
      },
    };
    return cb(mockTx);
  };

  try {
    await setupHandler(req, res);
    assert.equal(res.statusCode, 409);
    assert.equal(createCalled, false, 'No user should be created on second setup attempt');
  } finally {
    LicenseService.getEntitlements = origEntitlements;
    LicenseService.getVerifiedAdminEmail = origAdminEmail;
    prisma.$transaction = origTransaction;
  }
});

test('SETUP-11: Two setup requests cannot create multiple first users (Race condition simulation)', async () => {
  const setupHandler = getRouteHandler(authRouter, '/setup', 'POST');

  const origEntitlements = LicenseService.getEntitlements;
  const origAdminEmail = LicenseService.getVerifiedAdminEmail;
  const origTransaction = prisma.$transaction;

  LicenseService.getEntitlements = async () => ({ state: { state: 'active' } }) as any;
  LicenseService.getVerifiedAdminEmail = async () => 'admin@customer.com';

  let totalUsersInDb = 0;

  // Simulate transactional serialization
  (prisma as any).$transaction = async (cb: any) => {
    const mockTx: any = {
      user: {
        count: async () => totalUsersInDb,
        create: async (args: any) => {
          totalUsersInDb++;
          return { id: `usr-${totalUsersInDb}`, ...args.data };
        },
      },
      godown: { findFirst: async () => ({ id: 'gdn-1' }) },
      session: { create: async (args: any) => ({ id: 'sess-1', ...args.data }) },
    };
    return cb(mockTx);
  };

  try {
    const { req: req1, res: res1 } = createMockReqRes({
      method: 'POST',
      path: '/setup',
      body: {
        name: 'User One',
        email: 'admin@customer.com',
        password: 'StrongAdminPassword123!',
        confirmPassword: 'StrongAdminPassword123!',
      },
    });

    const { req: req2, res: res2 } = createMockReqRes({
      method: 'POST',
      path: '/setup',
      body: {
        name: 'User Two',
        email: 'admin@customer.com',
        password: 'StrongAdminPassword123!',
        confirmPassword: 'StrongAdminPassword123!',
      },
    });

    // Request 1 executes and commits
    await setupHandler(req1, res1);
    assert.equal(res1.statusCode, 201, 'First request creates user');

    // Request 2 executes in transaction and sees totalUsersInDb === 1
    await setupHandler(req2, res2);
    assert.equal(res2.statusCode, 409, 'Second request must abort with 409 Conflict');
    assert.equal(totalUsersInDb, 1, 'Exactly one user must exist in DB');
  } finally {
    LicenseService.getEntitlements = origEntitlements;
    LicenseService.getVerifiedAdminEmail = origAdminEmail;
    prisma.$transaction = origTransaction;
  }
});

test('SETUP-12: License without adminEmail cannot be used to arbitrarily create an OWNER', async () => {
  const setupHandler = getRouteHandler(authRouter, '/setup', 'POST');
  const { req, res } = createMockReqRes({
    method: 'POST',
    path: '/setup',
    body: {
      name: 'Hacker User',
      email: 'hacker@arbitrary.com',
      password: 'StrongAdminPassword123!',
      confirmPassword: 'StrongAdminPassword123!',
    },
  });

  const origEntitlements = LicenseService.getEntitlements;
  const origAdminEmail = LicenseService.getVerifiedAdminEmail;

  // License has valid status, but NO adminEmail claim
  LicenseService.getEntitlements = async () => ({ state: { state: 'active' } }) as any;
  LicenseService.getVerifiedAdminEmail = async () => null;

  try {
    await setupHandler(req, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.data.error, /Deployment does not have a valid license with an assigned administrator email/);
  } finally {
    LicenseService.getEntitlements = origEntitlements;
    LicenseService.getVerifiedAdminEmail = origAdminEmail;
  }
});

// =========================================================================
// USER CREATION TESTS (13 - 22)
// =========================================================================

test('USER-13: STAFF receives 403 from POST /settings/users', async () => {
  const createUserHandler = getRouteHandler(settingsRouter, '/users', 'POST');
  const { req, res } = createMockReqRes({
    method: 'POST',
    path: '/users',
    user: { id: 'usr-staff', role: 'STAFF', email: 'staff@example.com' },
    body: {
      name: 'New User',
      email: 'newuser@example.com',
      role: 'STAFF',
    },
  });

  await createUserHandler(req, res);
  assert.equal(res.statusCode, 403);
  assert.match(res.data.error, /Only an OWNER can create users/);
});

test('USER-14: OWNER can create users', async () => {
  const createUserHandler = getRouteHandler(settingsRouter, '/users', 'POST');
  const { req, res } = createMockReqRes({
    method: 'POST',
    path: '/users',
    user: { id: 'usr-owner', role: 'OWNER', email: 'owner@example.com' },
    body: {
      name: 'Bob Warehouse',
      email: 'bob@example.com',
      role: 'STAFF',
    },
  });

  const origFindUnique = prisma.user.findUnique;
  const origCreate = prisma.user.create;

  (prisma.user as any).findUnique = async () => null;
  (prisma.user as any).create = async (args: any) => ({
    id: 'usr-new-1',
    name: args.data.name,
    email: args.data.email,
    role: args.data.role,
    must_change_password: args.data.must_change_password,
    assigned_godown_id: args.data.assigned_godown_id,
    created_at: new Date(),
  });

  try {
    await createUserHandler(req, res);
    assert.equal(res.statusCode, 201);
    assert.equal(res.data.email, 'bob@example.com');
  } finally {
    prisma.user.findUnique = origFindUnique;
    prisma.user.create = origCreate;
  }
});

test('USER-15: Caller cannot supply the user password', async () => {
  const createUserHandler = getRouteHandler(settingsRouter, '/users', 'POST');
  const callerSuppliedPassword = 'AttackerSuppliedPassword123!';

  const { req, res } = createMockReqRes({
    method: 'POST',
    path: '/users',
    user: { id: 'usr-owner', role: 'OWNER', email: 'owner@example.com' },
    body: {
      name: 'Bob Warehouse',
      email: 'bob@example.com',
      password: callerSuppliedPassword, // Attempt to supply password
      role: 'STAFF',
    },
  });

  const origFindUnique = prisma.user.findUnique;
  const origCreate = prisma.user.create;

  let storedHash = '';
  (prisma.user as any).findUnique = async () => null;
  (prisma.user as any).create = async (args: any) => {
    storedHash = args.data.password_hash;
    return { id: 'usr-new-1', ...args.data };
  };

  try {
    await createUserHandler(req, res);
    assert.equal(res.statusCode, 201);
    // Verify caller supplied password does NOT match the stored hash
    const callerPasswordMatches = await bcrypt.compare(callerSuppliedPassword, storedHash);
    assert.equal(callerPasswordMatches, false, 'Caller-supplied password must be ignored');
  } finally {
    prisma.user.findUnique = origFindUnique;
    prisma.user.create = origCreate;
  }
});

test('USER-16: Temporary password is generated server-side', async () => {
  const createUserHandler = getRouteHandler(settingsRouter, '/users', 'POST');
  const { req, res } = createMockReqRes({
    method: 'POST',
    path: '/users',
    user: { id: 'usr-owner', role: 'OWNER', email: 'owner@example.com' },
    body: {
      name: 'Bob Warehouse',
      email: 'bob@example.com',
      role: 'STAFF',
    },
  });

  const origFindUnique = prisma.user.findUnique;
  const origCreate = prisma.user.create;

  let storedHash = '';
  (prisma.user as any).findUnique = async () => null;
  (prisma.user as any).create = async (args: any) => {
    storedHash = args.data.password_hash;
    return { id: 'usr-new-1', ...args.data };
  };

  try {
    await createUserHandler(req, res);
    assert.ok(res.data.temporaryPassword, 'Response must contain temporaryPassword');
    const tempPassMatchesHash = await bcrypt.compare(res.data.temporaryPassword, storedHash);
    assert.equal(tempPassMatchesHash, true, 'Server-generated temporary password must match stored hash');
  } finally {
    prisma.user.findUnique = origFindUnique;
    prisma.user.create = origCreate;
  }
});

test('USER-17: Temporary password is random and high entropy', () => {
  const passwords = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const pwd = generateTemporaryPassword();
    assert.ok(pwd.length >= 10, 'Temporary password must be at least 10 characters');
    passwords.add(pwd);
  }
  assert.equal(passwords.size, 100, 'All generated temporary passwords must be distinct and random');
});

test('USER-18: Created user has mustChangePassword=true', async () => {
  const createUserHandler = getRouteHandler(settingsRouter, '/users', 'POST');
  const { req, res } = createMockReqRes({
    method: 'POST',
    path: '/users',
    user: { id: 'usr-owner', role: 'OWNER', email: 'owner@example.com' },
    body: {
      name: 'Bob Warehouse',
      email: 'bob@example.com',
      role: 'STAFF',
    },
  });

  const origFindUnique = prisma.user.findUnique;
  const origCreate = prisma.user.create;

  let createdMustChange: any = null;
  (prisma.user as any).findUnique = async () => null;
  (prisma.user as any).create = async (args: any) => {
    createdMustChange = args.data.must_change_password;
    return { id: 'usr-new-1', ...args.data };
  };

  try {
    await createUserHandler(req, res);
    assert.equal(createdMustChange, true, 'Created user must have must_change_password=true');
    assert.equal(res.data.must_change_password, true);
  } finally {
    prisma.user.findUnique = origFindUnique;
    prisma.user.create = origCreate;
  }
});

test('USER-19: Temporary password is returned once in creation response', async () => {
  const createUserHandler = getRouteHandler(settingsRouter, '/users', 'POST');
  const { req, res } = createMockReqRes({
    method: 'POST',
    path: '/users',
    user: { id: 'usr-owner', role: 'OWNER', email: 'owner@example.com' },
    body: {
      name: 'Bob Warehouse',
      email: 'bob@example.com',
      role: 'STAFF',
    },
  });

  const origFindUnique = prisma.user.findUnique;
  const origCreate = prisma.user.create;

  (prisma.user as any).findUnique = async () => null;
  (prisma.user as any).create = async (args: any) => ({
    id: 'usr-new-1',
    name: args.data.name,
    email: args.data.email,
    role: args.data.role,
    must_change_password: args.data.must_change_password,
  });

  try {
    await createUserHandler(req, res);
    assert.ok(res.data.temporaryPassword);
    // Check that User model fields never persist plaintext password
    assert.equal('password' in res.data, false, 'Plaintext password must not be stored in user object');
  } finally {
    prisma.user.findUnique = origFindUnique;
    prisma.user.create = origCreate;
  }
});

test('USER-20: New user cannot perform normal authenticated requests before changing password', async () => {
  const { req, res } = createMockReqRes({
    method: 'GET',
    path: '/api/settings',
    originalUrl: '/api/settings',
    cookies: { invenaro_session: 'session-token-xyz' },
  });

  let nextCalled = false;
  const mockNext = () => {
    nextCalled = true;
  };

  const origSessionFindUnique = prisma.session.findUnique;
  (prisma.session as any).findUnique = async () => ({
    id: 'sess-1',
    token_hash: 'session-token-xyz',
    expires_at: new Date(Date.now() + 3600000),
    user: {
      id: 'usr-new',
      email: 'new@example.com',
      name: 'New User',
      role: 'STAFF',
      assigned_godown_id: null,
      must_change_password: true, // Requires change
    },
  });

  try {
    await authMiddleware(req, res, mockNext);
    assert.equal(res.statusCode, 403, 'Must reject with 403 when must_change_password=true');
    assert.equal(res.data.must_change_password, true);
    assert.equal(nextCalled, false, 'Next function must not be invoked');
  } finally {
    prisma.session.findUnique = origSessionFindUnique;
  }
});

test('USER-21: New user can change password while mustChangePassword is true', async () => {
  const { req, res } = createMockReqRes({
    method: 'POST',
    path: '/api/auth/change-password',
    originalUrl: '/api/auth/change-password',
    cookies: { invenaro_session: 'session-token-xyz' },
  });

  let nextCalled = false;
  const mockNext = () => {
    nextCalled = true;
  };

  const origSessionFindUnique = prisma.session.findUnique;
  (prisma.session as any).findUnique = async () => ({
    id: 'sess-1',
    token_hash: 'session-token-xyz',
    expires_at: new Date(Date.now() + 3600000),
    user: {
      id: 'usr-new',
      email: 'new@example.com',
      name: 'New User',
      role: 'STAFF',
      assigned_godown_id: null,
      must_change_password: true,
    },
  });

  try {
    await authMiddleware(req, res, mockNext);
    assert.equal(nextCalled, true, 'Allowed endpoint /change-password must call next()');
    assert.equal(res.statusCode, 200);
  } finally {
    prisma.session.findUnique = origSessionFindUnique;
  }
});

test('USER-22: After changing password, normal access works', async () => {
  const { req, res } = createMockReqRes({
    method: 'GET',
    path: '/api/settings',
    originalUrl: '/api/settings',
    cookies: { invenaro_session: 'session-token-xyz' },
  });

  let nextCalled = false;
  const mockNext = () => {
    nextCalled = true;
  };

  const origSessionFindUnique = prisma.session.findUnique;
  (prisma.session as any).findUnique = async () => ({
    id: 'sess-1',
    token_hash: 'session-token-xyz',
    expires_at: new Date(Date.now() + 3600000),
    user: {
      id: 'usr-new',
      email: 'new@example.com',
      name: 'New User',
      role: 'STAFF',
      assigned_godown_id: null,
      must_change_password: false, // Updated to false
    },
  });

  try {
    await authMiddleware(req, res, mockNext);
    assert.equal(nextCalled, true, 'Normal request must be allowed after password change');
    assert.equal(res.statusCode, 200);
  } finally {
    prisma.session.findUnique = origSessionFindUnique;
  }
});

// =========================================================================
// LOGIN TESTS (23)
// =========================================================================

test('LOGIN-23: Login works regardless of email casing', async () => {
  const loginHandler = getRouteHandler(authRouter, '/login', 'POST');
  const { req, res } = createMockReqRes({
    method: 'POST',
    path: '/login',
    body: {
      email: '  Admin@Customer.COM  ',
      password: 'StrongPassword123!',
    },
  });

  const origLoginAttemptCount = prisma.loginAttempt.count;
  const origUserFindUnique = prisma.user.findUnique;
  const origLoginAttemptCreate = prisma.loginAttempt.create;
  const origSessionCreate = prisma.session.create;

  let queriedEmail = '';
  (prisma.loginAttempt as any).count = async () => 0;
  (prisma.loginAttempt as any).create = async () => ({} as any);
  (prisma.session as any).create = async () => ({} as any);

  const hash = await bcrypt.hash('StrongPassword123!', 10);
  (prisma.user as any).findUnique = async (args: any) => {
    queriedEmail = args.where.email;
    return {
      id: 'usr-1',
      name: 'Admin',
      email: 'admin@customer.com',
      password_hash: hash,
      role: 'OWNER',
      assigned_godown_id: null,
      must_change_password: false,
    };
  };

  try {
    await loginHandler(req, res);
    assert.equal(queriedEmail, 'admin@customer.com', 'Login query must use normalized lowercase email');
    assert.equal(res.statusCode, 200);
  } finally {
    prisma.loginAttempt.count = origLoginAttemptCount;
    prisma.user.findUnique = origUserFindUnique;
    prisma.loginAttempt.create = origLoginAttemptCreate;
    prisma.session.create = origSessionCreate;
  }
});

// =========================================================================
// SECURITY TESTS (24 - 26)
// =========================================================================

test('SECURITY-24: Never log passwords or temporary passwords', () => {
  const authRoutesContent = fs.readFileSync(path.resolve('apps/api/src/routes/auth.ts'), 'utf-8');
  const settingsRoutesContent = fs.readFileSync(path.resolve('apps/api/src/routes/settings.ts'), 'utf-8');

  // Verify server endpoints never log passwords, temporary passwords, or password hashes
  assert.equal(
    /console\.(log|info|warn|error)\([^)]*\$\{(password|tempPassword|newPassword|currentPassword|temporaryPassword)\}/i.test(
      authRoutesContent
    ),
    false,
    'auth.ts must not interpolate password variables in logs'
  );
  assert.equal(
    /console\.(log|info|warn|error)\([^)]*,\s*(password|tempPassword|newPassword|currentPassword|temporaryPassword)\b/i.test(
      authRoutesContent
    ),
    false,
    'auth.ts must not pass password variables to loggers'
  );
  assert.equal(
    /console\.(log|info|warn|error)\([^)]*\b(tempPassword|temporaryPassword|password_hash)\b/i.test(
      settingsRoutesContent
    ),
    false,
    'settings.ts must not log tempPassword or password_hash'
  );
});

test('SECURITY-25: Never expose the licensed admin email unnecessarily', async () => {
  // 1. GET /setup-status must never include adminEmail
  const setupStatusHandler = getRouteHandler(authRouter, '/setup-status', 'GET');
  const { req: req1, res: res1 } = createMockReqRes({ method: 'GET', path: '/setup-status' });

  const origCount = prisma.user.count;
  const origEntitlements = LicenseService.getEntitlements;
  const origAdminEmail = LicenseService.getVerifiedAdminEmail;

  (prisma.user as any).count = async () => 0;
  LicenseService.getEntitlements = async () => ({ state: { state: 'active' } }) as any;
  LicenseService.getVerifiedAdminEmail = async () => 'secret-licensed-email@company.com';

  try {
    await setupStatusHandler(req1, res1);
    assert.equal('adminEmail' in res1.data, false, 'setup-status must not leak adminEmail');
    assert.equal('email' in res1.data, false, 'setup-status must not leak email');
  } finally {
    prisma.user.count = origCount;
    LicenseService.getEntitlements = origEntitlements;
    LicenseService.getVerifiedAdminEmail = origAdminEmail;
  }

  // 2. Setup error response on mismatch must not leak licensed email
  const setupHandler = getRouteHandler(authRouter, '/setup', 'POST');
  const { req: req2, res: res2 } = createMockReqRes({
    method: 'POST',
    path: '/setup',
    body: {
      name: 'Alice',
      email: 'attacker@evil.com',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
    },
  });

  LicenseService.getEntitlements = async () => ({ state: { state: 'active' } }) as any;
  LicenseService.getVerifiedAdminEmail = async () => 'secret-admin@company.com';

  try {
    await setupHandler(req2, res2);
    assert.equal(res2.statusCode, 403);
    assert.equal(JSON.stringify(res2.data).includes('secret-admin@company.com'), false);
  } finally {
    LicenseService.getEntitlements = origEntitlements;
    LicenseService.getVerifiedAdminEmail = origAdminEmail;
  }
});

test('SECURITY-26: Never trust client-provided role for authorization', async () => {
  const createUserHandler = getRouteHandler(settingsRouter, '/users', 'POST');

  // Client attempts privilege escalation by providing { role: 'OWNER' } in body while authenticated as STAFF
  const { req, res } = createMockReqRes({
    method: 'POST',
    path: '/users',
    user: { id: 'usr-staff', role: 'STAFF', email: 'staff@example.com' },
    body: {
      name: 'New Admin',
      email: 'newadmin@example.com',
      role: 'OWNER',
    },
  });

  await createUserHandler(req, res);
  assert.equal(res.statusCode, 403, 'Must reject non-OWNER even if body specifies OWNER');
});
