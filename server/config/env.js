// Throws at boot if a required secret is missing/weak

const MIN_SECRET_LENGTH = 16;

function requireSecret(name, { allowShortInTest = false } = {}) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`[config] ${name} is not set. Refusing to start.`);
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
  get port() {
    const raw = process.env.PORT;
    if (raw === undefined || raw === '') return 5000;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 5000;
  },
  get isProduction() {
    return process.env.NODE_ENV === 'production';
  },

  jwt: {
    issuer: 'japticcards',
    audience: 'japticcards-client',
    algorithm: 'HS256',
    accessTtlSeconds: 15 * 60,
    refreshTtlSeconds: 7 * 24 * 60 * 60,
    clockToleranceSeconds: 5,
    refreshGraceSeconds: 10,
    revocationCacheSeconds: 10
  }
};

export function validateConfigOrExit() {
  try {
    config.jwtSecret;
    config.mongoUri;
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
