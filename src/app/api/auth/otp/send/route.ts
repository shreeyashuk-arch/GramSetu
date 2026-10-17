import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomInt } from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (typeof phone !== 'string' || !/^\d{10}$/.test(phone)) {
      return NextResponse.json({ error: 'Valid 10-digit mobile number required' }, { status: 400 });
    }
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
      return NextResponse.json({ error: 'OTP delivery is not configured for this deployment' }, { status: 503 });
    }

    // Generate 6-digit OTP
    const code = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store in DB
    await prisma.oTP.deleteMany({ where: { phone } });
    await prisma.oTP.create({
      data: {
        phone,
        code,
        expiresAt,
      },
    });

    // Local demo mode deliberately displays the code; production delivery needs
    // a real SMS provider rather than silently pretending an SMS was sent.
    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      demoOtp: code,
    });
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
