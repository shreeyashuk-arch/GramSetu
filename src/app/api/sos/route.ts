import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { sseManager } from '@/lib/sse';
import { isResourceLocation } from '@/lib/matching';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUserFromRequest(req);
    const canRespond = session?.role === 'SARPANCH' ||
      (session?.role === 'PROVIDER' && session.providerCategory === 'VOLUNTEER' && session.isVerified === true);
    if (!session || !canRespond) return NextResponse.json({ error: 'Authorized responder access required' }, { status: 403 });
    const alerts = await prisma.sOSAlert.findMany({
      where: { villageId: session.villageId },
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
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'A JSON object is required' }, { status: 400 });
    }

    const {
      lat = 18.3164,
      lng = 73.8682,
      message = 'EMERGENCY SOS: Women Safety Alert Triggered. Need immediate help!',
      senderName,
      senderPhone,
    } = body;

    if (typeof message !== 'string' || message.trim().length < 5 || message.length > 2000) {
      return NextResponse.json({ error: 'SOS message must be between 5 and 2000 characters' }, { status: 400 });
    }
    const numericLat = Number(lat);
    const numericLng = Number(lng);
    if (!isResourceLocation(numericLat, numericLng)) {
      return NextResponse.json({ error: 'Valid SOS coordinates are required' }, { status: 400 });
    }
    const defaultVillage = await prisma.village.findFirst({ orderBy: { createdAt: 'asc' } });
    const villageId = session?.villageId || defaultVillage?.id || '';
    if (!villageId) return NextResponse.json({ error: 'Village setup required' }, { status: 503 });
    const senderNameValue = session?.name || (typeof senderName === 'string' && senderName.trim() ? senderName.trim() : 'Village Resident');
    const senderPhoneValue = session?.phone || (typeof senderPhone === 'string' && senderPhone.trim() ? senderPhone.trim() : 'Emergency Contact');

    const alert = await prisma.sOSAlert.create({
      data: {
        villageId,
        senderId: session?.userId || null,
        senderName: senderNameValue,
        senderPhone: senderPhoneValue,
        lat: numericLat,
        lng: numericLng,
        message: message.trim(),
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
        message: `Emergency assistance requested at coordinates ${numericLat.toFixed(4)}, ${numericLng.toFixed(4)}.`,
        link: '/sos',
      },
    });

    // Real-time SSE alert
    sseManager.broadcast('sos_alert', {
      villageId,
      id: alert.id,
      time: Date.now(),
    });

    return NextResponse.json({
      success: true,
      alert: { id: alert.id, status: alert.status, createdAt: alert.createdAt },
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
