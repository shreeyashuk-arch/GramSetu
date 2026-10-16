import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { sseManager } from '@/lib/sse';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const lang = searchParams.get('lang') || 'en';

    const where: any = {};
    if (type && type !== 'ALL') {
      where.type = type;
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        author: { select: { name: true, role: true } },
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 50,
    });

    // Apply i18n translation fallback
    const localizedPosts = posts.map((post) => {
      let localizedTitle = post.title;
      let localizedBody = post.body;

      if (post.translations) {
        try {
          const trans = JSON.parse(post.translations);
          if (trans[lang]) {
            localizedTitle = trans[lang].title || localizedTitle;
            localizedBody = trans[lang].body || localizedBody;
          }
        } catch {}
      }

      return {
        ...post,
        displayTitle: localizedTitle,
        displayBody: localizedBody,
      };
    });

    return NextResponse.json({ posts: localizedPosts });
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch board posts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUserFromRequest(req);

    // Only Sarpanch can create posts
    if (!session || session.role !== 'SARPANCH') {
      return NextResponse.json({ error: 'Unauthorized: Only Sarpanch can publish notices' }, { status: 403 });
    }

    const body = await req.json();
    const { type, title, body: content, image, isPinned = false, targetZone, expiresAt, translations } = body;

    if (!title || !content || !type) {
      return NextResponse.json({ error: 'Type, title, and body are required' }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        villageId: session.villageId,
        authorId: session.userId,
        type,
        title,
        body: content,
        image: image || null,
        isPinned: Boolean(isPinned),
        targetZone: targetZone || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        translations: translations ? JSON.stringify(translations) : null,
      },
      include: {
        author: { select: { name: true, role: true } },
      },
    });

    // Create Notification for all residents
    await prisma.notification.create({
      data: {
        villageId: session.villageId,
        targetRole: 'ALL',
        type: type === 'EMERGENCY' ? 'EMERGENCY' : 'POST',
        title: `${type === 'EMERGENCY' ? '🚨 EMERGENCY: ' : '📢 '}${title}`,
        message: content.substring(0, 120),
        link: '/village-board',
      },
    });

    // SSE Broadcast
    sseManager.broadcast('post_created', {
      id: post.id,
      type: post.type,
      title: post.title,
      isEmergency: post.type === 'EMERGENCY',
      time: Date.now(),
    });

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    console.error('Error publishing post:', error);
    return NextResponse.json({ error: 'Failed to publish post' }, { status: 500 });
  }
}
