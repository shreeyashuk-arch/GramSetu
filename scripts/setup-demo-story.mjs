/**
 * scripts/setup-demo-story.mjs
 *
 * Idempotently adds demo-story records to a populated GramSetu database.
 * Safe to run multiple times — uses upsert / skip-if-exists patterns.
 * Never resets or deletes any data.
 *
 * Run after setup-demo.mjs:
 *   node.exe scripts/setup-demo-story.mjs
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));

const { loadEnvConfig } = require('@next/env');
loadEnvConfig(root, true);

if (!process.env.DATABASE_URL?.startsWith('file:')) {
  throw new Error('DATABASE_URL must point to a SQLite file. Run npm run demo:setup first.');
}

// Dynamic import so Prisma resolves the generated client path after setup.
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

try {
  // ── 1. Find the village (Shivapur) ───────────────────────────────────────
  const village = await prisma.village.findFirst({ where: { name: 'Shivapur' } });
  if (!village) {
    console.log('No Shivapur village found. Run npm run demo:setup first.');
    process.exit(0);
  }

  // ── 2. Locate key demo accounts ──────────────────────────────────────────
  const resident = await prisma.user.findFirst({
    where: { phone: '9876543250', villageId: village.id }, // Ananda Jadhav (demo resident)
  });
  const ambulanceDriver = await prisma.user.findFirst({
    where: { phone: '9876543235', villageId: village.id }, // Mahesh Shinde – ambulance
  });
  const ambulanceResource = await prisma.resource.findFirst({
    where: { villageId: village.id, category: 'VEHICLES', name: { contains: 'Ambulance' } },
  });

  if (!resident || !ambulanceDriver || !ambulanceResource) {
    console.log('Key accounts not found. Run npm run demo:setup to seed first.');
    process.exit(0);
  }

  const zone = await prisma.zone.findFirst({ where: { villageId: village.id, code: 'ZB' } });

  // ── 3. Demo Complaint: IN_PROGRESS with photo, ready for proof upload ────
  const existingDemoComplaint = await prisma.complaint.findFirst({
    where: { villageId: village.id, code: 'DEMO-CMP-001' },
  });

  if (!existingDemoComplaint) {
    await prisma.complaint.create({
      data: {
        code: 'DEMO-CMP-001',
        villageId: village.id,
        zoneId: zone?.id ?? (await prisma.zone.findFirst({ where: { villageId: village.id } })).id,
        residentId: resident.id,
        category: 'WATER',
        title: 'DEMO: Main drinking-water pipe burst near school gate',
        description:
          'Underground pipeline has cracked. Brown water flowing onto school road. 200+ households affected since morning. This is the DEMO complaint — upload proof to continue.',
        photoUrl: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600',
        lat: 18.3168,
        lng: 73.8681,
        coarseLat: 18.317,
        coarseLng: 73.868,
        address: 'Near Z.P. School Gate, Zone B, Shivapur',
        priorityScore: 88,
        priorityBand: 'CRITICAL',
        priorityFactors: JSON.stringify({
          urgency: 5,
          peopleAffected: 4,
          vulnerabilities: ['children', 'elderly'],
          timeSensitivity: 5,
          explanation:
            'Severe hazard 5/5 • Affects 200+ villagers • Vulnerable groups: children, elderly • Open 1 day',
        }),
        status: 'IN_PROGRESS',
        assignedOrgType: 'JAL_SHAKTI',
        supporterCount: 12,
        slaHours: 24,
        createdAt: new Date(Date.now() - 86400 * 1000),
      },
    });
    console.log('✅ Created DEMO-CMP-001 (water complaint, IN_PROGRESS, ready for proof upload)');
  } else {
    console.log('ℹ️  DEMO-CMP-001 already exists — skipping');
  }

  // ── 4. Demo Resource Request: ambulance PENDING, ready to match ──────────
  const existingDemoRequest = await prisma.resourceRequest.findFirst({
    where: { villageId: village.id, title: { contains: 'DEMO:' } },
  });

  if (!existingDemoRequest) {
    await prisma.resourceRequest.create({
      data: {
        villageId: village.id,
        zoneId: zone?.id ?? (await prisma.zone.findFirst({ where: { villageId: village.id } }))!.id,
        requesterId: resident.id,
        category: 'VEHICLES',
        title: 'DEMO: Emergency ambulance needed for elderly patient (chest pain)',
        description:
          'Elderly resident collapsed at Zone B temple steps with severe chest pain. Needs immediate ambulance dispatch to PHC / Shirwal hospital. This is the DEMO request — accept it as Mahesh (ambulance driver) to show matching.',
        neededAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        durationHours: 4,
        urgency: 'HIGH',
        status: 'PENDING',
        matchedProviderId: null,
      },
    });
    console.log('✅ Created DEMO ambulance resource request (PENDING, ready to match → accept)');
  } else {
    console.log('ℹ️  DEMO ambulance request already exists — skipping');
  }

  console.log('\n🎬 Demo story data is ready. Suggested walkthrough order:');
  console.log('   1. Login as Resident (9876543250) → view DEMO-CMP-001 on track page');
  console.log('   2. Switch to Org (Jal Shakti 9876543220) → upload proof for DEMO-CMP-001');
  console.log('   3. Switch back to Resident → confirm resolution, rate 5 stars');
  console.log('   4. Switch to Provider (Mahesh 9876543235) → accept the DEMO ambulance request');
  console.log('   5. Show language switch (header selector: English → मराठी → हिन्दी)');
  console.log('   6. Open /how-it-works to show the diagram slide');
  console.log('   7. Open /analytics for Service Health Index');
} finally {
  await prisma.$disconnect();
}
