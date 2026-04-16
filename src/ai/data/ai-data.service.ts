import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AiDataService {
  constructor(private readonly prisma: PrismaService) { }

// For Guest User.
  async getGuestData() {
    const doctors = await this.prisma.doctor.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        specialization: true,
        experience: true,
        about: true,
        consultationFee: true,
        averageRating: true,
        totalReviews: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
      },
    });

    return doctors.filter((doc) => doc.user?.isActive === true);
  }

// For Patient User.
  async getPatientData(userId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { userId, isDeleted: false },
      select: {
        id: true,
        dateOfBirth: true,
        gender: true,
        medicalHistory: true,
        latitude: true,
        longitude: true,
        address: true,
        user: {
          select: { name: true, email: true, phone: true },
        },
      },
    });

    if (!patient) throw new NotFoundException('Patient not found');

    const patientId = patient.id;

    const [
      totalAppointments,
      pendingAppointments,
      completedAppointments,
      upcomingAppointments,
      reviews,
    ] = await Promise.all([
      this.prisma.appointment.count({
        where: { patientId, isDeleted: false },
      }),
      this.prisma.appointment.count({
        where: { patientId, status: 'PENDING', isDeleted: false },
      }),
      this.prisma.appointment.count({
        where: { patientId, status: 'COMPLETED', isDeleted: false },
      }),
      this.prisma.appointment.count({
        where: {
          patientId,
          isDeleted: false,
          status: { in: ['PENDING', 'CONFIRMED'] },
          appointmentDate: { gte: new Date() },
        },
      }),
      this.prisma.review.findMany({
        where: { patientId, isDeleted: false },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          doctor: {
            select: {
              specialization: true,
              user: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    return {
      patient,
      meta: {
        totalAppointments,
        pendingAppointments,
        completedAppointments,
        upcomingAppointments,
      },
      reviews,
    };
  }

  async getPatientAllDoctors() {
    const doctors = await this.prisma.doctor.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        specialization: true,
        experience: true,
        about: true,
        consultationFee: true,
        averageRating: true,
        totalReviews: true,
        user: {
          select: { name: true, email: true, phone: true, isActive: true },
        },
      },
    });

    return doctors.filter((doc) => doc.user?.isActive === true);
  }

  async getPatientAppointments(userId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true },
    });

    if (!patient) throw new NotFoundException('Patient not found');

    const appointments = await this.prisma.appointment.findMany({
      where: { patientId: patient.id, isDeleted: false },
      orderBy: { appointmentDate: 'desc' },
      select: {
        id: true,
        appointmentDate: true,
        timeSlot: true,
        status: true,
        consultationFee: true,
        prescriptionAdded: true,
        paymentStatus: true,
        paymentMethod: true,
        notes: true,
        doctor: {
          select: {
            specialization: true,
            experience: true,
            consultationFee: true,
            averageRating: true,
            user: { select: { name: true, email: true, phone: true } },
          },
        },
        prescription: {
          select: {
            id: true,
            notes: true,
            medicines: {
              select: {
                medicineName: true,
                dosage: true,
                timings: true,
                mealTime: true,
                duration: true,
              },
            },
          },
        },
      },
    });

    return appointments;
  }

  async getPatientNearDoctors(userId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true, latitude: true, longitude: true },
    });

    if (!patient) throw new NotFoundException('Patient not found');

    if (!patient.latitude || !patient.longitude) {
      throw new NotFoundException('Patient location not set');
    }

    const nearDoctors = await this.prisma.$queryRaw<
      {
        id: string;
        specialization: string;
        experience: number;
        consultationFee: number;
        averageRating: number;
        totalReviews: number;
        address: string | null;
        name: string;
        email: string;
        phone: string | null;
        distance_km: number;
      }[]
    >`
      SELECT
        d.id,
        d.specialization,
        d.experience,
        d."consultationFee",
        d."averageRating",
        d."totalReviews",
        d.address,
        u.name,
        u.email,
        u.phone,
        (
          6371 * acos(
            cos(radians(${patient.latitude})) *
            cos(radians(d.latitude)) *
            cos(radians(d.longitude) - radians(${patient.longitude})) +
            sin(radians(${patient.latitude})) *
            sin(radians(d.latitude))
          )
        ) AS distance_km
      FROM "Doctor" d
      JOIN "User" u ON u.id = d."userId"
      WHERE
        d."isDeleted" = false
        AND u."isActive" = true
        AND d.latitude IS NOT NULL
        AND d.longitude IS NOT NULL
        AND (
          6371 * acos(
            cos(radians(${patient.latitude})) *
            cos(radians(d.latitude)) *
            cos(radians(d.longitude) - radians(${patient.longitude})) +
            sin(radians(${patient.latitude})) *
            sin(radians(d.latitude))
          )
        ) <= 5
      ORDER BY distance_km ASC
      LIMIT 10
    `;

    return nearDoctors;
  }

// For Doctor User.
  async getDoctorAppointments(userId: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true },
    });

    if (!doctor) throw new NotFoundException('Doctor not found');

    const appointments = await this.prisma.appointment.findMany({
      where: { doctorId: doctor.id, isDeleted: false },
      orderBy: { appointmentDate: 'desc' },
      take: 20,
      select: {
        id: true,
        appointmentDate: true,
        timeSlot: true,
        status: true,
        consultationFee: true,
        adminCommission: true,
        prescriptionAdded: true,
        paymentStatus: true,
        paymentMethod: true,
        notes: true,
        patient: {
          select: {
            id: true,
            dateOfBirth: true,
            gender: true,
            medicalHistory: true,
            user: {
              select: { name: true, email: true, phone: true, image: true },
            },
          },
        },
        prescription: {
          select: {
            id: true,
            notes: true,
            medicines: {
              select: {
                medicineName: true,
                dosage: true,
                timings: true,
                mealTime: true,
                duration: true,
              },
            },
          },
        },
      },
    });

    return appointments;
  }

  async getDoctorProfile(userId: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
      select: {
        id: true,
        specialization: true,
        experience: true,
        about: true,
        consultationFee: true,
        averageRating: true,
        totalReviews: true,
        commission: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        availableSlots: {
          where: { date: { gte: new Date() } },
          orderBy: { date: 'asc' },
          select: { date: true, time: true },
          take: 20,
        },
      },
    });

    if (!doctor) throw new NotFoundException('Doctor not found');

    const doctorId = doctor.id;

    const [
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      completedAppointments,
      cancelledAppointments,
      earningsData,
    ] = await Promise.all([
      this.prisma.appointment.count({
        where: { doctorId, isDeleted: false },
      }),
      this.prisma.appointment.count({
        where: { doctorId, status: 'PENDING', isDeleted: false },
      }),
      this.prisma.appointment.count({
        where: { doctorId, status: 'CONFIRMED', isDeleted: false },
      }),
      this.prisma.appointment.count({
        where: { doctorId, status: 'COMPLETED', isDeleted: false },
      }),
      this.prisma.appointment.count({
        where: { doctorId, status: 'CANCELLED', isDeleted: false },
      }),
      this.prisma.appointment.aggregate({
        where: {
          doctorId,
          status: 'COMPLETED',
          isDeleted: false,
        },
        _sum: { consultationFee: true, adminCommission: true },
      }),
    ]);

    const totalEarnings =
      (earningsData._sum.consultationFee ?? 0) -
      (earningsData._sum.adminCommission ?? 0);

    return {
      ...doctor,
      summary: {
        totalAppointments,
        pendingAppointments,
        confirmedAppointments,
        completedAppointments,
        cancelledAppointments,
        totalEarnings,
        totalCommissionPaid: earningsData._sum.adminCommission ?? 0,
      },
    };
  }

  async getDoctorReviews(userId: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true },
    });

    if (!doctor) throw new NotFoundException('Doctor not found');

    const reviews = await this.prisma.review.findMany({
      where: { doctorId: doctor.id, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        isApprove: true,
        createdAt: true,
        patient: {
          select: {
            gender: true,
            user: { select: { name: true, image: true } },
          },
        },
      },
    });

    return reviews;
  }

// For Admin User.
  async getAdminDoctorData() {
    const doctors = await this.prisma.doctor.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        specialization: true,
        experience: true,
        about: true,
        consultationFee: true,
        averageRating: true,
        totalReviews: true,
        commission: true,
        user: {
          select: { name: true, email: true, phone: true, isActive: true },
        },
      },
    });

    return doctors;
  }

  async getAdminPatientData() {
    const patients = await this.prisma.patient.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        dateOfBirth: true,
        gender: true,
        medicalHistory: true,
        user: {
          select: { name: true, email: true, phone: true, isActive: true },
        },
      },
    });

    return patients;
  }

  async getAdminAppointmentData() {
    const appointments = await this.prisma.appointment.findMany({
      where: { isDeleted: false },
      orderBy: [{ appointmentDate: 'desc' }, { timeSlot: 'asc' }],
      take: 50,
      select: {
        id: true,
        appointmentDate: true,
        timeSlot: true,
        status: true,
        adminCommission: true,
        prescriptionAdded: true,
        patient: {
          select: {
            user: { select: { name: true, email: true } },
          },
        },
        doctor: {
          select: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    return appointments;
  }

  async getAdminReviewData() {
    const reviews = await this.prisma.review.findMany({
      where: { isApprove: true, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        patient: {
          select: {
            user: { select: { name: true } },
          },
        },
        doctor: {
          select: {
            user: { select: { name: true } },
          },
        },
      },
    });

    return reviews;
  }
}