import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { sseManager } from '@/lib/sse';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const alerts = await prisma.sOSAlert.findMany({
      include: {
        village: { select: { name: true } },
      },
      orderBy: [
        { status: 'asc' }, // ACTIVE first
        { createdAt: 'desc' },
      ],
      take: 30,
    });

    const activeCount = alerts.filter((a) => a.status === 'ACTIVE').length;
    const resolvedList = alerts.filter((a) => a.status === 'RESOLVED' && a.responseTimeMinutes !== null);
    const avgResponseTime =
      resolvedList.length > 0
        ? Math.round(resolvedList.reduce((acc, curr) => acc + (curr.responseTimeMinutes || 0), 0) / resolvedList.length)
        : 6;

    return NextResponse.json({
      alerts,
      stats: {
        activeCount,
        totalAlerts: alerts.length,
        avgResponseTimeMinutes: avgResponseTime,
      },
    });
  } catch (error: any) {
    console.error('Error fetching SOS alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch SOS records' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUserFromRequest(req);
    const body = await req.json();

    const {
      lat = 18.3164,
      lng = 73.8682,
      message = 'EMERGENCY SOS: Women Safety Alert Triggered. Need immediate help!',
      senderName,
      senderPhone,
    } = body;

    const defaultVillage = await prisma.village.findFirst();
    const villageId = session?.villageId || defaultVillage?.id || '';

    const alert = await prisma.sOSAlert.create({
      data: {
        villageId,
        senderId: session?.userId || null,
        senderName: senderName || session?.name || 'Village Resident',
        senderPhone: senderPhone || session?.phone || 'Emergency Contact',
        lat: Number(lat),
        lng: Number(lng),
        message,
        status: 'ACTIVE',
      },
    });

    // High priority notification for Sarpanch and Volunteers
    await prisma.notification.create({
      data: {
        villageId,
        targetRole: 'SARPANCH',
        type: 'SOS',
        title: `🚨 HIGH PRIORITY SOS: ${alert.senderName}`,
        message: `${message} (Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        link: '/sos',
      },
    });

    // Real-time SSE alert
    sseManager.broadcast('sos_alert', {
      id: alert.id,
      senderName: alert.senderName,
      senderPhone: alert.senderPhone,
      lat: alert.lat,
      lng: alert.lng,
      message: alert.message,
      time: Date.now(),
    });

    return NextResponse.json({
      success: true,
      alert,
      emergencyNumbers: {
        police: '112',
        womenHelpline: '1091',
        womenSafety: '181',
        ambulance: '108',
      },
    });
  } catch (error: any) {
    console.error('Error triggering SOS:', error);
    return NextResponse.json({ error: 'Failed to dispatch SOS alert' }, { status: 500 });
  }
}
