import 'dotenv/config';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';

function parseCliArgs() {
  const args = process.argv.slice(2);
  let email = '';
  let name = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && i + 1 < args.length) {
      email = args[++i].trim();
    } else if (args[i] === '--name' && i + 1 < args.length) {
      name = args[++i].trim();
    }
  }

  return { email, name };
}

async function main() {
  const { email, name } = parseCliArgs();

  if (!email || !name) {
    console.error('❌ Error: Missing required arguments.');
    console.error('Usage: npm run admin:create -- --email <email> --name <name>');
    process.exit(1);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error(`❌ Error: Invalid email format: "${email}"`);
    process.exit(1);
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.error(`❌ Error: User with email "${email}" already exists.`);
    process.exit(1);
  }

  // Ensure default godown exists
  let defaultGodown = await prisma.godown.findFirst({
    where: { is_default: true },
  });

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

  // Generate strong random temporary password
  const tempPassword = crypto.randomBytes(12).toString('base64url') + '!A9';
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password_hash: passwordHash,
      role: 'OWNER',
      must_change_password: true,
      assigned_godown_id: defaultGodown.id,
    },
  });

  console.log('===============================================================');
  console.log('  INITIAL ADMINISTRATOR ACCOUNT CREATED');
  console.log('===============================================================');
  console.log(`  User ID:             ${user.id}`);
  console.log(`  Name:                ${user.name}`);
  console.log(`  Email:               ${user.email}`);
  console.log(`  Role:                ${user.role}`);
  console.log(`  Temporary Password:  ${tempPassword}`);
  console.log('  Must Change Password: true (Enforced on first login)');
  console.log('===============================================================');
  console.log('  NOTE: Securely transmit this temporary password to the admin.');
  console.log('  It will NOT be shown again and cannot be retrieved.');
  console.log('===============================================================');
}

main()
  .catch((err) => {
    console.error('❌ Failed to create admin user:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
