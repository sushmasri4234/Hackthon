import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding CertiFlow database...');

  // ─── Districts ─────────────────────────────────────────────────────────────
  const [pune, nashik, aurangabad] = await Promise.all([
    prisma.district.upsert({ where: { name: 'Pune' }, update: {}, create: { name: 'Pune', stateCode: 'MH' } }),
    prisma.district.upsert({ where: { name: 'Nashik' }, update: {}, create: { name: 'Nashik', stateCode: 'MH' } }),
    prisma.district.upsert({ where: { name: 'Aurangabad' }, update: {}, create: { name: 'Aurangabad', stateCode: 'MH' } }),
  ]);

  console.log('✓ Districts created');

  // ─── Training Centres ──────────────────────────────────────────────────────
  const [tc1, tc2] = await Promise.all([
    prisma.trainingCentre.upsert({
      where: { code: 'TC-PUNE-001' },
      update: {},
      create: { name: 'Pune Skill Development Centre', code: 'TC-PUNE-001', districtId: pune.id },
    }),
    prisma.trainingCentre.upsert({
      where: { code: 'TC-NSK-001' },
      update: {},
      create: { name: 'Nashik Vocational Institute', code: 'TC-NSK-001', districtId: nashik.id },
    }),
  ]);

  console.log('✓ Training Centres created');

  // ─── Demo Users ────────────────────────────────────────────────────────────
  const DEFAULT_PASSWORD = 'Demo@1234';
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const users = [
    {
      name: 'Anika Sharma',
      email: 'anika@certiflow.demo',
      role: 'TRAINING_CENTRE' as UserRole,
      trainingCentreId: tc1.id,
      districtId: null,
    },
    {
      name: 'Dev Kulkarni',
      email: 'dev@certiflow.demo',
      role: 'DISTRICT_OFFICER' as UserRole,
      trainingCentreId: null,
      districtId: pune.id,
    },
    {
      name: 'Meera Joshi',
      email: 'meera@certiflow.demo',
      role: 'DISTRICT_OFFICER' as UserRole,
      trainingCentreId: null,
      districtId: pune.id,
    },
    {
      name: 'Kabir Patel',
      email: 'kabir@certiflow.demo',
      role: 'DISTRICT_OFFICER' as UserRole,
      trainingCentreId: null,
      districtId: nashik.id,
    },
    {
      name: 'Neha Gupta',
      email: 'neha@certiflow.demo',
      role: 'QUALITY_TEAM' as UserRole,
      trainingCentreId: null,
      districtId: null,
    },
    {
      name: 'Farah Khan',
      email: 'farah@certiflow.demo',
      role: 'STATE_OFFICE' as UserRole,
      trainingCentreId: null,
      districtId: null,
    },
  ];

  for (const userData of users) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        name: userData.name,
        email: userData.email,
        passwordHash: hash,
        role: userData.role,
        trainingCentreId: userData.trainingCentreId || undefined,
        districtId: userData.districtId || undefined,
      },
    });
  }

  console.log('✓ Demo users created');
  console.log('\n📋 Demo Credentials:');
  console.log('='.repeat(55));
  users.forEach((u) => {
    console.log(`  ${u.role.padEnd(20)} | ${u.email.padEnd(28)} | ${DEFAULT_PASSWORD}`);
  });
  console.log('='.repeat(55));

  // ─── Sample Batch ──────────────────────────────────────────────────────────
  const anika = await prisma.user.findUnique({ where: { email: 'anika@certiflow.demo' } });
  if (anika) {
    const existingBatch = await prisma.batch.findFirst({ where: { batchName: 'Sample Batch 2024-01' } });
    if (!existingBatch) {
      const sampleBatch = await prisma.batch.create({
        data: {
          trainingCentreId: tc1.id,
          districtId: pune.id,
          uploadedById: anika.id,
          courseName: 'Basic Computer Skills',
          batchName: 'Sample Batch 2024-01',
          notes: 'Sample batch for demonstration',
          status: 'DRAFT',
          totalCandidates: 3,
        },
      });

      await prisma.candidate.createMany({
        data: [
          {
            batchId: sampleBatch.id,
            candidateExtId: 'CAND-001',
            fullName: 'Rajesh Kumar',
            phone: '9876543210',
            email: 'rajesh@example.com',
            courseName: 'Basic Computer Skills',
            trainingCentre: 'Pune Skill Development Centre',
            district: 'Pune',
            marks: 85.5,
            completionDate: new Date('2024-10-15'),
            status: 'PENDING',
          },
          {
            batchId: sampleBatch.id,
            candidateExtId: 'CAND-002',
            fullName: 'Priya Deshmukh',
            phone: '9765432109',
            email: 'priya@example.com',
            courseName: 'Basic Computer Skills',
            trainingCentre: 'Pune Skill Development Centre',
            district: 'Pune',
            marks: 92.0,
            completionDate: new Date('2024-10-15'),
            status: 'PENDING',
          },
          {
            batchId: sampleBatch.id,
            candidateExtId: 'CAND-003',
            fullName: 'Amit Patil',
            phone: '8765432108',
            courseName: 'Basic Computer Skills',
            trainingCentre: 'Pune Skill Development Centre',
            district: 'Pune',
            marks: 78.0,
            completionDate: new Date('2024-10-15'),
            status: 'PENDING',
          },
        ],
      });

      console.log('\n✓ Sample batch created (3 candidates, DRAFT status)');
    }
  }

  console.log('\n✅ Database seeded successfully!');
  console.log('🚀 Run `npm run dev` to start the backend server');
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
