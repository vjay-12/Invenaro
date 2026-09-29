import './env.js';
import { prisma } from './db.js';

async function main() {
  const result: any = await prisma.$queryRawUnsafe(
    'SELECT current_database(), current_user, inet_server_addr()::text, inet_server_port();'
  );
  console.log('----------------------------------------------------');
  console.log('APPLICATION DATABASE IDENTITY:');
  console.log('  Database:    ', result[0].current_database);
  console.log('  User:        ', result[0].current_user);
  console.log('  Server Port: ', result[0].inet_server_port);
  console.log('  DATABASE_URL:', process.env.DATABASE_URL);
  console.log('----------------------------------------------------');

  if (result[0].current_database !== 'invenaro_local_basic') {
    throw new Error(`CRITICAL: Connected to wrong database: ${result[0].current_database}`);
  }
  if (process.env.DATABASE_URL?.includes('neon.tech')) {
    throw new Error('CRITICAL: DATABASE_URL points to Neon!');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
