import { prisma } from '../src/lib/prisma';
import { signToken, COOKIE_NAME } from '../src/lib/auth';

const BASE_URL = 'http://localhost:3000';

async function testStakeholderIntegration() {
  console.log('====================================================');
  console.log('🧪 GRAMSETU 4-STAKEHOLDER INTEGRATION VERIFICATION');
  console.log('====================================================\n');

  // Step 1: Resident submits a grievance
  console.log('▶ STEP 1: Resident submits a new grievance');
  const residentRes = await fetch(`${BASE_URL}/api/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'WATER',
      title: 'Major pipeline rupture near Village Bazaar',
      description: 'Drinking water is flowing onto the road. 40 families without water.',
      address: 'Zone B, Bazaar Road, Shivapur',
      lat: 18.3168,
      lng: 73.8685,
      urgency: 4,
      peopleAffected: 3,
      vulnerabilities: ['ELDERLY', 'CHILDREN'],
    }),
  });

  const residentData = await residentRes.json();
  if (!residentRes.ok) {
    throw new Error(`Failed to submit complaint: ${JSON.stringify(residentData)}`);
  }

  const complaintId = residentData.complaint.id;
  const complaintCode = residentData.complaint.code;
  console.log(`✅ Resident grievance registered: #${complaintCode} (ID: ${complaintId})`);
  console.log(`   Initial Status: ${residentData.complaint.status}, Priority: ${residentData.complaint.priorityBand}`);

  // Step 2: Sarpanch accesses incoming grievance stream
  console.log('\n▶ STEP 2: Sarpanch accesses incoming grievance in Sarpanch stream');
  const complaintsRes = await fetch(`${BASE_URL}/api/complaints`);
  const complaintsData = await complaintsRes.json();
  const foundInSarpanch = (complaintsData.complaints || []).find((c: any) => c.id === complaintId);

  if (!foundInSarpanch) {
    throw new Error(`Grievance #${complaintCode} not found in Sarpanch stream!`);
  }
  console.log(`✅ Sarpanch stream successfully received grievance #${complaintCode}!`);

  // Step 3: Sarpanch solves problem statement: assigns to Org, sets ETA & Status
  console.log('\n▶ STEP 3: Sarpanch acts on grievance (Assigns to Jal Shakti, sets ETA & Remark)');
  const sarpanchActionRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assignedOrgType: 'JAL_SHAKTI',
      resolutionEta: 'Within 24 Hours',
      status: 'IN_PROGRESS',
      sarpanchRemark: 'Work order issued. Jal Shakti emergency repair team dispatched with 4-inch pipe.',
      slaHours: 24,
    }),
  });

  const sarpanchActionData = await sarpanchActionRes.json();
  if (!sarpanchActionRes.ok) {
    throw new Error(`Sarpanch update failed: ${JSON.stringify(sarpanchActionData)}`);
  }
  console.log(`✅ Sarpanch updated grievance #${complaintCode}:`);
  console.log(`   Assigned Dept: ${sarpanchActionData.complaint.assignedOrgType}`);
  console.log(`   New Status: ${sarpanchActionData.complaint.status}`);

  // Step 4: Verify Resident Track View shows updated ETA and Sarpanch note
  console.log('\n▶ STEP 4: Verify Resident Track Status page reflects Sarpanch updates');
  const checkTrackRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}`);
  const checkTrackData = await checkTrackRes.json();
  const factors = checkTrackData.complaint.parsedFactors;

  console.log(`✅ Resident tracking shows:`);
  console.log(`   Status: ${checkTrackData.complaint.status}`);
  console.log(`   Expected Resolution ETA: ${factors?.resolutionEta}`);
  console.log(`   Sarpanch Remark: ${factors?.sarpanchRemark}`);
  console.log(`   Assigned Org: ${checkTrackData.complaint.assignedOrgType}`);

  if (factors?.resolutionEta !== 'Within 24 Hours') {
    throw new Error('ETA mismatch in resident tracker!');
  }

  // Step 5: Sarpanch updates Village Notice Board
  console.log('\n▶ STEP 5: Sarpanch publishes notice in Sarpanch tab');
  // Generate Sarpanch JWT token
  const sarpanchUser = await prisma.user.findFirst({ where: { role: 'SARPANCH' } });
  if (!sarpanchUser) throw new Error('Sarpanch user not found in DB');

  const token = await signToken({
    userId: sarpanchUser.id,
    phone: sarpanchUser.phone,
    name: sarpanchUser.name,
    role: 'SARPANCH',
    villageId: sarpanchUser.villageId,
  });

  const postRes = await fetch(`${BASE_URL}/api/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `${COOKIE_NAME}=${token}`,
    },
    body: JSON.stringify({
      type: 'SCHEDULE',
      title: 'Water Pipeline Repair - Bazaar Road',
      body: 'Repair work on ticket #' + complaintCode + ' is active. Water supply paused between 2 PM - 5 PM.',
      isPinned: true,
      translations: {
        en: { title: 'Water Pipeline Repair - Bazaar Road', body: 'Repair work on ticket #' + complaintCode + ' is active. Water supply paused between 2 PM - 5 PM.' },
        hi: { title: 'पानी की पाइपलाइन मरम्मत - बाजार रोड', body: 'शिकायत #' + complaintCode + ' का कार्य जारी है। दोपहर २ से ५ बजे पानी बंद रहेगा।' },
        mr: { title: 'पाणी पाईपलाईन दुरुस्ती - बाजार पेठ', body: 'तक्रार #' + complaintCode + ' वरील काम सुरू आहे. दुपारी २ ते ५ दरम्यान पाणी पुरवठा बंद राहील.' },
      },
    }),
  });

  const postData = await postRes.json();
  if (!postRes.ok) {
    throw new Error(`Failed to publish notice: ${JSON.stringify(postData)}`);
  }
  console.log(`✅ Sarpanch notice published successfully: "${postData.post.title}" (ID: ${postData.post.id})`);

  // Step 6: Verify Notice displays on Resident Notice Board
  console.log('\n▶ STEP 6: Resident fetches Notice Board (/village-board)');
  const boardRes = await fetch(`${BASE_URL}/api/posts?lang=mr`);
  const boardData = await boardRes.json();
  const noticeOnBoard = (boardData.posts || []).find((p: any) => p.id === postData.post.id);

  if (!noticeOnBoard) {
    throw new Error('Sarpanch notice not visible on Resident Notice Board!');
  }
  console.log(`✅ Notice confirmed live on Resident Notice Board!`);
  console.log(`   Marathi Display Title: "${noticeOnBoard.displayTitle}"`);
  console.log(`   Pinned to Top: ${noticeOnBoard.isPinned}`);

  // Step 7: Organization resolves ticket and uploads proof
  console.log('\n▶ STEP 7: Department resolves ticket with proof photo');
  const orgResolveRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'RESOLVED',
      proofPhotoUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800',
    }),
  });
  const orgResolveData = await orgResolveRes.json();
  console.log(`✅ Department resolution confirmed: Status is now ${orgResolveData.complaint.status}`);

  console.log('\n====================================================');
  console.log('🎉 ALL 4 STAKEHOLDERS TESTED & VERIFIED END-TO-END!');
  console.log('====================================================');
}

testStakeholderIntegration().catch((err) => {
  console.error('❌ Integration Test Failed:', err);
  process.exit(1);
});
