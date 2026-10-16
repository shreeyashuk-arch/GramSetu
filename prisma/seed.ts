import { PrismaClient } from '@prisma/client';
import { calculatePriority } from '../src/lib/priority';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting GramSetu realistic database seeding...');

  // Clean existing tables in reverse dependency order
  await prisma.notification.deleteMany();
  await prisma.sOSAlert.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.complaintSupporter.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.resourceRequest.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.post.deleteMany();
  await prisma.oTP.deleteMany();
  await prisma.user.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.village.deleteMany();

  // 1. Create Villages
  const v1 = await prisma.village.create({
    data: {
      name: 'Shivapur',
      block: 'Haveli',
      district: 'Pune',
      state: 'Maharashtra',
      lat: 18.3164,
      lng: 73.8682,
    },
  });

  const v2 = await prisma.village.create({
    data: {
      name: 'Khed-Gawhan',
      block: 'Shirur',
      district: 'Pune',
      state: 'Maharashtra',
      lat: 18.5204,
      lng: 74.052,
    },
  });

  // Zones for Shivapur
  const zA = await prisma.zone.create({
    data: { villageId: v1.id, name: 'Zone A (North Ward & Mandir)', code: 'ZA' },
  });
  const zB = await prisma.zone.create({
    data: { villageId: v1.id, name: 'Zone B (Central Bazaar & Panchayat)', code: 'ZB' },
  });
  const zC = await prisma.zone.create({
    data: { villageId: v1.id, name: 'Zone C (Southern Farm Belt & Vasti)', code: 'ZC' },
  });

  // Zones for Khed-Gawhan
  const zK1 = await prisma.zone.create({
    data: { villageId: v2.id, name: 'Zone A (Gaothan)', code: 'ZA' },
  });
  const zK2 = await prisma.zone.create({
    data: { villageId: v2.id, name: 'Zone B (Riverbank Colony)', code: 'ZB' },
  });

  console.log('✅ Created villages and zones');

  // 2. Create Sarpanch
  const sarpanch = await prisma.user.create({
    data: {
      phone: '9876543210',
      name: 'Balasaheb Patil (Sarpanch)',
      role: 'SARPANCH',
      villageId: v1.id,
      zoneId: zB.id,
      language: 'mr',
      isVerified: true,
      trustScore: 1.0,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });

  // 3. Create Organizations (5)
  const orgWater = await prisma.user.create({
    data: {
      phone: '9876543220',
      name: 'Jal Shakti Water Supply Department',
      role: 'ORGANIZATION',
      organizationType: 'JAL_SHAKTI',
      villageId: v1.id,
      zoneId: zB.id,
      language: 'mr',
      isVerified: true,
      trustScore: 1.0,
    },
  });

  const orgPower = await prisma.user.create({
    data: {
      phone: '9876543221',
      name: 'MSEDCL Electricity Sub-Station',
      role: 'ORGANIZATION',
      organizationType: 'MSEDCL_ELECTRICITY',
      villageId: v1.id,
      zoneId: zB.id,
      language: 'mr',
      isVerified: true,
      trustScore: 1.0,
    },
  });

  const orgHealth = await prisma.user.create({
    data: {
      phone: '9876543222',
      name: 'Primary Health Centre (PHC) Shivapur',
      role: 'ORGANIZATION',
      organizationType: 'PHC_HEALTH',
      villageId: v1.id,
      zoneId: zA.id,
      language: 'mr',
      isVerified: true,
      trustScore: 1.0,
    },
  });

  const orgRoads = await prisma.user.create({
    data: {
      phone: '9876543223',
      name: 'Public Works Dept (PWD Roads)',
      role: 'ORGANIZATION',
      organizationType: 'PWD_ROADS',
      villageId: v1.id,
      zoneId: zB.id,
      language: 'mr',
      isVerified: true,
      trustScore: 1.0,
    },
  });

  const orgAgri = await prisma.user.create({
    data: {
      phone: '9876543224',
      name: 'Krishi Vigyan Kendra (KVK)',
      role: 'ORGANIZATION',
      organizationType: 'KVK_AGRICULTURE',
      villageId: v1.id,
      zoneId: zC.id,
      language: 'mr',
      isVerified: true,
      trustScore: 1.0,
    },
  });

  console.log('✅ Created 5 government and community organizations');

  // 4. Create Service Providers and Volunteers (15)
  const providerData = [
    {
      phone: '9876543230',
      name: 'Ramesh Shinde (Tractor Owner)',
      category: 'TRACTOR_OWNER',
      zoneId: zC.id,
      verified: true,
      trust: 0.98,
    },
    {
      phone: '9876543231',
      name: 'Kisanrao Jadhav (Rotavator & Harvester)',
      category: 'TRACTOR_OWNER',
      zoneId: zC.id,
      verified: true,
      trust: 0.95,
    },
    {
      phone: '9876543232',
      name: 'Pandurang More (Water Tanker 5000L)',
      category: 'WATER_TANKER',
      zoneId: zB.id,
      verified: true,
      trust: 0.96,
    },
    {
      phone: '9876543233',
      name: 'Suresh Wireman (Certified Electrician)',
      category: 'ELECTRICIAN',
      zoneId: zA.id,
      verified: true,
      trust: 0.99,
    },
    {
      phone: '9876543234',
      name: 'Sunita Tai (ASHA Health Worker)',
      category: 'VOLUNTEER',
      zoneId: zA.id,
      verified: true,
      trust: 1.0,
    },
    {
      phone: '9876543235',
      name: 'Mahesh Shinde (Ambulance Driver 24x7)',
      category: 'AMBULANCE_DRIVER',
      zoneId: zB.id,
      verified: true,
      trust: 0.99,
    },
    {
      phone: '9876543236',
      name: 'Ganesh Kumbhar (Plumber & Pipe Fitter)',
      category: 'PLUMBER',
      zoneId: zB.id,
      verified: true,
      trust: 0.92,
    },
    {
      phone: '9876543237',
      name: 'Dr. Ashok Deshmukh (Visiting Physician)',
      category: 'DOCTOR',
      zoneId: zA.id,
      verified: true,
      trust: 1.0,
    },
    {
      phone: '9876543238',
      name: 'Pravin Kulkarni (Z.P. School Teacher)',
      category: 'TEACHER',
      zoneId: zA.id,
      verified: true,
      trust: 0.97,
    },
    {
      phone: '9876543239',
      name: 'Kavita Gaware (Women Safety Volunteer)',
      category: 'VOLUNTEER',
      zoneId: zB.id,
      verified: true,
      trust: 1.0,
    },
    {
      phone: '9876543240',
      name: 'Vijay Jagtap (Auto & Passenger Van)',
      category: 'DRIVER',
      zoneId: zC.id,
      verified: true,
      trust: 0.94,
    },
    {
      phone: '9876543241',
      name: 'Anita Salve (Anganwadi Worker)',
      category: 'VOLUNTEER',
      zoneId: zC.id,
      verified: true,
      trust: 0.99,
    },
    {
      phone: '9876543242',
      name: 'Santosh Gavali (Motor & Borewell Mechanic)',
      category: 'MECHANIC',
      zoneId: zC.id,
      verified: true,
      trust: 0.91,
    },
    {
      phone: '9876543243',
      name: 'Rahul Pawar (Youth Volunteer Corps Leader)',
      category: 'VOLUNTEER',
      zoneId: zB.id,
      verified: true,
      trust: 0.95,
    },
    {
      phone: '9876543244',
      name: 'Meena Gaikwad (Bachat Gat / SHG Coordinator)',
      category: 'VOLUNTEER',
      zoneId: zA.id,
      verified: true,
      trust: 0.98,
    },
  ];

  const providers: any[] = [];
  for (const p of providerData) {
    const prov = await prisma.user.create({
      data: {
        phone: p.phone,
        name: p.name,
        role: 'PROVIDER',
        providerCategory: p.category,
        villageId: v1.id,
        zoneId: p.zoneId,
        language: 'mr',
        isVerified: p.verified,
        trustScore: p.trust,
      },
    });
    providers.push(prov);
  }
  console.log(`✅ Created ${providers.length} service providers and volunteers`);

  // 5. Create 20 Residents
  const residentNames = [
    { name: 'Ananda Ramchandra Jadhav', phone: '9876543250', zone: zA },
    { name: 'Dattatray Babanrao More', phone: '9876543251', zone: zB },
    { name: 'Shobha Pandurang Shinde', phone: '9876543252', zone: zC },
    { name: 'Bhimrao Tukaram Kamble', phone: '9876543253', zone: zC },
    { name: 'Laxman Vithoba Gole', phone: '9876543254', zone: zA },
    { name: 'Rukhmini Sopan Kadam', phone: '9876543255', zone: zB },
    { name: 'Shankar Mahadev Thopte', phone: '9876543256', zone: zC },
    { name: 'Geeta Namdev Sonawane', phone: '9876543257', zone: zA },
    { name: 'Vilas Eknath Jagdale', phone: '9876543258', zone: zB },
    { name: 'Urmila Ramesh Chavan', phone: '9876543259', zone: zC },
    { name: 'Nathuram Kisan Bhosale', phone: '9876543260', zone: zA },
    { name: 'Vimal Ashok Thorat', phone: '9876543261', zone: zB },
    { name: 'Popat Bhausaheb Gaikwad', phone: '9876543262', zone: zC },
    { name: 'Sarika Ganesh Darekar', phone: '9876543263', zone: zA },
    { name: 'Baburao Malhari Kokate', phone: '9876543264', zone: zB },
    { name: 'Sunanda Chandrakant Pawar', phone: '9876543265', zone: zC },
    { name: 'Arjun Raghunath Nalawade', phone: '9876543266', zone: zA },
    { name: 'Madhuri Santosh Mohite', phone: '9876543267', zone: zB },
    { name: 'Kishor Dhondiba Sawant', phone: '9876543268', zone: zC },
    { name: 'Sindhutai Vasantrao Mane', phone: '9876543269', zone: zA },
  ];

  const residents: any[] = [];
  for (const r of residentNames) {
    const res = await prisma.user.create({
      data: {
        phone: r.phone,
        name: r.name,
        role: 'RESIDENT',
        villageId: v1.id,
        zoneId: r.zone.id,
        language: 'mr',
        isVerified: true,
        trustScore: 0.95,
      },
    });
    residents.push(res);
  }
  console.log(`✅ Created ${residents.length} resident accounts`);

  // 6. Create 12 Resources across categories
  const resourcesData = [
    {
      ownerId: providers[0].id, // Ramesh Shinde Tractor
      category: 'EQUIPMENT',
      name: 'Mahindra 575 DI Tractor (45 HP) with Plough',
      description: 'Ideal for deep ploughing, harrowing, and sowing. Available with driver.',
      capacity: '45 HP / 2WD',
      serviceArea: 'Zone B & Zone C',
      availabilitySlots: 'Mon-Sat 6:00 AM - 6:00 PM',
      priceType: 'SUBSIDIZED',
      priceAmount: 600,
      contactPhone: '9876543230',
      lat: 18.3142,
      lng: 73.8665,
    },
    {
      ownerId: providers[1].id, // Kisanrao Jadhav
      category: 'EQUIPMENT',
      name: 'John Deere Tractor with Heavy Rotavator',
      description: 'Rotary tiller and land leveler for paddy and sugarcane fields.',
      capacity: '50 HP Heavy Duty',
      serviceArea: 'Whole Village & Surrounding Farms',
      availabilitySlots: 'All days 7:00 AM - 7:00 PM',
      priceType: 'SUBSIDIZED',
      priceAmount: 750,
      contactPhone: '9876543231',
      lat: 18.3155,
      lng: 73.8698,
    },
    {
      ownerId: providers[2].id, // Pandurang More Water Tanker
      category: 'VEHICLES',
      name: 'Clean Drinking Water Tanker (5000 Litres)',
      description: 'Equipped with 2.5 HP discharge pump and 40-meter flexible hose for overhead tanks.',
      capacity: '5,000 Litres',
      serviceArea: 'All Zones (Priority to drought-hit vastis)',
      availabilitySlots: '24x7 Emergency Service',
      priceType: 'SUBSIDIZED',
      priceAmount: 400,
      contactPhone: '9876543232',
      lat: 18.3168,
      lng: 73.868,
    },
    {
      ownerId: providers[5].id, // Mahesh Shinde Ambulance
      category: 'VEHICLES',
      name: 'Gramin Emergency Ambulance Van',
      description: 'Equipped with oxygen cylinder, stretcher, first aid kit, and emergency siren.',
      capacity: '1 Patient + 2 Attendants',
      serviceArea: 'Shivapur & Taluka Hospitals',
      availabilitySlots: '24x7 Emergency',
      priceType: 'FREE',
      priceAmount: 0,
      contactPhone: '9876543235',
      lat: 18.317,
      lng: 73.8691,
    },
    {
      ownerId: providers[10].id, // Vijay Jagtap Auto
      category: 'VEHICLES',
      name: 'Passenger Shared Transit Van (Cruiser)',
      description: 'Morning and evening passenger runs to Shirwal ST Stand and PHC.',
      capacity: '10 Passengers',
      serviceArea: 'Zone C Farm Belt to Main Highway',
      availabilitySlots: '6:30 AM - 8:30 PM',
      priceType: 'SUBSIDIZED',
      priceAmount: 20,
      contactPhone: '9876543240',
      lat: 18.3135,
      lng: 73.8655,
    },
    {
      ownerId: providers[3].id, // Suresh Wireman
      category: 'SKILLED_PEOPLE',
      name: 'Licensed High-Tension & Domestic Electrician',
      description: 'Phase wire repairs, starter box replacement, transformer fuses, meter faults.',
      capacity: 'Full toolkit, safety boots, testing multimeter',
      serviceArea: 'All Zones',
      availabilitySlots: '8:00 AM - 8:00 PM',
      priceType: 'SUBSIDIZED',
      priceAmount: 150,
      contactPhone: '9876543233',
      lat: 18.3182,
      lng: 73.8672,
    },
    {
      ownerId: providers[6].id, // Ganesh Kumbhar Plumber
      category: 'SKILLED_PEOPLE',
      name: 'Master Plumber & PVC Pipeline Welder',
      description: 'Underground drinking water line leak repairs, PVC pipe jointing, handpump valve fix.',
      capacity: 'Pipe threading & welding dies up to 4 inches',
      serviceArea: 'Zone A & Zone B',
      availabilitySlots: '7:00 AM - 7:00 PM',
      priceType: 'SUBSIDIZED',
      priceAmount: 200,
      contactPhone: '9876543236',
      lat: 18.3162,
      lng: 73.8685,
    },
    {
      ownerId: providers[12].id, // Santosh Gavali Mechanic
      category: 'SKILLED_PEOPLE',
      name: 'Submersible Pump & Agricultural Motor Mechanic',
      description: 'Repairing winding burns, bearing seized pumps, capacitor checks on farm wells.',
      capacity: 'Pump puller winch and spare capacitors',
      serviceArea: 'Zone C and surrounding vastis',
      availabilitySlots: '8:00 AM - 6:00 PM',
      priceType: 'SUBSIDIZED',
      priceAmount: 300,
      contactPhone: '9876543242',
      lat: 18.3128,
      lng: 73.864,
    },
    {
      ownerId: providers[7].id, // Dr. Deshmukh
      category: 'HUMAN_RESOURCES',
      name: 'Dr. Deshmukh (Visiting General Physician & Pediatrician)',
      description: 'Geriatric health visits, maternal prenatal checkup, hypertension management.',
      capacity: 'Stethoscope, ECG monitor, glucose and BP testing',
      serviceArea: 'PHC Sub-centre & Home Visits',
      availabilitySlots: 'Tuesday & Friday 9:00 AM - 2:00 PM',
      priceType: 'FREE',
      priceAmount: 0,
      contactPhone: '9876543237',
      lat: 18.3175,
      lng: 73.8695,
    },
    {
      ownerId: providers[8].id, // Pravin Kulkarni
      category: 'HUMAN_RESOURCES',
      name: 'Gramin Remedial Education & Navodaya Coaching',
      description: 'Free evening mathematics and science tutoring for 5th to 10th standard village kids.',
      capacity: 'Up to 35 students per batch',
      serviceArea: 'Z.P. School Hall',
      availabilitySlots: 'Mon-Fri 5:30 PM - 7:30 PM',
      priceType: 'FREE',
      priceAmount: 0,
      contactPhone: '9876543238',
      lat: 18.3188,
      lng: 73.8688,
    },
    {
      ownerId: sarpanch.id,
      category: 'FACILITIES',
      name: 'Gram Panchayat Community Hall (Samaj Mandir)',
      description: 'Large ventilated hall with solar lighting, clean toilets, and 200 plastic chairs.',
      capacity: '250 Persons seated',
      serviceArea: 'Central Village',
      availabilitySlots: 'Bookings via Gram Sevak',
      priceType: 'SUBSIDIZED',
      priceAmount: 500,
      contactPhone: '9876543210',
      lat: 18.3165,
      lng: 73.8681,
    },
    {
      ownerId: sarpanch.id,
      category: 'FACILITIES',
      name: 'Grain Storage Godown & Shelter Room',
      description: 'Pukka concrete warehouse with rodent proofing for temporary harvest storage or flood shelter.',
      capacity: '1,500 Quintal grain capacity / 80 persons shelter',
      serviceArea: 'Zone B Agricultural Mandi',
      availabilitySlots: 'Open during harvest & monsoon alerts',
      priceType: 'FREE',
      priceAmount: 0,
      contactPhone: '9876543210',
      lat: 18.3158,
      lng: 73.8674,
    },
  ];

  for (const r of resourcesData) {
    await prisma.resource.create({
      data: {
        villageId: v1.id,
        ...r,
      },
    });
  }
  console.log(`✅ Created ${resourcesData.length} village resources`);

  // 7. Create 8 Sarpanch Posts (with multilingual translations en, hi, mr)
  const postsData = [
    {
      authorId: sarpanch.id,
      villageId: v1.id,
      type: 'EMERGENCY',
      title: 'Heavy Rainfall & Waterlogging Alert: Avoid Southern River Causeways',
      body: 'Continuous downpour in Western Ghats. Water discharge from Bhatghar dam is rising. Do not cross the Zone C causeway.',
      isPinned: true,
      translations: JSON.stringify({
        en: {
          title: 'Heavy Rainfall & Waterlogging Alert: Avoid Southern River Causeways',
          body: 'Continuous downpour in Western Ghats. Water discharge from Bhatghar dam is rising. Do not cross the Zone C causeway.',
        },
        hi: {
          title: 'भारी बारिश व बाढ़ की चेतावनी: दक्षिणी नदी के पुल पार करने से बचें',
          body: 'पश्चिमी घाट में मूसलाधार बारिश जारी है। भाटघर बांध से पानी छोड़ा जा रहा है। ज़ोन सी के नदी तट पर सतर्क रहें।',
        },
        mr: {
          title: 'अतिवृष्टी व पूर इशारा: दक्षिण भागातील ओढ्यावरील पूल ओलांडू नये',
          body: 'घाटमाथ्यावर संततधार पाऊस सुरू असून भाटघर धरणातून विसर्ग वाढण्याची शक्यता आहे. झोन सी मधील बंधारा ओलांडू नये.',
        },
      }),
      targetZone: null,
    },
    {
      authorId: sarpanch.id,
      villageId: v1.id,
      type: 'CAMP',
      title: 'Free Ayushman Card & Eye Checkup Camp this Sunday',
      body: 'District Hospital team visiting Samaj Mandir from 9 AM to 4 PM. Bring Aadhaar card and Ration card for on-spot issuance.',
      isPinned: true,
      translations: JSON.stringify({
        en: {
          title: 'Free Ayushman Card & Eye Checkup Camp this Sunday',
          body: 'District Hospital team visiting Samaj Mandir from 9 AM to 4 PM. Bring Aadhaar card and Ration card for on-spot issuance.',
        },
        hi: {
          title: 'इस रविवार समाज मंदिर में मुफ्त आयुष्मान कार्ड व नेत्र जांच शिविर',
          body: 'जिला अस्पताल की टीम सुबह 9 से शाम 4 बजे तक उपस्थित रहेगी। तुरंत कार्ड बनवाने के लिए आधार कार्ड और राशन कार्ड साथ लाएं।',
        },
        mr: {
          title: 'या रविवारी समाज मंदिरात मोफत आयुष्मान कार्ड व मोतिबिंदू तपासणी शिबिर',
          body: 'जिल्हा रुग्णालयाचे पथक सकाळी ९ ते दुपारी ४ या वेळेत उपस्थित राहील. जागीच कार्ड मिळवण्यासाठी आधार आणि रेशन कार्ड सोबत आणावे.',
        },
      }),
      targetZone: 'ZB',
    },
    {
      authorId: sarpanch.id,
      villageId: v1.id,
      type: 'ANNOUNCEMENT',
      title: 'Drinking Water Supply Valve Rotation Timing Update',
      body: 'Due to pipeline repair at North Tank, Zone A will receive water from 6 AM to 8 AM, and Zone B from 5 PM to 7 PM.',
      isPinned: false,
      translations: JSON.stringify({
        en: {
          title: 'Drinking Water Supply Valve Rotation Timing Update',
          body: 'Due to pipeline repair at North Tank, Zone A will receive water from 6 AM to 8 AM, and Zone B from 5 PM to 7 PM.',
        },
        hi: {
          title: 'पीने के पानी के नल का समय परिवर्तन सूचना',
          body: 'उत्तर जलमीनार की पाइपलाइन मरम्मत के कारण ज़ोन ए में सुबह 6 से 8 और ज़ोन बी में शाम 5 से 7 पानी छोड़ा जाएगा।',
        },
        mr: {
          title: 'पिण्याच्या पाण्याच्या वेळापत्रकात तात्पुरता बदल',
          body: 'उत्तर टाकीजवळील पाइपलाइन दुरुस्तीमुळे झोन ए मध्ये सकाळी ६ ते ८ व झोन बी मध्ये संध्याकाळी ५ ते ७ पाणी पुरवठा होईल.',
        },
      }),
      targetZone: null,
    },
    {
      authorId: sarpanch.id,
      villageId: v1.id,
      type: 'SCHEME',
      title: 'PM-KUSUM Solar Agricultural Pump Subsidy: Phase 4 Applications Open',
      body: 'Farmers with verified 7/12 land records can apply at Gram Panchayat CSC Kendra. Government subsidy covers up to 90%.',
      isPinned: false,
      translations: JSON.stringify({
        en: {
          title: 'PM-KUSUM Solar Agricultural Pump Subsidy: Phase 4 Applications Open',
          body: 'Farmers with verified 7/12 land records can apply at Gram Panchayat CSC Kendra. Government subsidy covers up to 90%.',
        },
        hi: {
          title: 'पीएम-कुसुम सौर कृषि पंप योजना: चौथे चरण के आवेदन शुरू',
          body: '7/12 भूलेख धारक किसान ग्राम पंचायत सीएससी केंद्र पर आवेदन कर सकते हैं। 90% तक सरकारी अनुदान उपलब्ध है।',
        },
        mr: {
          title: 'पीएम-कुसुम सौर कृषी पंप योजना: चौथ्या टप्प्यातील अर्ज सुरू',
          body: '७/१२ उतारे असणारे शेतकरी ग्रामपंचायत महा-ई-सेवा केंद्रात अर्ज करू शकतात. ९०% पर्यंत शासकीय अनुदान उपलब्ध आहे.',
        },
      }),
      targetZone: 'ZC',
    },
    {
      authorId: sarpanch.id,
      villageId: v1.id,
      type: 'SCHEDULE',
      title: 'New MSRTC Rural Bus Schedule (Shirwal to Shivapur Gaon)',
      body: 'First bus at 7:15 AM, Afternoon bus at 1:45 PM, Evening school bus at 5:30 PM. Halts at Z.P. School and Main Chowk.',
      isPinned: false,
      translations: JSON.stringify({
        en: {
          title: 'New MSRTC Rural Bus Schedule (Shirwal to Shivapur Gaon)',
          body: 'First bus at 7:15 AM, Afternoon bus at 1:45 PM, Evening school bus at 5:30 PM. Halts at Z.P. School and Main Chowk.',
        },
        hi: {
          title: 'शिरवल-शिवपुर ग्रामीण बस की नई समय-सारणी',
          body: 'पहली बस सुबह 7:15, दोपहर 1:45 और शाम 5:30 बजे मुख्य चौक और स्कूल पर रुकेगी।',
        },
        mr: {
          title: 'शिरवळ-शिवपूर एसटी बसच्या नवीन फेऱ्यांचे वेळापत्रक',
          body: 'पहिली फेरी सकाळी ७:१५, दुपारची फेरी १:४५ आणि संध्याकाळची फेरी ५:३०. जिल्हा परिषद शाळा व मुख्य चौकात थांबा.',
        },
      }),
      targetZone: null,
    },
    {
      authorId: sarpanch.id,
      villageId: v1.id,
      type: 'ANNOUNCEMENT',
      title: 'General Gram Sabha Meeting Scheduled for Republic Day Week',
      body: 'Budget allocation review for new concrete gutter works and verification of PMAY housing beneficiary lists.',
      isPinned: false,
      translations: JSON.stringify({
        en: {
          title: 'General Gram Sabha Meeting Scheduled for Republic Day Week',
          body: 'Budget allocation review for new concrete gutter works and verification of PMAY housing beneficiary lists.',
        },
        hi: {
          title: 'विशेष ग्रामसभा बैठक: बजट व आवास योजना सूची सत्यापन',
          body: 'नाली निर्माण कार्यों के बजट आवंटन और पीएम आवास योजना के लाभार्थियों की सूची को अंतिम रूप देने हेतु आम सभा।',
        },
        mr: {
          title: 'विशेष ग्रामसभा: नवीन सिमेंट गटार अंदाजपत्रक व आवास योजना यादी',
          body: 'गावातील सांडपाणी गटार कामे आणि घरकुल योजनेच्या पात्र लाभार्थी यादीच्या मंजुरीसाठी जाहीर ग्रामसभा.',
        },
      }),
      targetZone: null,
    },
    {
      authorId: sarpanch.id,
      villageId: v1.id,
      type: 'CAMP',
      title: 'Livestock Vaccination (FMD) Camp at Veterinary Sub-Centre',
      body: 'Free Foot-and-Mouth disease immunization for cows and buffaloes on Wednesday starting 8 AM. Register with Sarpanch office.',
      isPinned: false,
      translations: JSON.stringify({
        en: {
          title: 'Livestock Vaccination (FMD) Camp at Veterinary Sub-Centre',
          body: 'Free Foot-and-Mouth disease immunization for cows and buffaloes on Wednesday starting 8 AM. Register with Sarpanch office.',
        },
        hi: {
          title: 'पशुधन टीकाकरण शिविर: खुरपका-मुंहपका रोग से बचाव',
          body: 'बुधवार सुबह 8 बजे से पशु चिकित्सा उप-केंद्र में गाय व भैंसों का मुफ्त टीकाकरण किया जाएगा।',
        },
        mr: {
          title: 'जनावरांचे मोफत लाळ-खुरकूत लसीकरण शिबिर',
          body: 'येत्या बुधवारी सकाळी ८ वाजल्यापासून पशुवैद्यकीय दवाखान्यात सर्व जनावरांना मोफत लस टोचली जाईल.',
        },
      }),
      targetZone: 'ZC',
    },
    {
      authorId: sarpanch.id,
      villageId: v1.id,
      type: 'ANNOUNCEMENT',
      title: 'Village Cleanliness Drive (Swachhata Abhiyan) on Saturday Morning',
      body: 'All youth, self-help groups, and shopkeepers are requested to join at Bazaar Chowk for community drainage cleaning.',
      isPinned: false,
      translations: JSON.stringify({
        en: {
          title: 'Village Cleanliness Drive (Swachhata Abhiyan) on Saturday Morning',
          body: 'All youth, self-help groups, and shopkeepers are requested to join at Bazaar Chowk for community drainage cleaning.',
        },
        hi: {
          title: 'शनिवार सुबह ग्राम स्वच्छता अभियान: बाजार चौक में सहभागिता',
          body: 'सभी युवा मित्र, महिला मंडल और व्यापारी भाइयों से निवेदन है कि नालियों की सफाई के लिए श्रमदान में जुड़ें।',
        },
        mr: {
          title: 'शनिवारी सकाळी सामूहिक ग्राम स्वच्छता मोहीम',
          body: 'सर्व तरुण मंडळे, बचत गट व व्यापारी बंधूंनी सकाळी ८ वाजता बाजार चौकात श्रमदानासाठी एकत्र यावे.',
        },
      }),
      targetZone: 'ZB',
    },
  ];

  for (const post of postsData) {
    await prisma.post.create({
      data: post,
    });
  }
  console.log(`✅ Created ${postsData.length} Sarpanch posts with multilingual translations`);

  // 8. Create 3 SOS Records
  await prisma.sOSAlert.create({
    data: {
      villageId: v1.id,
      zoneId: zC.id,
      senderId: residents[2].id, // Shobha Shinde
      senderName: 'Shobha Pandurang Shinde',
      senderPhone: '9876543252',
      lat: 18.3138,
      lng: 73.8648,
      message: 'Suspicious vehicle following me near unlit canal road in Zone C. Need immediate village volunteer assistance.',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
    },
  });

  await prisma.sOSAlert.create({
    data: {
      villageId: v1.id,
      zoneId: zA.id,
      senderId: residents[7].id,
      senderName: 'Geeta Namdev Sonawane',
      senderPhone: '9876543257',
      lat: 18.3182,
      lng: 73.8674,
      message: 'Elderly lady collapsed near temple steps with chest pain. Dispatched ambulance driver Mahesh.',
      status: 'ACKNOWLEDGED',
      responseTimeMinutes: 4,
      notes: 'Volunteer Sunita Tai and Ambulance on site.',
      createdAt: new Date(Date.now() - 120 * 60 * 1000),
    },
  });

  await prisma.sOSAlert.create({
    data: {
      villageId: v1.id,
      zoneId: zB.id,
      senderId: residents[9].id,
      senderName: 'Urmila Ramesh Chavan',
      senderPhone: '9876543259',
      lat: 18.3161,
      lng: 73.8683,
      message: 'Group of rowdy men loitering near anganwadi center during evening hours.',
      status: 'RESOLVED',
      responseTimeMinutes: 8,
      notes: 'Panchayat ward members and police patil arrived and dispersed the crowd.',
      createdAt: new Date(Date.now() - 86400 * 1000 * 2), // 2 days ago
    },
  });
  console.log('✅ Created 3 SOS records');

  // 9. Create 60 Complaints across categories, statuses, and priority bands
  // Including:
  // - 2 Duplicates (marked and clustered)
  // - 1 Spam item (flagged for Sarpanch moderation with reason)
  // - A Transport demand cluster in Zone C
  // - A clear Service Gap (e.g. Zone B agricultural tractor shortage: 7 requests vs 1 available)
  // - Resolved items with proof photos and resident rating confirmation

  const complaintTemplates = [
    // Water (Jal Shakti)
    {
      category: 'WATER',
      title: 'Main drinking water pipeline ruptured near North Water Tank',
      description: 'Severe underground leakage flooding road. 300+ households in Zone A have zero drinking water pressure since morning.',
      urgency: 5,
      peopleAffected: 4,
      vulnerabilities: ['children', 'elderly'],
      timeSensitivity: 5,
      daysOpen: 1,
      status: 'IN_PROGRESS',
      org: 'JAL_SHAKTI',
      zone: zA,
      photoUrl: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
    },
    {
      category: 'WATER',
      title: 'Community handpump broken handle and rusted piston rod',
      description: 'Handpump cylinder has jammed at Harijan Vasti. Villagers walking 2 km to get drinking water.',
      urgency: 4,
      peopleAffected: 3,
      vulnerabilities: ['pregnant', 'elderly'],
      timeSensitivity: 4,
      daysOpen: 3,
      status: 'ASSIGNED',
      org: 'JAL_SHAKTI',
      zone: zC,
      photoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=400',
    },
    {
      category: 'WATER',
      title: 'Drinking water smells muddy and has high turbidity after rains',
      description: 'Overhead tank chlorination dosing pump has failed. Multiple children reporting stomach ache.',
      urgency: 4,
      peopleAffected: 4,
      vulnerabilities: ['children'],
      timeSensitivity: 5,
      daysOpen: 2,
      status: 'VERIFIED',
      org: 'JAL_SHAKTI',
      zone: zB,
      photoUrl: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=400',
    },
    {
      category: 'WATER',
      title: 'Open public tap continuously overflowing and wasting fresh water',
      description: 'Brass tap stolen near temple road. Water flowing into mud.',
      urgency: 2,
      peopleAffected: 2,
      vulnerabilities: [],
      timeSensitivity: 2,
      daysOpen: 1,
      status: 'SUBMITTED',
      org: 'JAL_SHAKTI',
      zone: zA,
    },
    {
      category: 'WATER',
      title: 'Repaired borewell motor and replaced brass valve at Z.P. School',
      description: 'Borewell submersible motor was burnt. New 3 HP copper winding motor installed and tested with clean water output.',
      urgency: 4,
      peopleAffected: 3,
      vulnerabilities: ['children'],
      timeSensitivity: 4,
      daysOpen: 4,
      status: 'RESOLVED',
      org: 'JAL_SHAKTI',
      zone: zA,
      photoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400',
      proofPhotoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400',
      residentRating: 5,
      residentFeedback: 'Excellent prompt work by Jal Shakti team! School kids now have clean tap water.',
      residentConfirmed: true,
    },

    // Electricity (MSEDCL)
    {
      category: 'ELECTRICITY',
      title: 'High tension 11KV wire snapped and hanging dangerously low across cattle pathway',
      description: 'Live sparking wire hanging 5 feet above the ground on the main agricultural path. Immediate risk to cattle and farmers.',
      urgency: 5,
      peopleAffected: 4,
      vulnerabilities: ['children', 'elderly'],
      timeSensitivity: 5,
      daysOpen: 0,
      status: 'IN_PROGRESS',
      org: 'MSEDCL_ELECTRICITY',
      zone: zC,
      photoUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400',
    },
    {
      category: 'ELECTRICITY',
      title: 'Agricultural transformer burnt due to lightning storm',
      description: '100 KVA transformer near canal burst with loud noise. 25 farm tube wells completely without power during wheat irrigation.',
      urgency: 5,
      peopleAffected: 3,
      vulnerabilities: [],
      timeSensitivity: 5,
      daysOpen: 2,
      status: 'ASSIGNED',
      org: 'MSEDCL_ELECTRICITY',
      zone: zC,
    },
    {
      category: 'ELECTRICITY',
      title: 'Streetlights unlit across entire Bazaar Lane for 5 consecutive nights',
      description: 'Timer switch has malfunctioned. Complete darkness makes women and elders afraid to walk after 7 PM.',
      urgency: 3,
      peopleAffected: 3,
      vulnerabilities: ['elderly'],
      timeSensitivity: 3,
      daysOpen: 5,
      status: 'ACCEPTED',
      org: 'MSEDCL_ELECTRICITY',
      zone: zB,
    },
    {
      category: 'ELECTRICITY',
      title: 'Replaced burnt fuse and restored phase power at West Sub-station',
      description: 'Neutral line was loose. Re-clamped and balanced load on phase B.',
      urgency: 3,
      peopleAffected: 3,
      vulnerabilities: [],
      timeSensitivity: 3,
      daysOpen: 1,
      status: 'RESOLVED',
      org: 'MSEDCL_ELECTRICITY',
      zone: zA,
      photoUrl: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=400',
      proofPhotoUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400',
      residentRating: 4,
      residentFeedback: 'Resolved within 24 hours. Electricity is stable now.',
      residentConfirmed: true,
    },

    // Roads (PWD)
    {
      category: 'ROADS',
      title: 'Deep 2-foot crater and mud ditch on primary hospital access road',
      description: 'Culvert collapsed after monsoon rain. Ambulances cannot enter Zone C without getting stuck in mud.',
      urgency: 5,
      peopleAffected: 4,
      vulnerabilities: ['pregnant', 'elderly', 'disabled'],
      timeSensitivity: 5,
      daysOpen: 3,
      status: 'ESCALATED',
      org: 'PWD_ROADS',
      zone: zC,
      photoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=400',
    },
    {
      category: 'ROADS',
      title: 'Fallen Banyan tree branch blocking main village school road',
      description: 'Heavy wind snapped 20-foot limb. School bus and auto rickshaws unable to pass.',
      urgency: 4,
      peopleAffected: 3,
      vulnerabilities: ['children'],
      timeSensitivity: 4,
      daysOpen: 1,
      status: 'ACCEPTED',
      org: 'PWD_ROADS',
      zone: zA,
    },
    {
      category: 'ROADS',
      title: 'Potholes filled with gravel and compacted with roller near Panchayat square',
      description: 'Fixed 4 large potholes using crushed basalt stone and bitumen emulsion.',
      urgency: 3,
      peopleAffected: 3,
      vulnerabilities: [],
      timeSensitivity: 2,
      daysOpen: 5,
      status: 'RESOLVED',
      org: 'PWD_ROADS',
      zone: zB,
      photoUrl: 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?w=400',
      proofPhotoUrl: 'https://images.unsplash.com/photo-1590496793929-36417d3117de?w=400',
      residentRating: 5,
      residentFeedback: 'Road is smooth now. Bikes and autos driving safely.',
      residentConfirmed: true,
    },

    // Health (PHC)
    {
      category: 'HEALTH',
      title: 'Sudden fever and diarrhea outbreak affecting 12 children in Vasti',
      description: 'Suspected water contamination. Families lack ORS packets and antipyretic syrup. Urgent doctor visit required.',
      urgency: 5,
      peopleAffected: 3,
      vulnerabilities: ['children'],
      timeSensitivity: 5,
      daysOpen: 1,
      status: 'IN_PROGRESS',
      org: 'PHC_HEALTH',
      zone: zC,
      photoUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=400',
    },
    {
      category: 'HEALTH',
      title: 'Emergency snakebite anti-venom vial shortage at Sub-Centre',
      description: 'Sub-centre stock has only 1 vial left during harvest season when snake encounters are high.',
      urgency: 5,
      peopleAffected: 4,
      vulnerabilities: ['elderly'],
      timeSensitivity: 5,
      daysOpen: 2,
      status: 'VERIFIED',
      org: 'PHC_HEALTH',
      zone: zA,
    },
    {
      category: 'HEALTH',
      title: 'Maternal health checkup and iron tablet distribution completed at Anganwadi 3',
      description: 'Examined 18 pregnant and lactating mothers. Distributed IFA tablets and calcium supplements.',
      urgency: 3,
      peopleAffected: 2,
      vulnerabilities: ['pregnant'],
      timeSensitivity: 3,
      daysOpen: 3,
      status: 'RESOLVED',
      org: 'PHC_HEALTH',
      zone: zB,
      proofPhotoUrl: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=400',
      residentRating: 5,
      residentConfirmed: true,
    },

    // Agriculture (KVK)
    {
      category: 'AGRICULTURE',
      title: 'Locust / Fall Armyworm pest infestation attacking maize and jowar crops',
      description: 'Pest spreading rapidly across 15 acres in Zone C. Need subsidized biological pesticide sprayers urgently.',
      urgency: 4,
      peopleAffected: 4,
      vulnerabilities: [],
      timeSensitivity: 5,
      daysOpen: 2,
      status: 'ASSIGNED',
      org: 'KVK_AGRICULTURE',
      zone: zC,
      photoUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?w=400',
    },
    {
      category: 'AGRICULTURE',
      title: 'Urea and DAP fertilizer shortage at Primary Agriculture Cooperative Society (PACS)',
      description: 'Farmers queuing since 4 AM. Only 50 bags available against demand of 400 bags.',
      urgency: 4,
      peopleAffected: 4,
      vulnerabilities: [],
      timeSensitivity: 4,
      daysOpen: 3,
      status: 'IN_PROGRESS',
      org: 'KVK_AGRICULTURE',
      zone: zB,
    },

    // Sanitation & Waste
    {
      category: 'SANITATION',
      title: 'Blocked open drainage canal overflowing foul sewage onto bazaar street',
      description: 'Plastic bags and debris choked culvert. Heavy smell and swarming mosquitoes.',
      urgency: 4,
      peopleAffected: 4,
      vulnerabilities: ['children'],
      timeSensitivity: 3,
      daysOpen: 4,
      status: 'ASSIGNED',
      org: 'PANCHAYAT',
      zone: zB,
      photoUrl: 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?w=400',
    },
    {
      category: 'SANITATION',
      title: 'Cleaned sewage drain and sprayed anti-larval disinfectant powder',
      description: 'Panchayat sanitation workers cleared 50 meters of choked gutter and spread lime bleaching powder.',
      urgency: 3,
      peopleAffected: 3,
      vulnerabilities: [],
      timeSensitivity: 2,
      daysOpen: 2,
      status: 'RESOLVED',
      org: 'PANCHAYAT',
      zone: zB,
      proofPhotoUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400',
      residentRating: 5,
      residentConfirmed: true,
    },

    // Women Safety
    {
      category: 'WOMEN_SAFETY',
      title: 'No streetlights and overgrown bushes near girls high school route',
      description: 'Girls walking home in complete dark after 5:30 PM. Group of unfamiliar youth gathered on bikes.',
      urgency: 5,
      peopleAffected: 3,
      vulnerabilities: ['children'],
      timeSensitivity: 5,
      daysOpen: 1,
      status: 'IN_PROGRESS',
      org: 'PANCHAYAT',
      zone: zA,
      photoUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=400',
    },
    {
      category: 'WOMEN_SAFETY',
      title: 'Installed 2 high-lumen solar LED streetlights along school lane',
      description: 'Cleared bushes and installed 40W solar streetlights with dusk-to-dawn sensors. Volunteer night patrol assigned.',
      urgency: 4,
      peopleAffected: 3,
      vulnerabilities: ['children'],
      timeSensitivity: 4,
      daysOpen: 3,
      status: 'RESOLVED',
      org: 'PANCHAYAT',
      zone: zA,
      proofPhotoUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400',
      residentRating: 5,
      residentFeedback: 'Lane is brightly lit now! Parents and school girls feel very safe.',
      residentConfirmed: true,
    },

    // Education
    {
      category: 'EDUCATION',
      title: 'Z.P. School primary classroom roof leaking directly onto student benches',
      description: 'Heavy rain dripping onto blackboard and bags. Classes merged into single congested room.',
      urgency: 4,
      peopleAffected: 3,
      vulnerabilities: ['children'],
      timeSensitivity: 4,
      daysOpen: 2,
      status: 'ASSIGNED',
      org: 'PANCHAYAT',
      zone: zA,
    },

    // Transport Demand Cluster in Zone C (4 connected issues)
    {
      category: 'TRANSPORT',
      title: 'Morning ST bus (7:30 AM) skipping Zone C farm stop regularly',
      description: 'Bus driver doesn’t enter outer vasti road due to uneven surface. 35 high school students missing first lecture daily.',
      urgency: 4,
      peopleAffected: 3,
      vulnerabilities: ['children'],
      timeSensitivity: 4,
      daysOpen: 6,
      status: 'ESCALATED',
      org: 'PANCHAYAT',
      zone: zC,
    },
    {
      category: 'TRANSPORT',
      title: 'No public transit for milk producers carrying cans to morning dairy chilling centre',
      description: 'Dairy cans need to reach by 7:00 AM. Farmers currently walking 4 km carrying heavy cans.',
      urgency: 3,
      peopleAffected: 3,
      vulnerabilities: [],
      timeSensitivity: 4,
      daysOpen: 4,
      status: 'IN_PROGRESS',
      org: 'PANCHAYAT',
      zone: zC,
    },
    {
      category: 'TRANSPORT',
      title: 'Request for daily evening shared tempo / rickshaw service for farm laborers',
      description: 'Women farm laborers returning from sugarcane fields stranded after sunset.',
      urgency: 4,
      peopleAffected: 3,
      vulnerabilities: ['elderly'],
      timeSensitivity: 3,
      daysOpen: 3,
      status: 'ACCEPTED',
      org: 'PANCHAYAT',
      zone: zC,
    },
    {
      category: 'TRANSPORT',
      title: 'Bus shelter tin shed blown away by storm near bypass road',
      description: 'Commuters waiting in scorching heat and rain without any roof or seating.',
      urgency: 2,
      peopleAffected: 3,
      vulnerabilities: ['elderly'],
      timeSensitivity: 2,
      daysOpen: 8,
      status: 'SUBMITTED',
      org: 'PWD_ROADS',
      zone: zC,
    },
  ];

  console.log(`Generating 60 complaints across categories and zones...`);

  let codeCounter = 1;
  const createdComplaints: any[] = [];

  // Generate core templates
  for (let i = 0; i < complaintTemplates.length; i++) {
    const t = complaintTemplates[i];
    const code = `CMP-2026-${String(codeCounter++).padStart(3, '0')}`;
    const resident = residents[i % residents.length];

    const priority = calculatePriority({
      urgency: t.urgency,
      peopleAffected: t.peopleAffected,
      vulnerabilities: t.vulnerabilities,
      timeSensitivity: t.timeSensitivity,
      daysOpen: t.daysOpen,
      category: t.category,
    });

    const baseLat = 18.3164 + (Math.random() - 0.5) * 0.015;
    const baseLng = 73.8682 + (Math.random() - 0.5) * 0.015;
    // Coarse lat/lng rounded to 2 decimal places (~200m grid for privacy)
    const coarseLat = Math.round(baseLat * 500) / 500;
    const coarseLng = Math.round(baseLng * 500) / 500;

    const cmp = await prisma.complaint.create({
      data: {
        code,
        villageId: v1.id,
        zoneId: t.zone.id,
        residentId: resident.id,
        category: t.category,
        title: t.title,
        description: t.description,
        photoUrl: t.photoUrl || null,
        proofPhotoUrl: t.proofPhotoUrl || null,
        lat: baseLat,
        lng: baseLng,
        coarseLat,
        coarseLng,
        address: `${t.zone.name}, Shivapur Village`,
        priorityScore: priority.score,
        priorityBand: priority.band,
        priorityFactors: JSON.stringify(priority.factors),
        status: t.status,
        assignedOrgType: t.org,
        residentRating: t.residentRating || null,
        residentFeedback: t.residentFeedback || null,
        residentConfirmed: t.residentConfirmed ?? null,
        supporterCount: Math.floor(Math.random() * 8),
        slaHours: priority.band === 'CRITICAL' ? 24 : 48,
        createdAt: new Date(Date.now() - t.daysOpen * 86400 * 1000 - Math.random() * 3600000),
      },
    });

    createdComplaints.push(cmp);
  }

  // Generate additional complaints to reach 60 total
  const remainingCount = 60 - createdComplaints.length;
  const categoriesList = ['WATER', 'ELECTRICITY', 'ROADS', 'TRANSPORT', 'HEALTH', 'AGRICULTURE', 'EDUCATION', 'SANITATION', 'WOMEN_SAFETY', 'OTHER'];
  const orgMap: Record<string, string> = {
    WATER: 'JAL_SHAKTI',
    ELECTRICITY: 'MSEDCL_ELECTRICITY',
    ROADS: 'PWD_ROADS',
    TRANSPORT: 'PANCHAYAT',
    HEALTH: 'PHC_HEALTH',
    AGRICULTURE: 'KVK_AGRICULTURE',
    EDUCATION: 'PANCHAYAT',
    SANITATION: 'PANCHAYAT',
    WOMEN_SAFETY: 'PANCHAYAT',
    OTHER: 'PANCHAYAT',
  };

  for (let j = 0; j < remainingCount; j++) {
    const code = `CMP-2026-${String(codeCounter++).padStart(3, '0')}`;
    const cat = categoriesList[j % categoriesList.length];
    const zone = j % 3 === 0 ? zA : j % 3 === 1 ? zB : zC;
    const resident = residents[(j + 5) % residents.length];
    const urgency = Math.floor(Math.random() * 4) + 2;
    const people = Math.floor(Math.random() * 4) + 1;
    const days = Math.floor(Math.random() * 7);

    const priority = calculatePriority({
      urgency,
      peopleAffected: people,
      vulnerabilities: j % 2 === 0 ? ['elderly'] : ['children'],
      timeSensitivity: urgency,
      daysOpen: days,
      category: cat,
    });

    const baseLat = 18.3164 + (Math.random() - 0.5) * 0.018;
    const baseLng = 73.8682 + (Math.random() - 0.5) * 0.018;

    const statuses = ['SUBMITTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    const chosenStatus = statuses[j % statuses.length];

    const cmp = await prisma.complaint.create({
      data: {
        code,
        villageId: v1.id,
        zoneId: zone.id,
        residentId: resident.id,
        category: cat,
        title: `${cat.replace('_', ' ')}: Routine maintenance issue #${j + 1}`,
        description: `Community reported issue regarding ${cat.toLowerCase()} in ${zone.name}. Needs inspection by ${orgMap[cat]}.`,
        lat: baseLat,
        lng: baseLng,
        coarseLat: Math.round(baseLat * 500) / 500,
        coarseLng: Math.round(baseLng * 500) / 500,
        address: `${zone.name}, Shivapur`,
        priorityScore: priority.score,
        priorityBand: priority.band,
        priorityFactors: JSON.stringify(priority.factors),
        status: chosenStatus,
        assignedOrgType: orgMap[cat],
        supporterCount: Math.floor(Math.random() * 5),
        createdAt: new Date(Date.now() - days * 86400 * 1000),
      },
    });
    createdComplaints.push(cmp);
  }

  // 10. Add Specific Duplicate Complaint (Feature demonstration)
  const parentWater = createdComplaints[0];
  const duplicateComplaint = await prisma.complaint.create({
    data: {
      code: `CMP-2026-${String(codeCounter++).padStart(3, '0')}`,
      villageId: v1.id,
      zoneId: zA.id,
      residentId: residents[4].id,
      category: 'WATER',
      title: 'Main water pipe leak at north tank area',
      description: 'Underground pipeline burst near north water tower, dirty water spilling on road.',
      lat: parentWater.lat + 0.0002, // 22 meters away
      lng: parentWater.lng + 0.0002,
      coarseLat: parentWater.coarseLat,
      coarseLng: parentWater.coarseLng,
      address: 'Near North Water Tank, Zone A',
      priorityScore: parentWater.priorityScore,
      priorityBand: parentWater.priorityBand,
      priorityFactors: parentWater.priorityFactors,
      status: 'SUBMITTED',
      assignedOrgType: 'JAL_SHAKTI',
      parentComplaintId: parentWater.id, // Grouped as duplicate cluster
      supporterCount: 3,
      createdAt: new Date(Date.now() - 3600 * 1000 * 3),
    },
  });

  // 11. Add Specific Spam Complaint (Feature demonstration - in Sarpanch Moderation Queue)
  const spamComplaint = await prisma.complaint.create({
    data: {
      code: `CMP-2026-${String(codeCounter++).padStart(3, '0')}`,
      villageId: v1.id,
      zoneId: zB.id,
      residentId: residents[12].id,
      category: 'OTHER',
      title: 'Earn money fast casino lottery prize offer aaaaaaa',
      description: 'Win jackpot instant loan test ignore qwerty bakwas asdfgh loan offer online.',
      lat: 18.3164,
      lng: 73.8682,
      coarseLat: 18.316,
      coarseLng: 73.868,
      address: 'Zone B, Bazaar',
      priorityScore: 10,
      priorityBand: 'LOW',
      status: 'SUBMITTED',
      isSpam: true,
      moderationStatus: 'FLAGGED',
      spamReason: 'Repetitive character pattern; Suspicious promotional keywords: "casino", "lottery", "loan offer"',
      createdAt: new Date(Date.now() - 3600 * 1000 * 5),
    },
  });

  // 12. Add Anonymous Complaint with tracking code
  await prisma.complaint.create({
    data: {
      code: `CMP-2026-${String(codeCounter++).padStart(3, '0')}`,
      villageId: v1.id,
      zoneId: zB.id,
      residentId: null, // anonymous
      isAnonymous: true,
      anonymousTrackingCode: 'GS-ANON-7829-X',
      category: 'WOMEN_SAFETY',
      title: 'Persistent harassment of women near public handpump after sunset',
      description: 'Two individuals consistently loitering and passing vulgar remarks to women fetching water in Zone B. Sensitive issue - reported anonymously.',
      lat: 18.3165,
      lng: 73.8681,
      coarseLat: 18.316,
      coarseLng: 73.868,
      address: 'Zone B Handpump Chowk',
      priorityScore: 82,
      priorityBand: 'CRITICAL',
      priorityFactors: JSON.stringify({
        urgency: 5,
        peopleAffected: 3,
        vulnerabilities: ['pregnant', 'children'],
        timeSensitivity: 5,
        explanation: 'Sensitive women harassment alert filed anonymously. Immediate Sarpanch intervention required.',
      }),
      status: 'VERIFIED',
      assignedOrgType: 'PANCHAYAT',
      createdAt: new Date(Date.now() - 3600 * 1000 * 8),
    },
  });

  // 13. Create Resource Requests demonstrating Service Gap in Zone B
  // 7 tractor requests vs only 1 tractor available in Zone B!
  for (let k = 1; k <= 7; k++) {
    await prisma.resourceRequest.create({
      data: {
        villageId: v1.id,
        zoneId: zB.id,
        requesterId: residents[k].id,
        category: 'EQUIPMENT',
        title: `Harvesting and land preparation tractor needed - Farmer #${k}`,
        description: `Need 45+ HP tractor with rotavator for 3 acres sowing work before weekend rains.`,
        neededAt: new Date(Date.now() + 86400 * 1000 * (k % 3 + 1)),
        durationHours: 6,
        urgency: k <= 2 ? 'HIGH' : 'MEDIUM',
        status: k === 1 ? 'ACCEPTED' : 'PENDING',
        matchedProviderId: k === 1 ? providers[0].id : null,
      },
    });
  }

  // 14. Create Notifications for role-targeted top ticker
  await prisma.notification.create({
    data: {
      villageId: v1.id,
      targetRole: 'ALL',
      type: 'EMERGENCY',
      title: 'Heavy Rainfall Alert',
      message: 'Continuous downpour in Western Ghats. Avoid crossing Southern River causeways.',
      link: '/village-board',
    },
  });

  await prisma.notification.create({
    data: {
      villageId: v1.id,
      targetRole: 'SARPANCH',
      type: 'SOS',
      title: 'Active SOS Alert in Zone C',
      message: 'Shobha Shinde triggered emergency alert near canal road. Nearby volunteers dispatched.',
      link: '/sos',
    },
  });

  await prisma.notification.create({
    data: {
      villageId: v1.id,
      targetRole: 'RESIDENT',
      type: 'STATUS_UPDATE',
      title: 'Drinking Water Issue #CMP-2026-001 Assigned',
      message: 'Jal Shakti Department technician dispatched with replacement pipe section.',
      link: '/complaints/track',
    },
  });

  console.log(`✅ Finished seeding realistic GramSetu database! Total complaints: 63`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
