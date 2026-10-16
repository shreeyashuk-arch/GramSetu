import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { sseManager } from '@/lib/sse';

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
        supporters: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    // Parse priority factors JSON
    let factors = null;
    if (complaint.priorityFactors) {
      try {
        factors = JSON.parse(complaint.priorityFactors);
      } catch {}
    }

    return NextResponse.json({ complaint: { ...complaint, parsedFactors: factors } });
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
    const body = await req.json();

    const {
      status,
      assignedProviderId,
      assignedOrgType,
      proofPhotoUrl,
      residentConfirmed,
      residentRating,
      residentFeedback,
      moderationStatus,
      moderationNotes,
    } = body;

    const existing = await prisma.complaint.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    const updateData: any = {};
    let auditAction = 'STATUS_CHANGE';

    // 1. Status Transitions
    if (status) {
      updateData.status = status;
      auditAction = `STATUS_CHANGE_TO_${status}`;

      if (status === 'RESOLVED') {
        if (proofPhotoUrl) updateData.proofPhotoUrl = proofPhotoUrl;
      }
    }

    // 2. Resident Confirmation (Is it fixed? Yes/No)
    if (residentConfirmed !== undefined) {
      updateData.residentConfirmed = residentConfirmed;
      if (residentRating) updateData.residentRating = residentRating;
      if (residentFeedback) updateData.residentFeedback = residentFeedback;

      if (residentConfirmed === true) {
        updateData.status = 'CLOSED';
        auditAction = 'RESIDENT_CONFIRMED_CLOSED';
      } else if (residentConfirmed === false) {
        // Reopen and escalate!
        updateData.status = 'REOPENED';
        updateData.escalationLevel = existing.escalationLevel + 1;
        auditAction = 'RESIDENT_REJECTED_REOPENED';
      }
    }

    // 3. Provider / Org Assignment
    if (assignedProviderId) {
      updateData.assignedProviderId = assignedProviderId;
      updateData.status = 'ASSIGNED';
      auditAction = 'PROVIDER_ASSIGNED';
    }
    if (assignedOrgType) {
      updateData.assignedOrgType = assignedOrgType;
    }

    // 4. Sarpanch Moderation
    if (moderationStatus) {
      updateData.moderationStatus = moderationStatus;
      if (moderationStatus === 'REJECTED') {
        updateData.status = 'REJECTED';
        updateData.isSpam = true;
      } else if (moderationStatus === 'APPROVED') {
        updateData.status = 'VERIFIED';
        updateData.isSpam = false;
      }
      auditAction = `MODERATED_${moderationStatus}`;
    }

    const updated = await prisma.complaint.update({
      where: { id: params.id },
      data: updateData,
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        complaintId: updated.id,
        userId: session?.userId || null,
        role: session?.role || 'SYSTEM',
        action: auditAction,
        details: JSON.stringify({
          previousStatus: existing.status,
          newStatus: updated.status,
          residentConfirmed,
          residentRating,
          proofPhotoUrl,
          moderationNotes,
        }),
      },
    });

    // Notification on resolution or assignment
    if (updated.status === 'RESOLVED' && updated.residentId) {
      await prisma.notification.create({
        data: {
          villageId: updated.villageId,
          recipientId: updated.residentId,
          type: 'STATUS_UPDATE',
          title: `Resolution Proof Uploaded for #${updated.code}`,
          message: 'The provider has uploaded resolution proof. Please confirm: Is it fixed?',
          link: `/complaints/track?id=${updated.id}`,
        },
      });
    }

    // SSE Broadcast
    sseManager.broadcast('complaint_updated', {
      id: updated.id,
      code: updated.code,
      status: updated.status,
      escalationLevel: updated.escalationLevel,
      proofPhotoUrl: updated.proofPhotoUrl,
      time: Date.now(),
    });

    return NextResponse.json({ success: true, complaint: updated });
  } catch (error: any) {
    console.error('Error updating complaint:', error);
    return NextResponse.json({ error: 'Failed to update complaint' }, { status: 500 });
  }
}
