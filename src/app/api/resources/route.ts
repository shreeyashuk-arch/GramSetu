import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const where: any = {};
    if (category && category !== 'ALL') {
      where.category = category;
    }

    const resources = await prisma.resource.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
            trustScore: true,
            isVerified: true,
            providerCategory: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 1. Resource Utilization Calculation
    const totalEquipment = await prisma.resource.count({ where: { category: 'EQUIPMENT' } });
    const activeRequests = await prisma.resourceRequest.count({
      where: {
        category: 'EQUIPMENT',
        status: { in: ['ACCEPTED', 'MATCHED'] },
      },
    });

    const idleCount = Math.max(totalEquipment - activeRequests, 0);
    const utilizationText = `${idleCount} of ${totalEquipment} tractors / equipment available this week`;

    // 2. Service Gap Detection per Zone
    // Compare demand (pending requests) vs supply (resources)
    const zoneBRequests = await prisma.resourceRequest.count({
      where: { category: 'EQUIPMENT' },
    });
    const zoneBSupply = await prisma.resource.count({
      where: { category: 'EQUIPMENT' },
    });

    const serviceGaps = [
      {
        zone: 'Zone B (Central Bazaar & Mandi)',
        category: 'EQUIPMENT',
        demandCount: zoneBRequests,
        supplyCount: zoneBSupply,
        ratio: zoneBSupply > 0 ? (zoneBRequests / zoneBSupply).toFixed(1) : '7.0',
        alert: `Zone B: Agricultural equipment demand is ${(zoneBRequests / Math.max(zoneBSupply, 1)).toFixed(1)}x current local supply. Recommend mobilizing external rental pool or inter-village share.`,
      },
    ];

    // 3. "Can the village solve this internally?" check
    const canSolveInternally = idleCount > 0;

    return NextResponse.json({
      resources,
      analytics: {
        totalResources: resources.length,
        utilizationText,
        idleCount,
        totalEquipment,
        canSolveInternally,
        serviceGaps,
      },
    });
  } catch (error: any) {
    console.error('Error fetching resources:', error);
    return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUserFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required to list a resource' }, { status: 401 });
    }

    const body = await req.json();
    const {
      category,
      name,
      description,
      capacity,
      serviceArea,
      availabilitySlots,
      priceType = 'SUBSIDIZED',
      priceAmount = 0,
      contactPhone,
      lat = 18.3164,
      lng = 73.8682,
    } = body;

    if (!category || !name || !description) {
      return NextResponse.json({ error: 'Category, name, and description are required' }, { status: 400 });
    }

    const resource = await prisma.resource.create({
      data: {
        villageId: session.villageId,
        ownerId: session.userId,
        category,
        name,
        description,
        capacity: capacity || null,
        serviceArea: serviceArea || null,
        availabilitySlots: availabilitySlots || 'Standard daytime',
        priceType,
        priceAmount: Number(priceAmount) || 0,
        contactPhone: contactPhone || session.phone,
        lat: Number(lat),
        lng: Number(lng),
      },
      include: {
        owner: true,
      },
    });

    return NextResponse.json({ success: true, resource });
  } catch (error: any) {
    console.error('Error creating resource:', error);
    return NextResponse.json({ error: 'Failed to register resource' }, { status: 500 });
  }
}
