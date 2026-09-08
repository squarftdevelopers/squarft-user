const decodeBase64Url = (value) => {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return globalThis.atob(padded);
};

export const getJwtExpiryMs = (token) => {
  try {
    const payloadSegment = String(token || '').split('.')[1];
    if (!payloadSegment) return null;
    const payload = JSON.parse(decodeBase64Url(payloadSegment));
    return Number.isFinite(payload?.exp) ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

export const isJwtExpired = (token, now = Date.now()) => {
  const expiresAt = getJwtExpiryMs(token);
  return expiresAt !== null && expiresAt <= now;
};
