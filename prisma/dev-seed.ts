import 'dotenv/config';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function devSeed() {
  if (process.env.NODE_ENV !== 'development') {
    console.error('❌ Refusing to run dev seed: NODE_ENV is not "development"');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ Refusing to run dev seed: DATABASE_URL is not set');
    process.exit(1);
  }

  try {
    const parsed = new URL(dbUrl);
    const hostname = parsed.hostname.toLowerCase();
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    if (!isLocal) {
      console.error(`❌ Refusing to run dev seed: Database host "${hostname}" is not local (localhost / 127.0.0.1)`);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Refusing to run dev seed: Invalid DATABASE_URL');
    process.exit(1);
  }

  console.log('🌱 Running Dev Seed (local development only)...');

  let defaultGodown = await prisma.godown.findFirst({ where: { is_default: true } });
  if (!defaultGodown) {
    defaultGodown = await prisma.godown.create({
      data: {
        name: 'Main Central Godown',
        code: 'MAIN-01',
        is_default: true,
        is_active: true,
      },
    });
  }

  const devEmail = 'dev-admin@invenaro.local';
  const temporaryPassword = crypto.randomBytes(12).toString('base64url');
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: devEmail },
    update: {
      password_hash: passwordHash,
      must_change_password: true,
    },
    create: {
      email: devEmail,
      name: 'Development Admin',
      password_hash: passwordHash,
      role: 'OWNER',
      must_change_password: true,
      assigned_godown_id: defaultGodown.id,
    },
  });

  console.log('===============================================================');
  console.log('  DEV ADMIN PROVISIONED (PRINTED ONCE)');
  console.log(`  User ID:             ${user.id}`);
  console.log(`  Email:               ${devEmail}`);
  console.log(`  Temporary Password:  ${temporaryPassword}`);
  console.log('  Must Change Password: true');
  console.log('===============================================================');
}

devSeed()
  .catch((e) => {
    console.error('Dev seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
