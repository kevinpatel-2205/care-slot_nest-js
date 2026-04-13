import {
  PrismaClient,
  Role,
  Gender,
  AppointmentStatus,
  PaymentStatus,
  PaymentMethod,
  MealTime,
  Timing,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning existing data...');

  // ── Delete in dependency order (children first) ──────────────
  await prisma.medicineTiming.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.availableSlot.deleteMany();
  await prisma.commissionHistory.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ All existing data removed.\n');
  console.log('🌱 Seeding database...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // ─────────────────────────────────────────────────────────────
  // ADMIN
  // ─────────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'admin@careslot.com',
      password: hashedPassword,
      phone: '9000000000',
      role: Role.ADMIN,
    },
  });
  console.log('✅ Admin created: admin@careslot.com');

  // ─────────────────────────────────────────────────────────────
  // DOCTORS  (with AvailableSlots + CommissionHistory)
  // ─────────────────────────────────────────────────────────────
  const doctorsData = [
    {
      name: 'Dr. Arjun Mehta',
      email: 'arjun.mehta@careslot.com',
      phone: '9111111111',
      specialization: 'Cardiologist',
      experience: 12,
      about: 'Expert in heart diseases with 12 years of experience.',
      consultationFee: 800,
      commission: 10,
      latitude: 21.1702,
      longitude: 72.8311,
      address: 'Surat, Gujarat',
    },
    {
      name: 'Dr. Priya Shah',
      email: 'priya.shah@careslot.com',
      phone: '9222222222',
      specialization: 'Dermatologist',
      experience: 8,
      about: 'Specialist in skin care and cosmetic dermatology.',
      consultationFee: 600,
      commission: 12,
      latitude: 23.0225,
      longitude: 72.5714,
      address: 'Ahmedabad, Gujarat',
    },
    {
      name: 'Dr. Rohit Verma',
      email: 'rohit.verma@careslot.com',
      phone: '9333333333',
      specialization: 'Neurologist',
      experience: 15,
      about: 'Experienced neurologist treating brain and spine conditions.',
      consultationFee: 1000,
      commission: 15,
      latitude: 19.076,
      longitude: 72.8777,
      address: 'Mumbai, Maharashtra',
    },
  ];

  const createdDoctors: {
    id: string;
    consultationFee: number;
    commission: number;
  }[] = [];

  for (const d of doctorsData) {
    // Generate slots for the next 5 days
    const slots: { date: Date; time: string }[] = [];
    const times = [
      '09:00 AM',
      '10:00 AM',
      '11:00 AM',
      '02:00 PM',
      '03:00 PM',
      '04:00 PM',
    ];
    for (let i = 1; i <= 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);
      for (const time of times) {
        slots.push({ date, time });
      }
    }

    const doctorUser = await prisma.user.create({
      data: {
        name: d.name,
        email: d.email,
        password: hashedPassword,
        phone: d.phone,
        role: Role.DOCTOR,
        doctor: {
          create: {
            specialization: d.specialization,
            experience: d.experience,
            about: d.about,
            consultationFee: d.consultationFee,
            commission: d.commission,
            isApproved: true,
            latitude: d.latitude,
            longitude: d.longitude,
            address: d.address,
            commissionHistory: {
              create: [
                {
                  commission: d.commission - 2,
                  changedAt: new Date('2024-01-01'),
                },
                { commission: d.commission },
              ],
            },
            availableSlots: {
              create: slots,
            },
          },
        },
      },
      include: { doctor: true },
    });

    createdDoctors.push({
      id: doctorUser.doctor!.id,
      consultationFee: d.consultationFee,
      commission: d.commission,
    });

    console.log(`✅ Doctor created: ${doctorUser.email} (${d.specialization})`);
  }

  // ─────────────────────────────────────────────────────────────
  // PATIENTS
  // ─────────────────────────────────────────────────────────────
  const patientsData = [
    {
      name: 'Ramesh Patel',
      email: 'ramesh.patel@gmail.com',
      phone: '9444444444',
      gender: Gender.MALE,
      dateOfBirth: new Date('1985-03-15'),
      address: 'Surat, Gujarat',
      latitude: 21.1702,
      longitude: 72.8311,
      medicalHistory: 'Hypertension, controlled with medication.',
    },
    {
      name: 'Sunita Joshi',
      email: 'sunita.joshi@gmail.com',
      phone: '9555555555',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('1992-07-22'),
      address: 'Ahmedabad, Gujarat',
      latitude: 23.0225,
      longitude: 72.5714,
      medicalHistory: 'Mild eczema. No known allergies.',
    },
    {
      name: 'Kiran Desai',
      email: 'kiran.desai@gmail.com',
      phone: '9666666666',
      gender: Gender.MALE,
      dateOfBirth: new Date('1978-11-05'),
      address: 'Mumbai, Maharashtra',
      latitude: 19.076,
      longitude: 72.8777,
      medicalHistory: 'History of migraines. On preventive therapy.',
    },
  ];

  const createdPatients: { id: string }[] = [];

  for (const p of patientsData) {
    const patientUser = await prisma.user.create({
      data: {
        name: p.name,
        email: p.email,
        password: hashedPassword,
        phone: p.phone,
        role: Role.PATIENT,
        patient: {
          create: {
            gender: p.gender,
            dateOfBirth: p.dateOfBirth,
            address: p.address,
            latitude: p.latitude,
            longitude: p.longitude,
            medicalHistory: p.medicalHistory,
          },
        },
      },
      include: { patient: true },
    });

    createdPatients.push({ id: patientUser.patient!.id });
    console.log(`✅ Patient created: ${patientUser.email}`);
  }

  // ─────────────────────────────────────────────────────────────
  // APPOINTMENTS  →  PAYMENTS  →  PRESCRIPTIONS  →  MEDICINES
  // ─────────────────────────────────────────────────────────────

  // Appointment 1 — COMPLETED + PAID (Razorpay) + Prescription
  const appt1 = await prisma.appointment.create({
    data: {
      doctorId: createdDoctors[0].id, // Dr. Arjun Mehta (Cardiologist)
      patientId: createdPatients[0].id, // Ramesh Patel
      appointmentDate: new Date('2025-03-10T09:00:00.000Z'),
      timeSlot: '09:00 AM',
      status: AppointmentStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.RAZORPAY,
      consultationFee: createdDoctors[0].consultationFee,
      adminCommission:
        (createdDoctors[0].consultationFee * createdDoctors[0].commission) /
        100,
      prescriptionAdded: true,
      notes: 'Patient complained of chest pain. ECG done. BP monitored.',
    },
  });

  await prisma.payment.create({
    data: {
      appointmentId: appt1.id,
      doctorId: createdDoctors[0].id,
      patientId: createdPatients[0].id,
      amount: createdDoctors[0].consultationFee,
      paymentMethod: PaymentMethod.RAZORPAY,
      razorpayOrderId: 'order_TestRZP001',
      razorpayPaymentId: 'pay_TestRZP001',
      status: PaymentStatus.PAID,
    },
  });

  const prescription1 = await prisma.prescription.create({
    data: {
      appointmentId: appt1.id,
      doctorId: createdDoctors[0].id,
      patientId: createdPatients[0].id,
      notes:
        'Take medicines regularly. Follow low-sodium diet. Review after 4 weeks.',
      medicines: {
        create: [
          {
            medicineName: 'Amlodipine',
            dosage: '5mg',
            duration: '30 days',
            mealTime: MealTime.AFTER_MEAL,
            timings: { create: [{ timing: Timing.MORNING }] },
          },
          {
            medicineName: 'Metoprolol',
            dosage: '25mg',
            duration: '30 days',
            mealTime: MealTime.AFTER_MEAL,
            timings: {
              create: [{ timing: Timing.MORNING }, { timing: Timing.NIGHT }],
            },
          },
        ],
      },
    },
  });
  console.log(`✅ Appointment 1 created (COMPLETED, PAID, Prescription added)`);

  // Appointment 2 — COMPLETED + PAID (Cash) + Prescription
  const appt2 = await prisma.appointment.create({
    data: {
      doctorId: createdDoctors[1].id, // Dr. Priya Shah (Dermatologist)
      patientId: createdPatients[1].id, // Sunita Joshi
      appointmentDate: new Date('2025-03-12T10:00:00.000Z'),
      timeSlot: '10:00 AM',
      status: AppointmentStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.CASH,
      consultationFee: createdDoctors[1].consultationFee,
      adminCommission:
        (createdDoctors[1].consultationFee * createdDoctors[1].commission) /
        100,
      prescriptionAdded: true,
      notes: 'Eczema flare-up on arms. Topical steroids recommended.',
    },
  });

  await prisma.payment.create({
    data: {
      appointmentId: appt2.id,
      doctorId: createdDoctors[1].id,
      patientId: createdPatients[1].id,
      amount: createdDoctors[1].consultationFee,
      paymentMethod: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
    },
  });

  await prisma.prescription.create({
    data: {
      appointmentId: appt2.id,
      doctorId: createdDoctors[1].id,
      patientId: createdPatients[1].id,
      notes:
        'Apply cream twice daily. Avoid harsh soaps. Moisturise regularly.',
      medicines: {
        create: [
          {
            medicineName: 'Hydrocortisone Cream',
            dosage: '1% topical',
            duration: '14 days',
            mealTime: MealTime.AFTER_MEAL,
            timings: {
              create: [{ timing: Timing.MORNING }, { timing: Timing.NIGHT }],
            },
          },
          {
            medicineName: 'Cetirizine',
            dosage: '10mg',
            duration: '7 days',
            mealTime: MealTime.AFTER_MEAL,
            timings: { create: [{ timing: Timing.NIGHT }] },
          },
        ],
      },
    },
  });
  console.log(
    `✅ Appointment 2 created (COMPLETED, PAID Cash, Prescription added)`,
  );

  // Appointment 3 — COMPLETED + PAID (Razorpay) + Prescription
  const appt3 = await prisma.appointment.create({
    data: {
      doctorId: createdDoctors[2].id, // Dr. Rohit Verma (Neurologist)
      patientId: createdPatients[2].id, // Kiran Desai
      appointmentDate: new Date('2025-03-14T11:00:00.000Z'),
      timeSlot: '11:00 AM',
      status: AppointmentStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.RAZORPAY,
      consultationFee: createdDoctors[2].consultationFee,
      adminCommission:
        (createdDoctors[2].consultationFee * createdDoctors[2].commission) /
        100,
      prescriptionAdded: true,
      notes: 'Migraine assessment. Preventive therapy adjusted.',
    },
  });

  await prisma.payment.create({
    data: {
      appointmentId: appt3.id,
      doctorId: createdDoctors[2].id,
      patientId: createdPatients[2].id,
      amount: createdDoctors[2].consultationFee,
      paymentMethod: PaymentMethod.RAZORPAY,
      razorpayOrderId: 'order_TestRZP002',
      razorpayPaymentId: 'pay_TestRZP002',
      status: PaymentStatus.PAID,
    },
  });

  await prisma.prescription.create({
    data: {
      appointmentId: appt3.id,
      doctorId: createdDoctors[2].id,
      patientId: createdPatients[2].id,
      notes:
        'Continue preventive therapy. Log migraine triggers. Follow up in 6 weeks.',
      medicines: {
        create: [
          {
            medicineName: 'Propranolol',
            dosage: '40mg',
            duration: '45 days',
            mealTime: MealTime.BEFORE_MEAL,
            timings: {
              create: [{ timing: Timing.MORNING }, { timing: Timing.NIGHT }],
            },
          },
          {
            medicineName: 'Sumatriptan',
            dosage: '50mg (as needed)',
            duration: 'As required',
            mealTime: MealTime.AFTER_MEAL,
            timings: { create: [{ timing: Timing.AFTERNOON }] },
          },
        ],
      },
    },
  });
  console.log(
    `✅ Appointment 3 created (COMPLETED, PAID Razorpay, Prescription added)`,
  );

  // Appointment 4 — CONFIRMED + PENDING PAYMENT (upcoming)
  await prisma.appointment.create({
    data: {
      doctorId: createdDoctors[0].id, // Dr. Arjun Mehta
      patientId: createdPatients[1].id, // Sunita Joshi
      appointmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      timeSlot: '02:00 PM',
      status: AppointmentStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.RAZORPAY,
      consultationFee: createdDoctors[0].consultationFee,
      adminCommission:
        (createdDoctors[0].consultationFee * createdDoctors[0].commission) /
        100,
      prescriptionAdded: false,
      notes: 'Follow-up for cardiac screening.',
    },
  });
  console.log(
    `✅ Appointment 4 created (CONFIRMED, payment pending — upcoming)`,
  );

  // Appointment 5 — CANCELLED
  await prisma.appointment.create({
    data: {
      doctorId: createdDoctors[1].id, // Dr. Priya Shah
      patientId: createdPatients[2].id, // Kiran Desai
      appointmentDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      timeSlot: '11:00 AM',
      status: AppointmentStatus.CANCELLED,
      paymentStatus: PaymentStatus.FAILED,
      paymentMethod: PaymentMethod.RAZORPAY,
      consultationFee: createdDoctors[1].consultationFee,
      adminCommission: 0,
      prescriptionAdded: false,
      notes: 'Patient cancelled due to personal reasons.',
    },
  });
  console.log(`✅ Appointment 5 created (CANCELLED)`);

  // Appointment 6 — PENDING (just booked)
  await prisma.appointment.create({
    data: {
      doctorId: createdDoctors[2].id, // Dr. Rohit Verma
      patientId: createdPatients[0].id, // Ramesh Patel
      appointmentDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      timeSlot: '03:00 PM',
      status: AppointmentStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.CASH,
      consultationFee: createdDoctors[2].consultationFee,
      adminCommission:
        (createdDoctors[2].consultationFee * createdDoctors[2].commission) /
        100,
      prescriptionAdded: false,
      notes: 'New consultation for headache evaluation.',
    },
  });
  console.log(`✅ Appointment 6 created (PENDING)`);

  // ─────────────────────────────────────────────────────────────
  // REVIEWS  (only for COMPLETED appointments)
  // ─────────────────────────────────────────────────────────────
  const reviewsData = [
    {
      doctorId: createdDoctors[0].id,
      patientId: createdPatients[0].id,
      rating: 5,
      comment:
        'Dr. Mehta was thorough and very professional. Highly recommended!',
      isApprove: true,
      aiReason: 'Positive review with no harmful content.',
    },
    {
      doctorId: createdDoctors[1].id,
      patientId: createdPatients[1].id,
      rating: 4,
      comment: 'Very helpful and explained the condition clearly.',
      isApprove: true,
      aiReason: 'Constructive and positive review.',
    },
    {
      doctorId: createdDoctors[2].id,
      patientId: createdPatients[2].id,
      rating: 5,
      comment: 'Excellent doctor. My migraines are much better now.',
      isApprove: true,
      aiReason: 'Genuine positive review.',
    },
  ];

  for (const r of reviewsData) {
    await prisma.review.create({ data: r });
  }

  // Update doctor averageRating and totalReviews
  await prisma.doctor.update({
    where: { id: createdDoctors[0].id },
    data: { averageRating: 5.0, totalReviews: 1 },
  });
  await prisma.doctor.update({
    where: { id: createdDoctors[1].id },
    data: { averageRating: 4.0, totalReviews: 1 },
  });
  await prisma.doctor.update({
    where: { id: createdDoctors[2].id },
    data: { averageRating: 5.0, totalReviews: 1 },
  });

  console.log(`✅ Reviews created and doctor ratings updated`);

  // ─────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────
  console.log('\n🎉 Seeding complete!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Role     │ Email                          │ Password');
  console.log('─────────┼────────────────────────────────┼────────────');
  console.log('Admin    │ admin@careslot.com             │ password123');
  console.log('Doctor   │ arjun.mehta@careslot.com       │ password123');
  console.log('Doctor   │ priya.shah@careslot.com        │ password123');
  console.log('Doctor   │ rohit.verma@careslot.com       │ password123');
  console.log('Patient  │ ramesh.patel@gmail.com         │ password123');
  console.log('Patient  │ sunita.joshi@gmail.com         │ password123');
  console.log('Patient  │ kiran.desai@gmail.com          │ password123');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📋 Seeded data summary:');
  console.log('  • 1 Admin');
  console.log(
    '  • 3 Doctors  (with AvailableSlots × 30 each, CommissionHistory × 2 each)',
  );
  console.log('  • 3 Patients (with gender, DOB, address, medical history)');
  console.log(
    '  • 6 Appointments (COMPLETED×3, CONFIRMED×1, CANCELLED×1, PENDING×1)',
  );
  console.log('  • 2 Payments via Razorpay, 1 via Cash');
  console.log('  • 3 Prescriptions with Medicines + MedicineTimings');
  console.log('  • 3 Reviews (approved, with AI reason)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
