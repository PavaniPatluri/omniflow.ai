const { PrismaClient } = require('@prisma/client');

// Singleton pattern — one connection pool shared across the entire app
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error']
});

module.exports = prisma;
