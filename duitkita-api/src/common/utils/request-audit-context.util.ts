import type { Request } from 'express';

export type RequestAuditContext = {
  ipAddress: string | null;
  userAgent: string | null;
};

export function extractRequestAuditContext(req: Request): RequestAuditContext {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ipAddress = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0]?.trim()
      : req.ip;

  const userAgentHeader = req.headers['user-agent'];
  const userAgent = Array.isArray(userAgentHeader)
    ? userAgentHeader[0]
    : userAgentHeader ?? null;

  return {
    ipAddress: ipAddress ?? null,
    userAgent,
  };
}
