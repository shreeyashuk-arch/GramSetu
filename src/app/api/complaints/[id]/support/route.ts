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
      return NextResponse.json({ error: 'Sign in to support a complaint' }, { status: 401 });
    }
    const complaint = await prisma.complaint.findFirst({ where: {
      id: params.id, villageId: session!.villageId, isAnonymous: false,
      moderationStatus: 'APPROVED', isSpam: false,
    } });
    if (!complaint) return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });

    const updated = await prisma.$transaction(async tx => {
    // Check if user already supported
    const existing = await tx.complaintSupporter.findUnique({
      where: {
        complaintId_userId: {
          complaintId: params.id,
          userId,
        },
      },
    });

    if (existing) {
      return complaint;
    }

    await tx.complaintSupporter.create({
      data: {
        complaintId: params.id,
        userId,
      },
    });

    return tx.complaint.update({
      where: { id: params.id },
      data: { supporterCount: { increment: 1 } },
    });
    });

    return NextResponse.json({ success: true, count: updated.supporterCount });
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Already supported; refresh to see the count' }, { status: 409 });
    console.error('Error adding supporter:', { name: error?.name, code: error?.code });
    return NextResponse.json({ error: 'Failed to support complaint' }, { status: 500 });
  }
}
