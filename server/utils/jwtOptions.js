import { config } from '../config/env.js';

export function jwtVerifyOptions() {
  return {
    algorithms: [config.jwt.algorithm],
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    clockTolerance: config.jwt.clockToleranceSeconds
  };
}

export function jwtSignOptions(extra = {}) {
  return {
    algorithm: config.jwt.algorithm,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    ...extra
  };
}
