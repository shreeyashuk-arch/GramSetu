import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUserFromRequest(req);
    const role = session?.role || 'RESIDENT';
    const userId = session?.userId;

    const where: any = {
      OR: [
        { targetRole: 'ALL' },
        { targetRole: role },
        ...(userId ? [{ recipientId: userId }] : []),
      ],
    };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    // Ticker items (critical emergencies, announcements, active status alerts)
    const tickerItems = notifications.slice(0, 5).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      isEmergency: n.type === 'EMERGENCY' || n.type === 'SOS',
    }));

    return NextResponse.json({
      notifications,
      unreadCount,
      tickerItems,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
