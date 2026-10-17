import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { rankMatchingResources, isResourceCategory, isResourceLocation } from '@/lib/matching';
import { sseManager } from '@/lib/sse';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUserFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    if (category && !isResourceCategory(category)) {
      return NextResponse.json({ error: 'Invalid resource category' }, { status: 400 });
    }

    const where: any = { villageId: session.villageId };
    if (category) where.category = category;

    if (session?.role === 'RESIDENT') {
      where.requesterId = session.userId;
    } else if (session?.role === 'PROVIDER') {
      where.matchedProviderId = session.userId;
    } else if (session?.role !== 'SARPANCH') {
      return NextResponse.json({ error: 'Not authorized to view requests' }, { status: 403 });
    }

    const requests = await prisma.resourceRequest.findMany({
      where,
      include: {
        requester: { select: { id: true, name: true, phone: true } },
        matchedProvider: { select: { id: true, name: true, phone: true } },
        resource: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      requests: requests.map(request => ({
        ...request,
        requester: session.role === 'RESIDENT' && request.requesterId === session.userId
          ? request.requester
          : request.requester ? { id: request.requester.id, name: request.requester.name } : null,
        matchedProvider: session.role === 'PROVIDER' && request.matchedProviderId === session.userId
          ? request.matchedProvider
          : request.matchedProvider ? { id: request.matchedProvider.id, name: request.matchedProvider.name } : null,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching resource requests:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUserFromRequest(req);
    if (!session || !['RESIDENT', 'SARPANCH'].includes(session.role)) {
      return NextResponse.json({ error: 'Resident authentication required' }, { status: 401 });
    }
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'A JSON object is required' }, { status: 400 });
    }

    const {
      category,
      title,
      description,
      neededAt,
      durationHours = 4,
      urgency = 'MEDIUM',
       lat,
       lng,
      zoneId,
    } = body;

    if (!isResourceCategory(category) || typeof title !== 'string' || title.trim().length < 5 || title.length > 200 ||
        typeof description !== 'string' || description.trim().length < 10 || description.length > 5000 ||
        !['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'].includes(urgency) ||
        !Number.isInteger(Number(durationHours)) || Number(durationHours) < 1 || Number(durationHours) > 168) {
      return NextResponse.json({ error: 'Category, title, and description required' }, { status: 400 });
    }

    const village = await prisma.village.findUnique({ where: { id: session.villageId } });
    if (!village) return NextResponse.json({ error: 'Village setup required' }, { status: 503 });
    const requestLat = lat === undefined ? village.lat : Number(lat);
    const requestLng = lng === undefined ? village.lng : Number(lng);
    const requestedDate = neededAt === undefined ? new Date() : new Date(neededAt);
    if (Number.isNaN(requestedDate.getTime())) {
      return NextResponse.json({ error: 'neededAt must be a valid date' }, { status: 400 });
    }
    if (!isResourceLocation(requestLat, requestLng)) {
      return NextResponse.json({ error: 'Valid request coordinates are required' }, { status: 400 });
    }
    if (zoneId && !(await prisma.zone.findFirst({ where: { id: zoneId, villageId: session.villageId } }))) {
      return NextResponse.json({ error: 'Zone does not belong to this village' }, { status: 400 });
    }

    // Fetch candidate available resources in village
    const candidateResources = await prisma.resource.findMany({
      where: {
        villageId: session.villageId,
        category,
        isAvailable: true,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            trustScore: true,
            providerCategory: true,
            isVerified: true,
          },
        },
      },
    });

    // Run transparent matching score engine
    const rankedMatches = rankMatchingResources(
      candidateResources as any,
      {
        category,
        title: title.trim(),
        neededAt: requestedDate,
        durationHours: Number(durationHours),
        urgency,
        lat: requestLat,
        lng: requestLng,
      },
      3
    );

    const topMatch = rankedMatches[0];

    const newRequest = await prisma.resourceRequest.create({
      data: {
        villageId: session.villageId,
        zoneId: zoneId || null,
        requesterId: session.userId,
        category,
        title: title.trim(),
        description: description.trim(),
        neededAt: requestedDate,
        durationHours: Number(durationHours),
        urgency,
        status: topMatch ? 'MATCHED' : 'PENDING',
        resourceId: topMatch ? topMatch.resource.id : null,
        matchedProviderId: topMatch ? topMatch.resource.owner.id : null,
        matchScore: topMatch ? topMatch.totalScore : null,
        matchReason: JSON.stringify({
          version: 1,
          location: { lat: requestLat, lng: requestLng },
          declinedProviderIds: [],
          breakdown: topMatch?.breakdown || null,
        }),
      },
      include: {
        resource: true,
        matchedProvider: true,
      },
    });

    // Notify matched provider
    if (topMatch) {
      await prisma.notification.create({
        data: {
          villageId: session.villageId,
          recipientId: topMatch.resource.owner.id,
          type: 'ASSIGNMENT',
          title: `Matched Resource Request: ${title.trim()}`,
          message: `Match Score: ${topMatch.totalScore}%. ${topMatch.summaryReason}`,
          link: '/resources',
        },
      });

      sseManager.broadcast('resource_request_matched', {
        requestId: newRequest.id,
        providerId: topMatch.resource.owner.id,
        score: topMatch.totalScore,
        title: title.trim(),
      });
    }

    return NextResponse.json({
      success: true,
      request: newRequest,
      topMatches: rankedMatches,
    });
  } catch (error: any) {
    console.error('Error creating resource request:', error);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
