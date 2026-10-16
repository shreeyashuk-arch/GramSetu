import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const trackingCode = params.code.trim();

    const complaint = await prisma.complaint.findFirst({
      where: { anonymousTrackingCode: trackingCode },
      include: {
        zone: true,
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          select: {
            action: true,
            createdAt: true,
            details: true,
          },
        },
      },
    });

    if (!complaint) {
      return NextResponse.json({ error: 'No anonymous report found with this tracking code' }, { status: 404 });
    }

    return NextResponse.json({
      complaint: {
        code: complaint.code,
        category: complaint.category,
        title: complaint.title,
        status: complaint.status,
        priorityBand: complaint.priorityBand,
        createdAt: complaint.createdAt,
        updatedAt: complaint.updatedAt,
        proofPhotoUrl: complaint.proofPhotoUrl,
        timeline: complaint.auditLogs,
      },
    });
  } catch (error: any) {
    console.error('Error tracking anonymous grievance:', error);
    return NextResponse.json({ error: 'Failed to look up code' }, { status: 500 });
  }
}
