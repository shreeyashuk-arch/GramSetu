import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { rankMatchingResources } from '@/lib/matching';
import { sseManager } from '@/lib/sse';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUserFromRequest(req);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const where: any = {};
    if (category) where.category = category;

    if (session?.role === 'RESIDENT') {
      where.requesterId = session.userId;
    } else if (session?.role === 'PROVIDER') {
      where.OR = [
        { matchedProviderId: session.userId },
        { status: 'PENDING' },
      ];
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

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error('Error fetching resource requests:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUserFromRequest(req);
    const body = await req.json();

    const {
      category,
      title,
      description,
      neededAt,
      durationHours = 4,
      urgency = 'MEDIUM',
      lat = 18.3164,
      lng = 73.8682,
      zoneId,
    } = body;

    if (!category || !title || !description) {
      return NextResponse.json({ error: 'Category, title, and description required' }, { status: 400 });
    }

    const defaultVillage = await prisma.village.findFirst();
    const villageId = session?.villageId || defaultVillage?.id || '';

    // Fetch candidate available resources in village
    const candidateResources = await prisma.resource.findMany({
      where: {
        villageId,
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
        title,
        neededAt: neededAt || new Date(),
        durationHours: Number(durationHours),
        urgency,
        lat: Number(lat),
        lng: Number(lng),
      },
      3
    );

    const topMatch = rankedMatches[0];

    const requesterId = session?.userId || (await prisma.user.findFirst({ where: { role: 'RESIDENT' } }))?.id || '';

    const newRequest = await prisma.resourceRequest.create({
      data: {
        villageId,
        zoneId: zoneId || null,
        requesterId,
        category,
        title,
        description,
        neededAt: neededAt ? new Date(neededAt) : new Date(),
        durationHours: Number(durationHours),
        urgency,
        status: topMatch ? 'MATCHED' : 'PENDING',
        resourceId: topMatch ? topMatch.resource.id : null,
        matchedProviderId: topMatch ? topMatch.resource.owner.id : null,
        matchScore: topMatch ? topMatch.totalScore : null,
        matchReason: topMatch ? JSON.stringify(topMatch.breakdown) : null,
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
          villageId,
          recipientId: topMatch.resource.owner.id,
          type: 'ASSIGNMENT',
          title: `Matched Resource Request: ${title}`,
          message: `Match Score: ${topMatch.totalScore}%. ${topMatch.summaryReason}`,
          link: '/resources',
        },
      });

      sseManager.broadcast('resource_request_matched', {
        requestId: newRequest.id,
        providerId: topMatch.resource.owner.id,
        score: topMatch.totalScore,
        title,
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
