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

    // Disassociate user from complaints to preserve village infrastructure logs without PII
    await prisma.complaint.updateMany({
      where: { residentId: userId },
      data: {
        residentId: null,
        isAnonymous: true,
        proxyFiledBy: null,
        proxyPhone: null,
      },
    });

    // Delete supporters, requests, notifications
    await prisma.complaintSupporter.deleteMany({ where: { userId } });
    await prisma.resourceRequest.deleteMany({ where: { requesterId: userId } });
    await prisma.notification.deleteMany({ where: { recipientId: userId } });

    // Delete user record
    await prisma.user.delete({ where: { id: userId } });

    const response = NextResponse.json({
      success: true,
      message: 'Your personal data and phone credentials have been erased in compliance with the DPDP Act.',
    });

    response.cookies.delete(COOKIE_NAME);
    return response;
  } catch (error: any) {
    console.error('Error deleting user data:', error);
    return NextResponse.json({ error: 'Failed to erase data' }, { status: 500 });
  }
}
