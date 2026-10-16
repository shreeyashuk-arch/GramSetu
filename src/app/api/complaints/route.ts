import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { calculatePriority } from '@/lib/priority';
import { detectDuplicate } from '@/lib/duplicate-detector';
import { evaluateSpamAndFake, checkRateLimit, generateAnonymousSaltedHash } from '@/lib/spam-filter';
import { sseManager } from '@/lib/sse';

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

    const where: any = {};

    // By default get Shivapur village or user's village
    if (session?.villageId) {
      where.villageId = session.villageId;
    }

    if (category) where.category = category;
    if (status) where.status = status;
    if (priority) where.priorityBand = priority;
    if (zoneId) where.zoneId = zoneId;

    if (resolvedOnly) {
      where.status = 'RESOLVED';
    }

    // Role-based Segregation
    if (session) {
      if (myComplaints && session.role === 'RESIDENT') {
        where.residentId = session.userId;
      } else if (session.role === 'ORGANIZATION') {
        // Organization sees complaints mapped to its organizationType
        if (session.organizationType) {
          where.assignedOrgType = session.organizationType;
        }
      } else if (session.role === 'PROVIDER') {
        // Providers see assigned or unassigned in their category/zone
        where.OR = [
          { assignedProviderId: session.userId },
          { status: 'VERIFIED' },
        ];
      } else if (session.role === 'SARPANCH') {
        // Sarpanch can see everything
        if (moderation) {
          where.moderationStatus = 'FLAGGED';
        }
      }
    } else {
      // Unauthenticated public view: approved non-spam items only
      where.moderationStatus = 'APPROVED';
      where.isSpam = false;
    }

    // Check SLA Escalation automatically on read
    const now = new Date();
    await prisma.complaint.updateMany({
      where: {
        slaExpiresAt: { lt: now },
        status: { in: ['SUBMITTED', 'VERIFIED', 'ASSIGNED'] },
        escalationLevel: 0,
      },
      data: {
        status: 'ESCALATED',
        escalationLevel: 1,
      },
    });

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

    // PII Masking for public or resident peers: mask names & use coarse coordinates unless Sarpanch or Assigned Org
    const sanitized = complaints.map((c) => {
      const isPrivileged =
        session?.role === 'SARPANCH' ||
        (session?.role === 'ORGANIZATION' && session.organizationType === c.assignedOrgType) ||
        (session?.role === 'RESIDENT' && session.userId === c.residentId);

      return {
        ...c,
        lat: isPrivileged ? c.lat : c.coarseLat,
        lng: isPrivileged ? c.lng : c.coarseLng,
        resident: isPrivileged
          ? c.resident
          : c.resident
          ? { id: c.resident.id, name: `${c.resident.name[0]}*** (Villager)` }
          : null,
      };
    });

    return NextResponse.json({ complaints: sanitized });
  } catch (error: any) {
    console.error('Error fetching complaints:', error);
    return NextResponse.json({ error: 'Failed to fetch complaints' }, { status: 500 });
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

    if (!category || !title || !description || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Missing required fields (category, title, description, location)' }, { status: 400 });
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
    const activeComplaintsInCat = await prisma.complaint.findMany({
      where: {
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
      // Increment supporter count on parent
      await prisma.complaint.update({
        where: { id: parentComplaintId },
        data: { supporterCount: { increment: 1 } },
      });
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

    // Unique Code generator
    const count = await prisma.complaint.count();
    const code = `CMP-2026-${String(count + 1).padStart(3, '0')}`;

    // Anonymous tracking code if anonymous
    const anonymousTrackingCode = isAnonymous
      ? `GS-ANON-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`
      : null;

    // Auto-routing to responsible Org
    const assignedOrgType = ORG_CATEGORY_MAP[category] || 'PANCHAYAT';

    // SLA Calculation: 24h for CRITICAL, 48h for HIGH, 72h for MEDIUM/LOW
    const slaHours = priority.band === 'CRITICAL' ? 24 : priority.band === 'HIGH' ? 48 : 72;
    const slaExpiresAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    const defaultVillage = await prisma.village.findFirst();
    const villageId = session?.villageId || defaultVillage?.id || '';

    const complaint = await prisma.complaint.create({
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
        proxyFiledBy: proxyFiledBy || null,
        proxyPhone: proxyPhone || null,
      },
      include: {
        zone: true,
        resident: true,
      },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        complaintId: complaint.id,
        userId: session?.userId || null,
        role: session?.role || (isAnonymous ? 'ANONYMOUS' : 'RESIDENT'),
        action: proxyFiledBy ? 'PROXY_FILED' : 'CREATED',
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
    await prisma.notification.create({
      data: {
        villageId,
        targetRole: assignedOrgType === 'PANCHAYAT' ? 'SARPANCH' : 'ORGANIZATION',
        type: priority.band === 'CRITICAL' ? 'EMERGENCY' : 'ASSIGNMENT',
        title: `New Grievance #${code}: ${title.substring(0, 40)}`,
        message: `Priority: ${priority.band} (${priority.score}/100). Auto-routed to ${assignedOrgType}.`,
        link: `/complaints/track`,
      },
    });

    // SSE Broadcast
    sseManager.broadcast('complaint_created', {
      id: complaint.id,
      code: complaint.code,
      title: complaint.title,
      category: complaint.category,
      priorityBand: complaint.priorityBand,
      assignedOrgType: complaint.assignedOrgType,
      time: Date.now(),
    });

    return NextResponse.json({
      success: true,
      complaint,
      duplicateInfo: duplicateCheck.isDuplicate
        ? {
            parentCode: duplicateCheck.parentComplaint?.code,
            explanation: duplicateCheck.explanation,
          }
        : null,
      trackingCode: anonymousTrackingCode,
      message: duplicateCheck.isDuplicate
        ? 'Matched existing report. Added as supporter!'
        : 'Complaint submitted and auto-routed successfully.',
    });
  } catch (error: any) {
    console.error('Error creating complaint:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit complaint' }, { status: 500 });
  }
}
