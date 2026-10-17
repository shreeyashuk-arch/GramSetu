import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { calculatePriority } from '@/lib/priority';
import { detectDuplicate } from '@/lib/duplicate-detector';
import { evaluateSpamAndFake, checkRateLimit, generateAnonymousSaltedHash } from '@/lib/spam-filter';
import { sseManager } from '@/lib/sse';
import { randomBytes } from 'node:crypto';
import { serializeComplaint } from '@/lib/complaint-access';

const ORG_CATEGORY_MAP: Record<string, string> = {
  WATER: 'JAL_SHAKTI',
  ELECTRICITY: 'MSEDCL_ELECTRICITY',
  ROADS: 'PWD_ROADS',
  HEALTH: 'PHC_HEALTH',
  AGRICULTURE: 'KVK_AGRICULTURE',
  TRANSPORT: 'PANCHAYAT',
  EDUCATION: 'PANCHAYAT',
  SANITATION: 'PANCHAYAT',
  WOMEN_SAFETY: 'PANCHAYAT',
  OTHER: 'PANCHAYAT',
};

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUserFromRequest(req);
    const { searchParams } = new URL(req.url);

    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const zoneId = searchParams.get('zoneId');
    const myComplaints = searchParams.get('my') === 'true';
    const moderation = searchParams.get('moderation') === 'true';
    const resolvedOnly = searchParams.get('resolved') === 'true';

    const defaultVillage = session ? null : await prisma.village.findFirst({ orderBy: { createdAt: 'asc' } });
    const villageId = session?.villageId || defaultVillage?.id;
    if (!villageId) return NextResponse.json({ error: 'Village setup required' }, { status: 503 });
    const where: any = { villageId };
    const publicFilter = { isAnonymous: false, moderationStatus: 'APPROVED', isSpam: false };

    if (category) where.category = category;
    if (status) where.status = status;
    if (priority) where.priorityBand = priority;
    if (zoneId) where.zoneId = zoneId;

    if (resolvedOnly) {
      where.status = 'CLOSED';
      where.residentConfirmed = true;
    }

    if (moderation && session?.role !== 'SARPANCH') {
      return NextResponse.json({ error: 'Sarpanch access required' }, { status: 403 });
    }
    if (session?.role === 'SARPANCH') {
      if (moderation) where.moderationStatus = 'FLAGGED';
    } else if (session?.role === 'ORGANIZATION') {
      if (!session.organizationType) return NextResponse.json({ error: 'Department not configured' }, { status: 403 });
      where.assignedOrgType = session.organizationType;
    } else if (session?.role === 'PROVIDER') {
      where.assignedProviderId = session.userId;
    } else if (session?.role === 'RESIDENT') {
      if (myComplaints) where.residentId = session.userId;
      else where.OR = [{ residentId: session.userId }, publicFilter];
    } else Object.assign(where, publicFilter);

    const complaints = await prisma.complaint.findMany({
      where,
      include: {
        zone: true,
        resident: {
          select: { id: true, name: true, phone: true, trustScore: true },
        },
        assignedProvider: {
          select: { id: true, name: true, phone: true },
        },
        _count: {
          select: { supporters: true },
        },
      },
      orderBy: [
        { priorityScore: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 100,
    });

    const sanitized = complaints.map(c => serializeComplaint(session, c)).filter(Boolean);

    return NextResponse.json({ complaints: sanitized });
  } catch (error: any) {
    console.error('Error fetching complaints:', error);
    return NextResponse.json({ error: 'Failed to fetch complaints' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUserFromRequest(req);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid complaint payload' }, { status: 400 });
    }

    const {
      category,
      title,
      description,
      voiceTranscription,
      photoUrl,
      lat,
      lng,
      address,
      urgency = 3,
      peopleAffected = 2,
      vulnerabilities = [],
      timeSensitivity = 3,
      isAnonymous = false,
      proxyFiledBy,
      proxyPhone,
      zoneId,
    } = body;

    if (typeof isAnonymous !== 'boolean') {
      return NextResponse.json({ error: 'Invalid isAnonymous field' }, { status: 400 });
    }
    if (!category || !Object.hasOwn(ORG_CATEGORY_MAP, category)) {
      return NextResponse.json({ error: 'Please select a valid category' }, { status: 400 });
    }
    if (typeof title !== 'string' || title.trim().length < 5 || title.length > 160) {
      return NextResponse.json({ error: 'Problem title must be between 5 and 160 characters' }, { status: 400 });
    }
    if (typeof description !== 'string' || description.trim().length < 10 || description.length > 4000) {
      return NextResponse.json({ error: 'Problem description must be between 10 and 4000 characters' }, { status: 400 });
    }
    if (typeof lat !== 'number' || !Number.isFinite(lat) || Math.abs(lat) > 90 ||
        typeof lng !== 'number' || !Number.isFinite(lng) || Math.abs(lng) > 180) {
      return NextResponse.json({ error: 'Valid location coordinates (lat, lng) are required' }, { status: 400 });
    }
    if (![urgency, peopleAffected, timeSensitivity].every(v => Number.isFinite(Number(v)) && Number(v) >= 1 && Number(v) <= 5) ||
        !Array.isArray(vulnerabilities) || vulnerabilities.some(v => !['elderly', 'pregnant', 'disabled', 'children'].includes(v))) {
      return NextResponse.json({ error: 'Invalid urgency, peopleAffected, or vulnerabilities values' }, { status: 400 });
    }
    if (!isAnonymous && !session) {
      return NextResponse.json({ error: 'Sign in to report, or use confidential anonymous reporting' }, { status: 401 });
    }
    const defaultVillage = session ? null : await prisma.village.findFirst({ orderBy: { createdAt: 'asc' } });
    const villageId = session?.villageId || defaultVillage?.id;
    if (!villageId) return NextResponse.json({ error: 'Village setup required' }, { status: 503 });
    if (zoneId && !(await prisma.zone.findFirst({ where: { id: zoneId, villageId } }))) {
      return NextResponse.json({ error: 'Zone does not belong to this village' }, { status: 400 });
    }

    // Rate Limiting & Abuse Prevention
    const clientIdentifier = req.ip || req.headers.get('x-forwarded-for') || session?.userId || 'anonymous-user';
    const rateLimitHash = generateAnonymousSaltedHash(clientIdentifier);
    if (!checkRateLimit(rateLimitHash, 6, 10)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a few minutes before submitting another report.' },
        { status: 429 }
      );
    }

    // 1. Duplicate Detection Check
    const activeComplaintsInCat = isAnonymous ? [] : await prisma.complaint.findMany({
      where: {
        villageId,
        isAnonymous: false,
        isSpam: false,
        moderationStatus: 'APPROVED',
        category,
        status: { notIn: ['RESOLVED', 'CLOSED', 'REJECTED'] },
      },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        category: true,
        lat: true,
        lng: true,
        photoUrl: true,
        status: true,
      },
    });

    const duplicateCheck = detectDuplicate(
      {
        title,
        description,
        category,
        lat,
        lng,
        photoUrl,
      },
      activeComplaintsInCat
    );

    let parentComplaintId: string | null = null;
    if (duplicateCheck.isDuplicate && duplicateCheck.parentComplaint) {
      parentComplaintId = duplicateCheck.parentComplaint.id;
    }

    // 2. Spam & Fake Check
    const spamCheck = evaluateSpamAndFake({
      title,
      description,
      lat,
      lng,
      userTrustScore: session ? 1.0 : 0.8,
    });

    // 3. Priority Score Engine
    const priority = calculatePriority({
      urgency: Number(urgency),
      peopleAffected: Number(peopleAffected),
      vulnerabilities: Array.isArray(vulnerabilities) ? vulnerabilities : [],
      timeSensitivity: Number(timeSensitivity),
      daysOpen: 0,
      category,
    });

    // Coarse coordinates ~200m grid
    const coarseLat = Math.round(lat * 500) / 500;
    const coarseLng = Math.round(lng * 500) / 500;

    // Random identifiers avoid count-based collisions under concurrent submission.
    const code = `CMP-${new Date().getFullYear()}-${randomBytes(6).toString('hex').toUpperCase()}`;

    // Anonymous tracking code if anonymous
    const anonymousTrackingCode = isAnonymous
      ? `GS-ANON-${randomBytes(16).toString('hex').toUpperCase()}`
      : null;

    // Auto-routing to responsible Org
    const assignedOrgType = ORG_CATEGORY_MAP[category] || 'PANCHAYAT';

    // SLA Calculation: 24h for CRITICAL, 48h for HIGH, 72h for MEDIUM/LOW
    const slaHours = priority.band === 'CRITICAL' ? 24 : priority.band === 'HIGH' ? 48 : 72;
    const slaExpiresAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    const complaint = await prisma.$transaction(async tx => {
    if (parentComplaintId && session && !spamCheck.requiresModeration) {
      const supported = await tx.complaintSupporter.findUnique({
        where: { complaintId_userId: { complaintId: parentComplaintId, userId: session.userId } },
      });
      if (!supported) {
        await tx.complaintSupporter.create({ data: { complaintId: parentComplaintId, userId: session.userId } });
        await tx.complaint.update({ where: { id: parentComplaintId }, data: { supporterCount: { increment: 1 } } });
      }
      return tx.complaint.findUniqueOrThrow({ where: { id: parentComplaintId }, include: { zone: true, resident: true } });
    }
    const created = await tx.complaint.create({
      data: {
        code,
        villageId,
        zoneId: zoneId || null,
        residentId: isAnonymous ? null : session?.userId || null,
        isAnonymous,
        anonymousTrackingCode,
        category,
        title,
        description,
        voiceTranscription: voiceTranscription || null,
        photoUrl: photoUrl || null,
        lat,
        lng,
        coarseLat,
        coarseLng,
        address: address || 'Shivapur Village',
        priorityScore: priority.score,
        priorityBand: priority.band,
        priorityFactors: JSON.stringify(priority.factors),
        status: spamCheck.requiresModeration ? 'SUBMITTED' : 'VERIFIED',
        assignedOrgType,
        slaHours,
        slaExpiresAt,
        parentComplaintId,
        isSpam: spamCheck.isSpam,
        spamReason: spamCheck.moderationReason || null,
        moderationStatus: spamCheck.requiresModeration ? 'FLAGGED' : 'APPROVED',
        proxyFiledBy: isAnonymous ? null : proxyFiledBy || null,
        proxyPhone: isAnonymous ? null : proxyPhone || null,
      },
      include: {
        zone: true,
        resident: true,
      },
    });

    // Audit Log
    await tx.auditLog.create({
      data: {
        complaintId: created.id,
        userId: isAnonymous ? null : session?.userId || null,
        role: isAnonymous ? 'ANONYMOUS' : session!.role,
        action: !isAnonymous && proxyFiledBy ? 'PROXY_FILED' : 'CREATED',
        details: JSON.stringify({
          priorityScore: priority.score,
          priorityBand: priority.band,
          assignedOrgType,
          isDuplicate: duplicateCheck.isDuplicate,
          isSpam: spamCheck.isSpam,
        }),
      },
    });

    // Create Notification
    await tx.notification.create({
      data: {
        villageId,
        targetRole: isAnonymous || assignedOrgType === 'PANCHAYAT' ? 'SARPANCH' : 'ORGANIZATION',
        type: priority.band === 'CRITICAL' ? 'EMERGENCY' : 'ASSIGNMENT',
        title: isAnonymous ? 'New confidential report: authorized review required' : `New Grievance #${code}`,
        message: `Priority: ${priority.band} (${priority.score}/100). Auto-routed to ${assignedOrgType}.`,
        link: `/complaints/track`,
      },
    });
    return created;
    });

    // SSE Broadcast
    sseManager.broadcast('complaint_created', {
      villageId,
      time: Date.now(),
    });

    return NextResponse.json({
      success: true,
      complaint: isAnonymous ? { code, status: complaint.status, priorityBand: complaint.priorityBand } : serializeComplaint(session, complaint),
      duplicateInfo: parentComplaintId && !spamCheck.requiresModeration
        ? {
            parentCode: duplicateCheck.parentComplaint?.code,
            explanation: duplicateCheck.explanation,
          }
        : null,
      trackingCode: anonymousTrackingCode,
      message: parentComplaintId && !spamCheck.requiresModeration
        ? 'Matched existing report. Added as supporter!'
        : 'Complaint submitted and auto-routed successfully.',
    });
  } catch (error: any) {
    console.error('Error creating complaint:', { name: error?.name, code: error?.code });
    return NextResponse.json({ error: 'Failed to submit complaint' }, { status: 500 });
  }
}
