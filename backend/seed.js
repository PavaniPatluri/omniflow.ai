const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pass = await bcrypt.hash('admin123', 10);
  
  // Create test business and user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@omniflow.ai' },
    update: {},
    create: {
      email: 'admin@omniflow.ai',
      passwordHash: pass,
      name: 'OmniFlow Admin',
      businessesOwned: {
        create: {
          id: 'bus_omniflow_001',
          name: 'OmniFlow Corp'
        }
      },
      teamMemberships: {
        create: {
          businessId: 'bus_omniflow_001',
          role: 'ADMIN'
        }
      }
    }
  });

  console.log('✅ Admin user created/verified successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
