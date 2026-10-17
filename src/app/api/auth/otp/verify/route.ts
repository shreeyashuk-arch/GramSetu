import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { phone, code, name } = await req.json();

    if (typeof phone !== 'string' || !/^\d{10}$/.test(phone) || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Phone and OTP code are required' }, { status: 400 });
    }

    // Verify OTP
    const validOtp = await prisma.oTP.findFirst({
      where: {
        phone,
        code,
        expiresAt: { gt: new Date() },
      },
    });

    if (!validOtp) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    // Delete used OTP
    await prisma.oTP.deleteMany({ where: { phone } });

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { phone },
      include: { village: true, zone: true },
    });

    if (!user) {
      const defaultVillage = await prisma.village.findFirst({ orderBy: { createdAt: 'asc' } });
      if (!defaultVillage) {
        return NextResponse.json({ error: 'System database not initialized' }, { status: 500 });
      }

      user = await prisma.user.create({
        data: {
          phone,
          name: typeof name === 'string' && name.trim().length >= 2 && name.length <= 100
            ? name.trim()
            : `Villager ${phone.slice(-4)}`,
          role: 'RESIDENT',
          villageId: defaultVillage.id,
          zoneId: null,
          isVerified: true,
        },
        include: { village: true, zone: true },
      });
    }

    // Generate JWT
    const token = await signToken({
      userId: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role as any,
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

    // Set secure httpOnly cookie
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
