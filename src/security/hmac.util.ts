import * as crypto from 'crypto';

/**
 * Stable stringify to ensure object key order doesn't break HMAC signatures
 */
function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  return `{${Object.keys(obj).sort().map(k => `"${k}":${stableStringify(obj[k])}`).join(',')}}`;
}

export function verifyHmacSignature(payload: Record<string, any>, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const normalized = stableStringify(payload);
  const computed = crypto.createHmac('sha256', secret).update(normalized).digest('hex');
  
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch (e) {
    return false;
  }
}

export function signPayload(payload: Record<string, any>, secret: string): string {
  if (!secret) throw new Error('HMAC secret is missing');
  const normalized = stableStringify(payload);
  return crypto.createHmac('sha256', secret).update(normalized).digest('hex');
}
