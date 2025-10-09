import * as crypto from 'crypto';

export function verifyHmacSignature(payload: Record<string, any>, signature: string, secret: string): boolean {
  const normalized = JSON.stringify(payload);
  const computed = crypto.createHmac('sha256', secret).update(normalized).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}

export function signPayload(payload: Record<string, any>, secret: string): string {
  const normalized = JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(normalized).digest('hex');
}

