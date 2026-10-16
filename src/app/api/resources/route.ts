import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { isResourceCategory, isResourceLocation } from '@/lib/matching';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    if (category !== null && category !== 'ALL' && !isResourceCategory(category)) {
      return NextResponse.json({ error: 'Invalid resource category' }, { status: 400 });
    }
    const session = await getSessionUserFromRequest(req);
    const village = await prisma.village.findFirst({
      where: session ? { id: session.villageId } : {},
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    if (!village) return NextResponse.json({ error: 'No village available' }, { status: 404 });
    const villageId = village.id;
    const where = { villageId, ...(category && category !== 'ALL' ? { category } : {}) };

    const resources = await prisma.resource.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            trustScore: true,
            isVerified: true,
            providerCategory: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 1. Resource Utilization Calculation
    const equipmentWhere = { villageId, category: 'EQUIPMENT' };
    const totalEquipment = await prisma.resource.count({ where: equipmentWhere });
    const idleCount = await prisma.resource.count({
      where: {
        ...equipmentWhere,
        isAvailable: true,
        requests: { none: { status: { in: ['ACCEPTED', 'MATCHED'] } } },
      },
    });
    const utilizationText = `${idleCount} of ${totalEquipment} tractors / equipment available this week`;

    // 2. Service Gap Detection per Zone
    // Compare demand (pending requests) vs supply (resources)
    const demandCount = await prisma.resourceRequest.count({
      where: { ...equipmentWhere, status: { in: ['PENDING', 'MATCHED', 'ACCEPTED'] } },
    });
    const supplyCount = await prisma.resource.count({
      where: { ...equipmentWhere, isAvailable: true },
    });

    const serviceGaps = [
      {
        zone: 'Village',
        category: 'EQUIPMENT',
        demandCount,
        supplyCount,
        ratio: supplyCount > 0 ? (demandCount / supplyCount).toFixed(1) : null,
        alert: supplyCount > 0
          ? `Village: ${demandCount} active equipment requests for ${supplyCount} available listings (${(demandCount / supplyCount).toFixed(1)}x supply).`
          : 'Village: No equipment supply is currently available.',
      },
    ];

    // 3. "Can the village solve this internally?" check
    const canSolveInternally = idleCount > 0;

    return NextResponse.json({
      resources: session ? resources : resources.map(resource => ({
        id: resource.id, category: resource.category, name: resource.name,
        description: resource.description, capacity: resource.capacity,
        serviceArea: resource.serviceArea, availabilitySlots: resource.availabilitySlots,
        priceType: resource.priceType, priceAmount: resource.priceAmount,
        isAvailable: resource.isAvailable,
        lat: Math.round(resource.lat * 500) / 500,
        lng: Math.round(resource.lng * 500) / 500,
        owner: { isVerified: resource.owner.isVerified },
      })),
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
    if (session.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Only providers can list resources' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'A JSON object is required' }, { status: 400 });
    }
    const village = await prisma.village.findUniqueOrThrow({ where: { id: session.villageId } });
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
      lat = village.lat,
      lng = village.lng,
    } = body;

    if (!isResourceCategory(category) || typeof name !== 'string' || !name.trim() || name.length > 200 ||
        typeof description !== 'string' || !description.trim() || description.length > 5000) {
      return NextResponse.json({ error: 'A valid category, name (up to 200 characters), and description (up to 5000 characters) are required' }, { status: 400 });
    }
    if (!isResourceLocation(lat, lng) || !['FREE', 'SUBSIDIZED', 'COMMERCIAL'].includes(priceType) ||
        typeof priceAmount !== 'number' || !Number.isFinite(priceAmount) || priceAmount < 0 ||
        [capacity, serviceArea, availabilitySlots].some(value => value != null && (typeof value !== 'string' || value.length > 500)) ||
        (contactPhone !== undefined && (typeof contactPhone !== 'string' || !/^\+?[0-9 ()-]{3,25}$/.test(contactPhone)))) {
      return NextResponse.json({ error: 'Invalid location, price, contact phone, or listing details' }, { status: 400 });
    }

    const resource = await prisma.resource.create({
      data: {
        villageId: session.villageId,
        ownerId: session.userId,
        category,
        name: name.trim(),
        description: description.trim(),
        capacity: capacity || null,
        serviceArea: serviceArea || null,
        availabilitySlots: availabilitySlots || 'Standard daytime',
        priceType,
        priceAmount: priceType === 'FREE' ? 0 : priceAmount,
        contactPhone: contactPhone || session.phone,
        lat,
        lng,
      },
      include: {
        owner: { select: { id: true, name: true, trustScore: true, isVerified: true, providerCategory: true } },
      },
    });

    return NextResponse.json({ success: true, resource });
  } catch (error: any) {
    console.error('Error creating resource:', error);
    return NextResponse.json({ error: 'Failed to register resource' }, { status: 500 });
  }
}
