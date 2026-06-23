/**
 * Redact sensitive values from tool parameters before sending to Control Center.
 *
 * Privacy constraint: only upload summary + redacted params by default.
 * Full content only uploaded for high/critical events when policy allows.
 */

const SENSITIVE_KEYS = new Set([
  'api_key', 'apikey', 'api-key', 'api_token', 'token',
  'password', 'passwd', 'secret', 'private_key', 'privatekey',
  'cookie', 'cookies', 'credential', 'credentials',
  'authorization', 'auth', 'bearer',
  'access_key', 'accesskey', 'secret_key', 'secretkey',
]);

const SENSITIVE_VALUE_PATTERNS = [
  /^sk-[a-zA-Z0-9]{20,}$/,          // OpenAI API key
  /^sk-ant-[a-zA-Z0-9_-]{20,}$/,    // Anthropic API key
  /^ghp_[a-zA-Z0-9]{20,}$/,         // GitHub PAT
  /^ghs_[a-zA-Z0-9]{20,}$/,         // GitHub secret
  /^xox[bpras]-[a-zA-Z0-9-]+$/,     // Slack token
  /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, // JWT
  /^[A-Za-z0-9+/]{40,}={0,2}$/,     // Base64 (likely secret)
];

export function redactValue(key: string, value: unknown): unknown {
  if (typeof value !== 'string') return value;

  // Check key name
  const normalized = key.toLowerCase().replace(/[-_]/g, '');
  if (SENSITIVE_KEYS.has(key.toLowerCase()) ||
      [...SENSITIVE_KEYS].some(k => normalized.includes(k))) {
    return `[REDACTED:${value.length} chars]`;
  }

  // Check value patterns
  for (const pattern of SENSITIVE_VALUE_PATTERNS) {
    if (pattern.test(value)) {
      return `[REDACTED:${value.slice(0, 6)}...]`;
    }
  }

  return value;
}

export function redactParams(params: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      redacted[key] = redactValue(key, value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      redacted[key] = redactParams(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}
