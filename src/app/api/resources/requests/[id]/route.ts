import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { rankMatchingResources, readRequestMatchMetadata } from '@/lib/matching';
import { sseManager } from '@/lib/sse';

const ACTIONS = ['ACCEPT', 'DECLINE', 'COMPLETE'] as const;
type RequestAction = typeof ACTIONS[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUserFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    if (session.role !== 'PROVIDER') return NextResponse.json({ error: 'Provider access required' }, { status: 403 });

    const body = await req.json().catch(() => null);
    const action = body && typeof body.action === 'string' ? body.action as RequestAction : null;
    if (!action || !ACTIONS.includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    const request = await prisma.resourceRequest.findUnique({
      where: { id: params.id },
      include: { resource: true },
    });
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (request.villageId !== session.villageId || request.matchedProviderId !== session.userId) {
      return NextResponse.json({ error: 'This request is not assigned to you' }, { status: 403 });
    }

    const expectedStatus = action === 'ACCEPT' || action === 'DECLINE' ? 'MATCHED' : 'ACCEPTED';
    if (request.status !== expectedStatus) {
      return NextResponse.json({ error: `Cannot ${action.toLowerCase()} a ${request.status} request` }, { status: 409 });
    }

    const village = await prisma.village.findUnique({ where: { id: request.villageId } });
    if (!village) return NextResponse.json({ error: 'Village setup required' }, { status: 503 });

    let nextCandidate: ReturnType<typeof rankMatchingResources>[number] | undefined;
    let nextMetadata = readRequestMatchMetadata(request.matchReason);
    if (action === 'DECLINE') {
      nextMetadata = {
        ...nextMetadata,
        declinedProviderIds: [...new Set([...nextMetadata.declinedProviderIds, session.userId])],
      };
      const location = nextMetadata.location || (request.resource
        ? { lat: request.resource.lat, lng: request.resource.lng }
        : { lat: village.lat, lng: village.lng });
      const candidates = await prisma.resource.findMany({
        where: {
          villageId: request.villageId,
          category: request.category,
          isAvailable: true,
          ownerId: { notIn: nextMetadata.declinedProviderIds },
        },
        include: {
          owner: {
            select: { id: true, name: true, trustScore: true, providerCategory: true, isVerified: true },
          },
        },
      });
      nextCandidate = rankMatchingResources(candidates as any, {
        category: request.category,
        title: request.title,
        neededAt: request.neededAt,
        durationHours: request.durationHours,
        urgency: request.urgency,
        lat: location.lat,
        lng: location.lng,
      }, 1)[0];
    }

    const updated = await prisma.$transaction(async tx => {
      const changed = await tx.resourceRequest.updateMany({
        where: {
          id: request.id,
          villageId: session.villageId,
          matchedProviderId: session.userId,
          status: expectedStatus,
        },
        data: action === 'ACCEPT'
          ? { status: 'ACCEPTED' }
          : action === 'COMPLETE'
            ? { status: 'COMPLETED' }
            : {
              status: nextCandidate ? 'MATCHED' : 'PENDING',
              matchedProviderId: nextCandidate?.resource.owner.id || null,
              resourceId: nextCandidate?.resource.id || null,
              matchScore: nextCandidate?.totalScore || null,
              matchReason: JSON.stringify({
                ...nextMetadata,
                breakdown: nextCandidate?.breakdown || null,
              }),
            },
      });
      if (!changed.count) return null;

      const result = await tx.resourceRequest.findUniqueOrThrow({
        where: { id: request.id },
        include: { resource: true, matchedProvider: true },
      });

      if (action === 'ACCEPT' || action === 'COMPLETE') {
        await tx.notification.create({
          data: {
            villageId: request.villageId,
            recipientId: request.requesterId,
            type: 'STATUS_UPDATE',
            title: action === 'ACCEPT' ? 'Resource Request Accepted!' : 'Resource Request Completed',
            message: action === 'ACCEPT'
              ? `Your request for "${request.title}" has been accepted by the provider.`
              : `Your request for "${request.title}" has been marked completed.`,
            link: '/resources',
          },
        });
      } else if (nextCandidate) {
        await tx.notification.create({
          data: {
            villageId: request.villageId,
            recipientId: nextCandidate.resource.owner.id,
            type: 'ASSIGNMENT',
            title: `Resource Request Available: ${request.title}`,
            message: `You are the next compatible provider. Match score: ${nextCandidate.totalScore}%.`,
            link: '/resources',
          },
        });
      }
      return result;
    });

    if (!updated) return NextResponse.json({ error: 'Request changed; refresh and retry' }, { status: 409 });
    sseManager.broadcast('resource_request_updated', {
      villageId: updated.villageId,
      requestId: updated.id,
      status: updated.status,
      providerId: updated.matchedProviderId,
      time: Date.now(),
    });
    return NextResponse.json({
      success: true,
      message: action === 'DECLINE'
        ? nextCandidate ? 'Passed request to the next compatible provider' : 'Request moved to the pending pool'
        : action === 'ACCEPT' ? 'Request accepted' : 'Request marked completed',
      request: updated,
    });
  } catch (error: any) {
    console.error('Error updating resource request:', { name: error?.name, code: error?.code });
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
