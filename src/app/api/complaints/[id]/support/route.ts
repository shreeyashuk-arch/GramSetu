import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUserFromRequest(req);
    const userId = session?.userId;

    if (!userId) {
      // Allow anonymous supporter increment if unauthenticated
      const updated = await prisma.complaint.update({
        where: { id: params.id },
        data: { supporterCount: { increment: 1 } },
      });
      return NextResponse.json({ success: true, count: updated.supporterCount });
    }

    // Check if user already supported
    const existing = await prisma.complaintSupporter.findUnique({
      where: {
        complaintId_userId: {
          complaintId: params.id,
          userId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ message: 'Already supported this grievance' });
    }

    await prisma.complaintSupporter.create({
      data: {
        complaintId: params.id,
        userId,
      },
    });

    const updated = await prisma.complaint.update({
      where: { id: params.id },
      data: { supporterCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true, count: updated.supporterCount });
  } catch (error: any) {
    console.error('Error adding supporter:', error);
    return NextResponse.json({ error: 'Failed to support complaint' }, { status: 500 });
  }
}
