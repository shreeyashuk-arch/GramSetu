import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUserFromRequest(req);
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { village: true, zone: true },
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        villageId: user.villageId,
        villageName: user.village.name,
        zoneId: user.zoneId,
        zoneName: user.zone?.name,
        organizationType: user.organizationType,
        providerCategory: user.providerCategory,
        trustScore: user.trustScore,
        isVerified: user.isVerified,
        language: user.language,
      },
    });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
}
