/**
 * Startup environment variable validator.
 * Call this before initializing anything else.
 * Crashes fast with a clear error message if required vars are missing.
 */

const REQUIRED_VARS = [
  'JWT_SECRET',
  'DATABASE_URL'
];

const WARN_IF_DEFAULT_VARS = [
  'NODE_ENV'
];

function validateEnv() {
  const missing = [];

  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ FATAL: Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\nPlease copy .env.example to .env and fill in the required values.\n');
    process.exit(1);
  }

  // Warn about JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters long for production security.');
  }

  for (const key of WARN_IF_DEFAULT_VARS) {
    if (!process.env[key]) {
      console.warn(`⚠️  WARNING: ${key} is not set. Defaulting to 'development'.`);
    }
  }

  console.log('✅ Environment variables validated successfully.');
}

module.exports = { validateEnv };
