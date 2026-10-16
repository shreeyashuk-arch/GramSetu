import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sseManager } from '@/lib/sse';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status, notes, responseTimeMinutes } = await req.json();

    const updated = await prisma.sOSAlert.update({
      where: { id: params.id },
      data: {
        status,
        notes: notes || null,
        responseTimeMinutes: responseTimeMinutes ? Number(responseTimeMinutes) : null,
      },
    });

    sseManager.broadcast('sos_updated', {
      id: updated.id,
      status: updated.status,
    });

    return NextResponse.json({ success: true, alert: updated });
  } catch (error: any) {
    console.error('Error updating SOS:', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}
