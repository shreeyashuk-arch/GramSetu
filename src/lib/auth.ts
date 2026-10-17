import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { canReadPrivateComplaint, canWorkComplaint } from './complaint-access';
import type { ComplaintAccessRecord } from './complaint-access';

export const COOKIE_NAME = 'gramsetu_token';

export type UserRole = 'RESIDENT' | 'SARPANCH' | 'ORGANIZATION' | 'PROVIDER';

export interface TokenPayload {
  userId: string;
  phone: string;
  name: string;
  role: UserRole;
  villageId: string;
  villageName?: string;
  zoneId?: string;
  organizationType?: string;
  providerCategory?: string;
  language?: string;
  isVerified?: boolean;
}

function jwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 non-padding characters');
  }
  return new TextEncoder().encode(secret);
}

function isUserRole(role: unknown): role is UserRole {
  return role === 'RESIDENT' || role === 'SARPANCH' ||
    role === 'ORGANIZATION' || role === 'PROVIDER';
}

function isTokenPayload(payload: unknown): payload is TokenPayload {
  if (!payload || typeof payload !== 'object') return false;
  const value = payload as Record<string, unknown>;
  return typeof value.userId === 'string' && value.userId.trim().length > 0 &&
    typeof value.villageId === 'string' && value.villageId.trim().length > 0 &&
    typeof value.phone === 'string' && typeof value.name === 'string' &&
    isUserRole(value.role) &&
    ['villageName', 'zoneId', 'organizationType', 'providerCategory', 'language']
      .every((key) => value[key] === undefined || typeof value[key] === 'string') &&
    (value.isVerified === undefined || typeof value.isVerified === 'boolean');
}

export async function signToken(payload: TokenPayload): Promise<string> {
  const secret = jwtSecret();
  if (!isTokenPayload(payload)) throw new Error('Invalid session payload');
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), {
      algorithms: ['HS256'],
      requiredClaims: ['iat', 'exp'],
    });
    return isTokenPayload(payload) ? payload : null;
  } catch {
    // Invalid tokens and missing/weak configuration both fail closed.
    return null;
  }
}

async function currentAccount(token: string): Promise<TokenPayload | null> {
  const claims = await verifyToken(token);
  if (!claims) return null;

  // Keep pure policy/JWT consumers independent of Prisma initialization.
  const { prisma } = await import('./prisma');
  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: {
      id: true,
      phone: true,
      name: true,
      role: true,
      villageId: true,
      village: { select: { name: true } },
      zoneId: true,
      organizationType: true,
      providerCategory: true,
      language: true,
      isVerified: true,
    },
  });
  if (!user || !isUserRole(user.role) || !user.villageId.trim()) return null;

  return {
    userId: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    villageId: user.villageId,
    villageName: user.village.name,
    zoneId: user.zoneId || undefined,
    organizationType: user.organizationType || undefined,
    providerCategory: user.providerCategory || undefined,
    language: user.language,
    isVerified: user.isVerified,
  };
}

export async function getSessionUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await currentAccount(token);
  } catch {
    return null;
  }
}

export async function getSessionUserFromRequest(req: NextRequest): Promise<TokenPayload | null> {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await currentAccount(token);
  } catch {
    return null;
  }
}

// RBAC Permissions check helper
export function canAccessRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  if (userRole === 'SARPANCH') return true; // Sarpanch can view everything in the village
  return allowedRoles.includes(userRole);
}

/** @deprecated Use action-specific predicates from complaint-access for routes. */
export function canManageComplaint(
  user: TokenPayload,
  complaint: Omit<ComplaintAccessRecord, 'villageId'> & { villageId?: string; category?: string }
): boolean {
  if (complaint.villageId === undefined) {
    // Legacy engine fixtures omit villageId. Never extend this exception to staff.
    return user.role === 'RESIDENT' && !!user.userId.trim() && !!user.villageId.trim() &&
      complaint.isAnonymous !== true && complaint.residentId === user.userId;
  }
  const scoped = { ...complaint, villageId: complaint.villageId };
  return canWorkComplaint(user, scoped) ||
    (user.role === 'RESIDENT' && canReadPrivateComplaint(user, scoped));
}
