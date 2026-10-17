import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { sseManager } from '@/lib/sse';

const TRANSITIONS: Record<string, string[]> = {
  ACTIVE: ['ACKNOWLEDGED', 'RESOLVED'],
  ACKNOWLEDGED: ['RESOLVED'],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUserFromRequest(req);
    const canRespond = session?.role === 'SARPANCH' ||
      (session?.role === 'PROVIDER' && session.providerCategory === 'VOLUNTEER' && session.isVerified === true);
    if (!session || !canRespond) return NextResponse.json({ error: 'Authorized responder access required' }, { status: 403 });

    const body = await req.json().catch(() => null);
    const status = body && typeof body.status === 'string' ? body.status : '';
    const notes = body?.notes;
    if (!['ACKNOWLEDGED', 'RESOLVED'].includes(status) ||
        (notes !== undefined && (typeof notes !== 'string' || notes.length > 2000))) {
      return NextResponse.json({ error: 'Invalid SOS update' }, { status: 400 });
    }

    const existing = await prisma.sOSAlert.findUnique({ where: { id: params.id } });
    if (!existing || existing.villageId !== session.villageId) {
      return NextResponse.json({ error: 'SOS alert not found' }, { status: 404 });
    }
    if (!TRANSITIONS[existing.status]?.includes(status)) {
      return NextResponse.json({ error: 'Invalid SOS status transition' }, { status: 409 });
    }

    const responseTimeMinutes = status === 'RESOLVED'
      ? Math.max(0, Math.round((Date.now() - existing.createdAt.getTime()) / 60000))
      : null;
    const changed = await prisma.sOSAlert.updateMany({
      where: { id: existing.id, villageId: session.villageId, status: existing.status },
      data: { status, notes: typeof notes === 'string' ? notes.trim() || null : existing.notes, responseTimeMinutes },
    });
    if (!changed.count) return NextResponse.json({ error: 'SOS alert changed; refresh and retry' }, { status: 409 });

    const updated = await prisma.sOSAlert.findUniqueOrThrow({ where: { id: existing.id } });
    sseManager.broadcast('sos_updated', {
      villageId: updated.villageId,
      id: updated.id,
      status: updated.status,
      time: Date.now(),
    });
    return NextResponse.json({
      success: true,
      alert: { id: updated.id, status: updated.status, responseTimeMinutes: updated.responseTimeMinutes },
    });
  } catch (error: any) {
    console.error('Error updating SOS:', { name: error?.name, code: error?.code });
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}
