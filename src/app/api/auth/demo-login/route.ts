import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken, COOKIE_NAME, UserRole } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
      return NextResponse.json({ error: 'Demo login is disabled' }, { status: 403 });
    }
    const { role } = await req.json();

    const demoPhones: Record<string, string> = {
      RESIDENT: '9876543250',
      SARPANCH: '9876543210',
      ORGANIZATION: '9876543220',
      PROVIDER: '9876543230',
    };
    const targetPhone = demoPhones[role];
    if (!targetPhone) return NextResponse.json({ error: 'Invalid demo role' }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { phone: targetPhone },
      include: { village: true, zone: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Demo user not found. Please run seed script.' }, { status: 404 });
    }

    const token = await signToken({
      userId: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role as UserRole,
      villageId: user.villageId,
      villageName: user.village.name,
      zoneId: user.zoneId || undefined,
      organizationType: user.organizationType || undefined,
      providerCategory: user.providerCategory || undefined,
      language: user.language || 'mr',
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        village: user.village.name,
        zone: user.zone?.name,
        organizationType: user.organizationType,
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Demo login error:', error);
    return NextResponse.json({ error: 'Demo login failed' }, { status: 500 });
  }
}
