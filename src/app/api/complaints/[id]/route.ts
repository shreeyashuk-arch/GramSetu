import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { sseManager } from '@/lib/sse';
import { serializeComplaint } from '@/lib/complaint-access';
import { prepareComplaintUpdate } from '@/lib/complaint-update';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUserFromRequest(req);
    const complaint = await prisma.complaint.findUnique({
      where: { id: params.id },
      include: {
        zone: true,
        resident: {
          select: { id: true, name: true, phone: true, trustScore: true },
        },
        assignedProvider: {
          select: { id: true, name: true, phone: true, providerCategory: true },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          select: { action: true, createdAt: true },
        },
      },
    });

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }
    const visible = serializeComplaint(session, complaint);
    if (!visible) return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });

    // Parse priority factors JSON
    let factors = null;
    if (complaint.priorityFactors) {
      try {
        factors = JSON.parse(complaint.priorityFactors);
      } catch {}
    }

    return NextResponse.json({ complaint: { ...visible, parsedFactors: factors } });
  } catch (error: any) {
    console.error('Error fetching complaint details:', error);
    return NextResponse.json({ error: 'Failed to fetch complaint' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUserFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const existing = await prisma.complaint.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    const prepared = prepareComplaintUpdate(session, existing, body);
    if ('error' in prepared) return NextResponse.json({ error: prepared.error }, { status: prepared.status });
    if (body.assignedProviderId && !(await prisma.user.findFirst({
      where: { id: body.assignedProviderId, villageId: existing.villageId, role: 'PROVIDER' },
    }))) return NextResponse.json({ error: 'Provider must belong to this village' }, { status: 400 });

    const updated = await prisma.$transaction(async tx => {
    const changed = await tx.complaint.updateMany({
      where: { id: existing.id, villageId: session.villageId, status: existing.status, updatedAt: existing.updatedAt },
      data: prepared.data,
    });
    if (!changed.count) return null;
    const result = await tx.complaint.findUniqueOrThrow({
      where: { id: existing.id }, include: { zone: true, resident: true, assignedProvider: true },
    });
    await tx.auditLog.create({
      data: {
        complaintId: result.id,
        userId: session.userId,
        role: session.role,
        action: prepared.action,
        details: JSON.stringify({
          previousStatus: existing.status,
          newStatus: result.status,
        }),
      },
    });

    // Notification on resolution or assignment
    if (result.status === 'RESOLVED' && result.residentId) {
      await tx.notification.create({
        data: {
          villageId: result.villageId,
          recipientId: result.residentId,
          type: 'STATUS_UPDATE',
          title: `Resolution Proof Uploaded for #${result.code}`,
          message: 'The provider has uploaded resolution proof. Please confirm: Is it fixed?',
          link: `/complaints/track?id=${result.id}`,
        },
      });
    }
    return result;
    });
    if (!updated) return NextResponse.json({ error: 'Complaint changed; refresh and retry' }, { status: 409 });

    // SSE Broadcast
    sseManager.broadcast('complaint_updated', {
      villageId: updated.villageId,
      time: Date.now(),
    });

    return NextResponse.json({ success: true, complaint: serializeComplaint(session, updated) });
  } catch (error: any) {
    console.error('Error updating complaint:', { name: error?.name, code: error?.code });
    return NextResponse.json({ error: 'Failed to update complaint' }, { status: 500 });
  }
}
