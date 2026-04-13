import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';

import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import type { AppointmentStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private generatePassword(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';

    return Array.from(
      { length: 10 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');
  }

  async getDashboard() {
    const [
      totalDoctors,
      totalPatients,
      commissionData,
      topEarningDoctors,
      topBookedDoctors,
    ] = await Promise.all([
      this.prisma.doctor.count({
        where: { isDeleted: false },
      }),

      this.prisma.patient.count({
        where: { isDeleted: false },
      }),

      this.prisma.appointment.aggregate({
        where: {
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          isDeleted: false,
        },
        _sum: { adminCommission: true },
      }),

      this.prisma.appointment.groupBy({
        by: ['doctorId'],
        where: {
          status: 'COMPLETED',
          isDeleted: false,
        },
        _sum: { consultationFee: true, adminCommission: true },
        _count: { id: true },
        orderBy: { _sum: { consultationFee: 'desc' } },
        take: 5,
      }),

      this.prisma.appointment.groupBy({
        by: ['doctorId'],
        where: { isDeleted: false },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

    const monthlyRaw = await this.prisma.appointment.findMany({
      where: { isDeleted: false },
      select: { appointmentDate: true },
    });

    const monthlyMap: Record<number, number> = {};
    for (const appt of monthlyRaw) {
      const month = new Date(appt.appointmentDate).getMonth() + 1;
      monthlyMap[month] = (monthlyMap[month] ?? 0) + 1;
    }
    const monthlyAppointments = Object.entries(monthlyMap)
      .map(([month, total]) => ({ month: Number(month), total }))
      .sort((a, b) => a.month - b.month);

    const topEarningDoctorIds = topEarningDoctors.map((d) => d.doctorId);
    const topEarningDoctorDetails = await this.prisma.doctor.findMany({
      where: { id: { in: topEarningDoctorIds } },
      select: {
        id: true,
        user: { select: { name: true } },
      },
    });

    const earningDoctorMap = Object.fromEntries(
      topEarningDoctorDetails.map((d) => [d.id, d.user?.name]),
    );

    const topBookedDoctorIds = topBookedDoctors.map((d) => d.doctorId);
    const topBookedDoctorDetails = await this.prisma.doctor.findMany({
      where: { id: { in: topBookedDoctorIds } },
      select: {
        id: true,
        specialization: true,
        user: { select: { name: true } },
      },
    });

    const bookedDoctorMap = Object.fromEntries(
      topBookedDoctorDetails.map((d) => [d.id, d.user?.name]),
    );

    return {
      totalDoctors,
      totalPatients,
      totalCommission: commissionData._sum.adminCommission ?? 0,

      topEarningDoctors: topEarningDoctors.map((d) => ({
        doctorId: d.doctorId,
        name: earningDoctorMap[d.doctorId] ?? 'Unknown',
        totalEarning:
          (d._sum.consultationFee ?? 0) - (d._sum.adminCommission ?? 0),
        totalAppointments: d._count.id,
      })),

      topBookedDoctors: topBookedDoctors.map((d) => ({
        doctorId: d.doctorId,
        name: bookedDoctorMap[d.doctorId] ?? 'Unknown',
        totalAppointments: d._count.id,
      })),

      monthlyAppointments,
    };
  }

  async createDoctor(dto: CreateDoctorDto) {
    const {
      name,
      email,
      phone,
      specialization,
      experience,
      about,
      consultationFee,
      availableSlots,
      commission,
    } = dto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Doctor already exists with this email');
    }

    const password = this.generatePassword();

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          phone,
          password: hashedPassword,
          role: 'DOCTOR',
        },
      });

      const doctor = await tx.doctor.create({
        data: {
          userId: user.id,
          specialization,
          experience,
          about,
          consultationFee,
          commission,
        },
      });

      for (const slot of availableSlots) {
        for (const time of slot.times) {
          await tx.availableSlot.create({
            data: {
              doctorId: doctor.id,
              date: new Date(slot.date),
              time,
            },
          });
        }
      }

      return { user, doctor };
    });

    return {
      message: 'Doctor created successfully',
    };
  }

  async getAllDoctors(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const doctors = await this.prisma.doctor.findMany({
      where: {
        isDeleted: false,
      },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            image: true,
            isActive: true,
          },
        },
      },
    });

    const doctorIds = doctors.map((doc) => doc.id);

    const commissionData = await this.prisma.appointment.groupBy({
      by: ['doctorId'],
      where: {
        doctorId: { in: doctorIds },
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        isDeleted: false,
      },
      _sum: {
        adminCommission: true,
      },
    });

    const commissionMap: Record<string, number> = {};

    commissionData.forEach((item) => {
      commissionMap[item.doctorId] = item._sum.adminCommission || 0;
    });

    const formattedDoctors = doctors.map((doc) => ({
      doctorId: doc.id,
      name: doc.user?.name,
      email: doc.user?.email,
      phone: doc.user?.phone,
      image: doc.user?.image,
      isActive: doc.user?.isActive,
      specialization: doc.specialization,
      experience: doc.experience,
      commission: doc.commission,
      totalCommission: commissionMap[doc.id] || 0,
    }));

    const totalDoctors = await this.prisma.doctor.count({
      where: { isDeleted: false },
    });

    return {
      data: formattedDoctors,
      currentPage: page,
      totalPages: Math.ceil(totalDoctors / limit),
      total: totalDoctors,
    };
  }

  async toggleDoctorStatus(doctorId: string, isActive: boolean) {
    const doctor = await this.prisma.doctor.findFirst({
      where: {
        id: doctorId,
        isDeleted: false,
      },
      include: {
        user: true,
      },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (!doctor.user) {
      throw new NotFoundException('Associated user not found');
    }

    await this.prisma.user.update({
      where: {
        id: doctor.userId,
      },
      data: {
        isActive,
      },
    });

    return {
      message: `Doctor ${isActive ? 'activated' : 'deactivated'} successfully`,
      doctorId,
      isActive,
    };
  }

  async deleteDoctor(doctorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const doctor = await tx.doctor.findFirst({
        where: {
          id: doctorId,
          isDeleted: false,
        },
      });

      if (!doctor) {
        throw new NotFoundException('Doctor not found');
      }

      await tx.doctor.update({
        where: { id: doctorId },
        data: { isDeleted: true },
      });

      await tx.user.update({
        where: { id: doctor.userId },
        data: { isDeleted: true },
      });

      const appointments = await tx.appointment.findMany({
        where: {
          doctorId,
          isDeleted: false,
        },
        select: { id: true },
      });

      const appointmentIds = appointments.map((a) => a.id);

      await tx.appointment.updateMany({
        where: { doctorId },
        data: { isDeleted: true },
      });

      if (appointmentIds.length > 0) {
        await tx.payment.updateMany({
          where: {
            appointmentId: { in: appointmentIds },
          },
          data: { isDeleted: true },
        });
      }

      return {
        message: 'Doctor and related data deleted successfully',
        doctorId,
      };
    });
  }

  async getPatients(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;

    const whereCondition: Prisma.UserWhereInput = {
      role: 'PATIENT',
      isDeleted: false,
    };

    if (search) {
      whereCondition.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [patients, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },

        include: {
          patient: {
            include: {
              _count: {
                select: { appointments: true },
              },
            },
          },
        },
      }),

      this.prisma.user.count({
        where: whereCondition,
      }),
    ]);

    return {
      data: patients.map((p) => ({
        id: p.patient?.id,
        name: p.name,
        email: p.email,
        totalAppointments: p.patient?._count.appointments || 0,
      })),

      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deletePatient(patientId: string) {
    return this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findFirst({
        where: { id: patientId, isDeleted: false },
      });

      if (!patient) {
        throw new NotFoundException('Patient not found');
      }

      await tx.patient.update({
        where: { id: patientId },
        data: { isDeleted: true },
      });

      await tx.user.update({
        where: { id: patient.userId },
        data: { isDeleted: true },
      });

      const appointments = await tx.appointment.findMany({
        where: { patientId, isDeleted: false },
        select: { id: true },
      });

      const appointmentIds = appointments.map((a) => a.id);

      await tx.appointment.updateMany({
        where: { patientId },
        data: { isDeleted: true },
      });

      if (appointmentIds.length > 0) {
        await tx.payment.updateMany({
          where: { appointmentId: { in: appointmentIds } },
          data: { isDeleted: true },
        });
      }

      await tx.review.updateMany({
        where: { patientId },
        data: { isDeleted: true },
      });

      await tx.prescription.updateMany({
        where: { patientId },
        data: { isDeleted: true },
      });

      return {
        message: 'Patient and related data deleted successfully',
        patientId,
      };
    });
  }

  async getAppointments(
    page: number,
    limit: number,
    status?: AppointmentStatus,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.AppointmentWhereInput = {
      isDeleted: false,
      ...(status && { status }),
    };

    const [appointments, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ appointmentDate: 'desc' }, { timeSlot: 'asc' }],
        select: {
          id: true,
          appointmentDate: true,
          timeSlot: true,
          status: true,
          adminCommission: true,
          prescriptionAdded: true,
          paymentMethod: true,
          consultationFee: true,
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
      }),

      this.prisma.appointment.count({ where }),
    ]);

    return {
      data: appointments.map((appt) => ({
        appointmentId: appt.id,
        patientName: appt.patient?.user?.name ?? 'Unknown',
        doctorName: appt.doctor?.user?.name ?? 'Unknown',
        appointmentDate: appt.appointmentDate,
        timeSlot: appt.timeSlot,
        status: appt.status,
        consultationFee: appt.consultationFee,
        adminCommission: appt.adminCommission,
        paymentMethod: appt.paymentMethod,
        prescriptionAdded: appt.prescriptionAdded,
      })),
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    };
  }

  async getPendingReviews(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      isApprove: false,
      isDeleted: false,
    };

    const [reviews, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          patient: {
            select: {
              user: { select: { name: true, image: true } },
            },
          },
          doctor: {
            select: {
              user: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: reviews.map((r) => ({
        reviewId: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        patientName: r.patient?.user?.name ?? 'Unknown',
        patientImage: r.patient?.user?.image ?? null,
        doctorName: r.doctor?.user?.name ?? 'Unknown',
      })),
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    };
  }

  async approveReview(reviewId: string) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, isDeleted: false },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.isApprove) {
      throw new BadRequestException('Review is already approved');
    }

    await this.prisma.review.update({
      where: { id: reviewId },
      data: { isApprove: true },
    });

    const ratingData = await this.prisma.review.aggregate({
      where: {
        doctorId: review.doctorId,
        isApprove: true,
        isDeleted: false,
      },
      _avg: { rating: true },
      _count: { id: true },
    });

    const averageRating = ratingData._avg.rating ?? 0;
    const totalReviews = ratingData._count.id;

    await this.prisma.doctor.update({
      where: { id: review.doctorId },
      data: {
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
      },
    });

    return {
      message: 'Review approved successfully',
      reviewId,
    };
  }

  async deleteReview(reviewId: string) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, isDeleted: false },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.prisma.review.update({
      where: { id: reviewId },
      data: { isDeleted: true },
    });

    if (review.isApprove) {
      const ratingData = await this.prisma.review.aggregate({
        where: {
          doctorId: review.doctorId,
          isApprove: true,
          isDeleted: false,
        },
        _avg: { rating: true },
        _count: { id: true },
      });

      await this.prisma.doctor.update({
        where: { id: review.doctorId },
        data: {
          averageRating: ratingData._avg.rating
            ? Math.round(ratingData._avg.rating * 10) / 10
            : 0,
          totalReviews: ratingData._count.id,
        },
      });
    }

    return {
      message: 'Review deleted successfully',
      reviewId,
    };
  }

  async updateDoctorCommission(doctorId: string, commission: number) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: doctorId, isDeleted: false },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (doctor.commission === commission) {
      return {
        message: 'Commission is already up to date',
        doctorId,
        commission,
      };
    }

    await this.prisma.$transaction([
      this.prisma.doctor.update({
        where: { id: doctorId },
        data: { commission },
      }),

      this.prisma.commissionHistory.create({
        data: {
          doctorId,
          commission,
        },
      }),
    ]);

    return {
      message: 'Doctor commission updated successfully',
      doctorId,
      commission,
    };
  }
}
