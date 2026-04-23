// Throws at boot if a required secret is missing/weak

const MIN_SECRET_LENGTH = 16;
const WEAK_PLACEHOLDERS = new Set([
  'a-strong-secret',
  'change-me',
  'secret',
  'changeme',
  'your-secret-here'
]);

function requireSecret(name, { allowShortInTest = false } = {}) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`[config] ${name} is not set. Refusing to start.`);
  }
  if (WEAK_PLACEHOLDERS.has(value.trim().toLowerCase())) {
    throw new Error(`[config] ${name} is still set to a placeholder value. Set a real secret.`);
  }
  const isTest = process.env.NODE_ENV === 'test';
  if (!(isTest && allowShortInTest) && value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `[config] ${name} is too short (${value.length} chars). Use at least ${MIN_SECRET_LENGTH} characters. ` +
      `Generate one with: openssl rand -base64 48`
    );
  }
  return value;
}

export const config = {
  get jwtSecret() {
    return requireSecret('JWT_SECRET', { allowShortInTest: true });
  },
  get mongoUri() {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('[config] MONGO_URI is not set.');
    return uri;
  },
  get clientOrigin() {
    return process.env.CLIENT_ORIGIN || 'http://localhost:3000';
  },
  get isProduction() {
    return process.env.NODE_ENV === 'production';
  },

  jwt: {
    issuer: 'japticcards',
    audience: 'japticcards-client',
    algorithm: 'HS256',
    accessTtlSeconds: 15 * 60,           // 15 minutes
    refreshTtlSeconds: 7 * 24 * 60 * 60, // 7 days
    clockToleranceSeconds: 5,            // allow minor clock skew on verify
    refreshGraceSeconds: 10              // race-condition window for rotation
  }
};

// Call once at startup to fail fast if anything is misconfigured.
export function validateConfigOrExit() {
  try {
    // Touch every required getter so missing values surface immediately.
    config.jwtSecret;
    config.mongoUri;
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
