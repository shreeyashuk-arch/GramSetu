import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUserFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.userId;

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { villageId: true } });
      if (!user) throw new Error('Account not found');
      const village = await tx.village.findUnique({ where: { id: user.villageId }, select: { lat: true, lng: true } });
      if (!village) throw new Error('Village not found');

      // Preserve non-personal civic history while removing account, contact,
      // exact-location, and proxy identity fields.
      await tx.complaint.updateMany({
        where: { OR: [{ residentId: userId }, { assignedProviderId: userId }] },
        data: {
          residentId: null,
          assignedProviderId: null,
          isAnonymous: true,
          anonymousTrackingCode: null,
          proxyFiledBy: null,
          proxyPhone: null,
          lat: village.lat,
          lng: village.lng,
          coarseLat: Math.round(village.lat * 500) / 500,
          coarseLng: Math.round(village.lng * 500) / 500,
        },
      });
      await tx.sOSAlert.updateMany({
        where: { senderId: userId },
        data: {
          senderId: null,
          senderName: 'Anonymous resident',
          senderPhone: 'Redacted',
          lat: village.lat,
          lng: village.lng,
        },
      });
      await tx.auditLog.updateMany({ where: { userId }, data: { userId: null } });
      await tx.oTP.deleteMany({ where: { phone: session.phone } });
      await tx.complaintSupporter.deleteMany({ where: { userId } });
      await tx.resourceRequest.deleteMany({ where: { requesterId: userId } });
      await tx.resourceRequest.updateMany({ where: { matchedProviderId: userId }, data: { matchedProviderId: null, resourceId: null, status: 'PENDING' } });
      await tx.notification.deleteMany({ where: { recipientId: userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    const response = NextResponse.json({
      success: true,
      message: 'Your prototype account data was erased or anonymized where civic history was retained.',
    });

    response.cookies.delete(COOKIE_NAME);
    return response;
  } catch (error: any) {
    console.error('Error deleting user data:', { name: error?.name, code: error?.code });
    return NextResponse.json({ error: 'Failed to erase data' }, { status: 500 });
  }
}
