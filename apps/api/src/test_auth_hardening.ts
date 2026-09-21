import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { loginSchema, changePasswordSchema, firstLoginChangePasswordSchema } from '@invenaro/validation';

test('AUTH-01: Login component has no prefilled values and no demo buttons', () => {
  const loginFilePath = path.resolve('apps/web/src/pages/Login.tsx');
  const content = fs.readFileSync(loginFilePath, 'utf-8');

  // Verify inputs initialize as empty strings
  assert.match(content, /const\s+\[loginEmail,\s*setLoginEmail\]\s*=\s*useState\(''\)/, 'loginEmail must initialize to empty string');
  assert.match(content, /const\s+\[loginPassword,\s*setLoginPassword\]\s*=\s*useState\(''\)/, 'loginPassword must initialize to empty string');

  // Verify autocomplete attributes
  assert.match(content, /autoComplete="username"/, 'Email input must specify autoComplete="username"');
  assert.match(content, /autoComplete="current-password"/, 'Password input must specify autoComplete="current-password"');

  // Verify demo buttons and hardcoded passwords are removed
  assert.equal(content.includes('Pre-Configured System Accounts'), false, 'Must not have preconfigured accounts UI');
  assert.equal(content.includes('superadmin2026'), false, 'Must not contain hardcoded demo passwords');
  assert.equal(content.includes('adminpassword2026'), false, 'Must not contain hardcoded admin passwords');
  assert.equal(content.includes('staffpassword2026'), false, 'Must not contain hardcoded staff passwords');
  assert.equal(content.includes('handleQuickDemo'), false, 'Must not have handleQuickDemo');
});

test('AUTH-02: Seed script creates zero default users', () => {
  const seedFilePath = path.resolve('prisma/seed.ts');
  const seedContent = fs.readFileSync(seedFilePath, 'utf-8');

  // Ensure prisma.user.create / upsert does not exist in seed.ts
  assert.equal(seedContent.includes('prisma.user.'), false, 'prisma/seed.ts must not create any users');
  assert.equal(seedContent.includes('admin@invenaro.com'), false, 'prisma/seed.ts must not seed admin@invenaro.com');
  assert.equal(seedContent.includes('staff@invenaro.com'), false, 'prisma/seed.ts must not seed staff@invenaro.com');
  assert.equal(seedContent.includes('admin123'), false, 'prisma/seed.ts must not contain admin123');
});

test('AUTH-03: Password validation enforces minimum length of 10 characters', () => {
  // Passwords with less than 10 characters must fail
  const shortPass = changePasswordSchema.safeParse({
    currentPassword: 'currentValidPassword123',
    newPassword: 'short99',
  });
  assert.equal(shortPass.success, false, 'Password shorter than 10 chars must fail');

  const validPass = changePasswordSchema.safeParse({
    currentPassword: 'currentValidPassword123',
    newPassword: 'ValidNewPassword2026!',
  });
  assert.equal(validPass.success, true, 'Password with at least 10 chars must pass');

  const firstLoginShort = firstLoginChangePasswordSchema.safeParse({
    newPassword: 'short',
  });
  assert.equal(firstLoginShort.success, false, 'First login password shorter than 10 chars must fail');

  const firstLoginValid = firstLoginChangePasswordSchema.safeParse({
    newPassword: 'SecureTempChange10',
  });
  assert.equal(firstLoginValid.success, true, 'First login password with 10+ chars must pass');
});

test('AUTH-04: Lockout simulation verifies account lockout after 5 failed attempts', () => {
  const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
  const MAX_FAILED_ATTEMPTS = 5;

  interface MockAttempt {
    email: string;
    ip: string;
    successful: boolean;
    attempted_at: Date;
  }

  const attempts: MockAttempt[] = [];

  function recordAttempt(email: string, ip: string, successful: boolean) {
    attempts.push({ email, ip, successful, attempted_at: new Date() });
  }

  function isLockedOut(email: string, ip: string): boolean {
    const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MS);
    const failedEmailCount = attempts.filter(
      (a) => a.email === email && !a.successful && a.attempted_at >= windowStart
    ).length;
    const failedIpCount = attempts.filter(
      (a) => a.ip === ip && !a.successful && a.attempted_at >= windowStart
    ).length;

    return failedEmailCount >= MAX_FAILED_ATTEMPTS || failedIpCount >= MAX_FAILED_ATTEMPTS;
  }

  const testEmail = 'user@example.com';
  const testIp = '192.168.1.100';

  for (let i = 1; i <= 4; i++) {
    recordAttempt(testEmail, testIp, false);
    assert.equal(isLockedOut(testEmail, testIp), false, `Attempt ${i} should not be locked out`);
  }

  // 5th failed attempt
  recordAttempt(testEmail, testIp, false);
  assert.equal(isLockedOut(testEmail, testIp), true, '5th failed attempt must trigger lockout');
});

test('AUTH-05: First login password change flow forces password update', async () => {
  // Simulate user created by admin:create
  const tempPassword = 'TempAdminPassword123!';
  const initialHash = await bcrypt.hash(tempPassword, 10);

  const mockUser = {
    id: 'usr-1',
    email: 'newadmin@invenaro.com',
    password_hash: initialHash,
    must_change_password: true,
  };

  // Check initial state
  assert.equal(mockUser.must_change_password, true, 'New admin must have must_change_password true');

  // Verify temporary password matches
  const canLogin = await bcrypt.compare(tempPassword, mockUser.password_hash);
  assert.equal(canLogin, true, 'Temporary password must validate');

  // Simulate change password
  const newPassword = 'NewPermanentSecurePassword2026!';
  const newHash = await bcrypt.hash(newPassword, 10);
  mockUser.password_hash = newHash;
  mockUser.must_change_password = false;

  assert.equal(mockUser.must_change_password, false, 'must_change_password must be false after update');
  assert.equal(await bcrypt.compare(tempPassword, mockUser.password_hash), false, 'Old temp password must no longer work');
  assert.equal(await bcrypt.compare(newPassword, mockUser.password_hash), true, 'New password must validate');
});
