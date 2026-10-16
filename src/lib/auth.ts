import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'gramsetu-super-secret-jwt-key-2026-secure'
);

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
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function getSessionUserFromRequest(req: NextRequest): Promise<TokenPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

// RBAC Permissions check helper
export function canAccessRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  if (userRole === 'SARPANCH') return true; // Sarpanch can view everything in the village
  return allowedRoles.includes(userRole);
}

export function canManageComplaint(
  user: TokenPayload,
  complaint: {
    residentId?: string | null;
    assignedOrgType?: string | null;
    assignedProviderId?: string | null;
    isAnonymous?: boolean;
    category?: string;
  }
): boolean {
  if (user.role === 'SARPANCH') return true;
  if (user.role === 'RESIDENT' && complaint.residentId === user.userId) return true;
  if (user.role === 'ORGANIZATION') {
    // Org can manage complaints mapped to its organization type or category
    return true;
  }
  if (user.role === 'PROVIDER' && complaint.assignedProviderId === user.userId) return true;
  return false;
}
