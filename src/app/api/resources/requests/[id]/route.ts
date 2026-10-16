import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { sseManager } from '@/lib/sse';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUserFromRequest(req);
    const { action } = await req.json(); // 'ACCEPT' | 'DECLINE' | 'COMPLETE'

    const request = await prisma.resourceRequest.findUnique({
      where: { id: params.id },
      include: { resource: true },
    });

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (action === 'ACCEPT') {
      const updated = await prisma.resourceRequest.update({
        where: { id: params.id },
        data: { status: 'ACCEPTED' },
      });

      // Notify requester
      await prisma.notification.create({
        data: {
          villageId: request.villageId,
          recipientId: request.requesterId,
          type: 'STATUS_UPDATE',
          title: 'Resource Request Accepted!',
          message: `Your request for "${request.title}" has been accepted by the provider.`,
          link: '/resources',
        },
      });

      return NextResponse.json({ success: true, request: updated });
    }

    if (action === 'DECLINE') {
      // Find other available resources in same category
      const nextCandidate = await prisma.resource.findFirst({
        where: {
          villageId: request.villageId,
          category: request.category,
          isAvailable: true,
          ownerId: { not: request.matchedProviderId || '' },
        },
        include: { owner: true },
      });

      const updated = await prisma.resourceRequest.update({
        where: { id: params.id },
        data: {
          status: nextCandidate ? 'MATCHED' : 'PENDING',
          matchedProviderId: nextCandidate ? nextCandidate.ownerId : null,
          resourceId: nextCandidate ? nextCandidate.id : null,
        },
      });

      return NextResponse.json({
        success: true,
        message: nextCandidate ? 'Passed request to next available provider' : 'Request moved to pending pool',
        request: updated,
      });
    }

    if (action === 'COMPLETE') {
      const updated = await prisma.resourceRequest.update({
        where: { id: params.id },
        data: { status: 'COMPLETED' },
      });
      return NextResponse.json({ success: true, request: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating resource request:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
