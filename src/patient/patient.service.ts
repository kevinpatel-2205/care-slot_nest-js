import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { AppointmentStatus, Gender } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class PatientService {
  constructor(private readonly prisma: PrismaService) {}

  private parseTimeSlot(timeSlot: string, baseDate: Date): Date {
    const [timePart, modifier] = timeSlot.trim().split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);

    if (modifier?.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (modifier?.toUpperCase() === 'AM' && hours === 12) hours = 0;

    const dt = new Date(baseDate);
    dt.setHours(hours, minutes, 0, 0);
    return dt;
  }

  private async expireAppointments(
    appointments: {
      id: string;
      status: string;
      appointmentDate: Date;
      timeSlot: string;
      doctorId: string;
      fee: number;
    }[],
  ) {
    const now = new Date();

    const pendingToCancel: string[] = [];

    for (const apt of appointments) {
      const aptDateTime = this.parseTimeSlot(apt.timeSlot, apt.appointmentDate);

      if (aptDateTime >= now) continue;

      if (apt.status === 'PENDING') {
        pendingToCancel.push(apt.id);
      }
    }

    const confirmedExpired = appointments.filter((apt) => {
      const aptDateTime = this.parseTimeSlot(apt.timeSlot, apt.appointmentDate);
      return aptDateTime < now && apt.status === 'CONFIRMED';
    });

    if (pendingToCancel.length === 0 && confirmedExpired.length === 0) return;

    await this.prisma.$transaction(async (tx) => {
      if (pendingToCancel.length > 0) {
        await tx.appointment.updateMany({
          where: { id: { in: pendingToCancel } },
          data: { status: 'CANCELLED' },
        });
      }

      for (const apt of confirmedExpired) {
        const doctor = await tx.doctor.findUnique({
          where: { id: apt.doctorId },
          select: { commission: true },
        });

        const commissionPercent = doctor?.commission ?? 0;
        const adminCommission = (apt.fee * commissionPercent) / 100;

        await tx.appointment.update({
          where: { id: apt.id },
          data: {
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            adminCommission,
          },
        });

        await tx.payment.updateMany({
          where: { appointmentId: apt.id },
          data: { status: 'PAID' },
        });
      }
    });
  }

  async getDashboard(userId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!patient) {
      return {
        data: {
          totalBookings: 0,
          upcomingBookings: 0,
          cancelledBookings: 0,
          completedBookings: 0,
          upcomingAppointments: [],
        },
      };
    }

    const today = new Date();

    const [
      totalBookings,
      upcomingBookings,
      cancelledBookings,
      completedBookings,
    ] = await Promise.all([
      this.prisma.appointment.count({
        where: { patientId: patient.id, isDeleted: false },
      }),
      this.prisma.appointment.count({
        where: {
          patientId: patient.id,
          appointmentDate: { gte: today },
          status: { in: ['PENDING', 'CONFIRMED'] },
          isDeleted: false,
        },
      }),
      this.prisma.appointment.count({
        where: { patientId: patient.id, status: 'CANCELLED', isDeleted: false },
      }),
      this.prisma.appointment.count({
        where: { patientId: patient.id, status: 'COMPLETED', isDeleted: false },
      }),
    ]);

    const upcomingAppointments = await this.prisma.appointment.findMany({
      where: {
        patientId: patient.id,
        appointmentDate: { gte: today },
        status: { in: ['PENDING', 'CONFIRMED'] },
        isDeleted: false,
      },
      orderBy: { appointmentDate: 'asc' },
      select: {
        appointmentDate: true,
        timeSlot: true,
        status: true,
        doctor: {
          select: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    return {
      data: {
        totalBookings,
        upcomingBookings,
        cancelledBookings,
        completedBookings,
        upcomingAppointments: upcomingAppointments.map((apt) => ({
          doctorName: apt.doctor?.user?.name ?? null,
          doctorEmail: apt.doctor?.user?.email ?? null,
          appointmentDate: apt.appointmentDate,
          timeSlot: apt.timeSlot,
          status: apt.status,
        })),
      },
    };
  }

  async getAllDoctors(search?: string, specialization?: string) {
    const doctors = await this.prisma.doctor.findMany({
      where: {
        isDeleted: false,
        ...(specialization && {
          specialization: { contains: specialization },
        }),
        user: {
          isDeleted: false,
          isActive: true,
          ...(search && {
            name: { contains: search },
          }),
        },
      },
      select: {
        id: true,
        specialization: true,
        consultationFee: true,
        averageRating: true,
        totalReviews: true,
        user: {
          select: {
            name: true,
            email: true,
            image: true,
            isActive: true,
          },
        },
        availableSlots: {
          select: {
            id: true,
            date: true,
            time: true,
          },
        },
      },
    });

    return {
      data: doctors.map((doc) => ({
        doctorId: doc.id,
        name: doc.user?.name ?? null,
        email: doc.user?.email ?? null,
        image: doc.user?.image ?? null,
        isActive: doc.user?.isActive ?? false,
        specialization: doc.specialization,
        consultationFee: doc.consultationFee,
        availabilityStatus:
          doc.availableSlots.length > 0 ? 'Available' : 'Unavailable',
        averageRating: doc.averageRating ?? 0,
        totalReviews: doc.totalReviews ?? 0,
      })),
      count: doctors.length,
    };
  }

  async getDoctorDetails(doctorId: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: {
        id: doctorId,
        isDeleted: false,
      },
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
            image: true,
            isActive: true,
          },
        },
        availableSlots: {
          select: {
            id: true,
            date: true,
            time: true,
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    // ─── Filter out past slots (same logic as your Express code) ───
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredSlotIds: string[] = [];

    const validSlots = doctor.availableSlots.filter((slot) => {
      const slotDate = new Date(slot.date);
      slotDate.setHours(0, 0, 0, 0);

      // Future date — keep it
      if (slotDate > today) return true;

      // Today — check if the time has passed
      if (slotDate.getTime() === today.getTime()) {
        const [timePart, modifier] = slot.time.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);

        if (modifier?.toUpperCase() === 'PM' && hours !== 12) hours += 12;
        if (modifier?.toUpperCase() === 'AM' && hours === 12) hours = 0;

        const slotDateTime = new Date();
        slotDateTime.setHours(hours, minutes, 0, 0);

        if (slotDateTime > now) return true;
      }

      // Past — mark for deletion
      expiredSlotIds.push(slot.id);
      return false;
    });

    // Delete expired slots from DB in background (don't await — non-blocking)
    if (expiredSlotIds.length > 0) {
      this.prisma.availableSlot
        .deleteMany({ where: { id: { in: expiredSlotIds } } })
        .catch((err) => console.error('Failed to delete expired slots:', err));
    }

    // ─── Get latest 5 approved reviews ───
    const reviews = await this.prisma.review.findMany({
      where: {
        doctorId,
        isApprove: true,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
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
      },
    });

    return {
      data: {
        doctorId: doctor.id,
        name: doctor.user?.name ?? null,
        email: doctor.user?.email ?? null,
        image: doctor.user?.image ?? null,
        isActive: doctor.user?.isActive ?? false,
        specialization: doctor.specialization,
        experience: doctor.experience,
        about: doctor.about,
        consultationFee: doctor.consultationFee,
        averageRating: doctor.averageRating ?? 0,
        totalReviews: doctor.totalReviews ?? 0,
        availableSlots: validSlots.map((slot) => ({
          id: slot.id,
          date: slot.date,
          time: slot.time,
        })),
        reviews: reviews.map((r) => ({
          reviewId: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
          patientName: r.patient?.user?.name ?? null,
          patientImage: r.patient?.user?.image ?? null,
        })),
      },
    };
  }

  async bookAppointment(userId: string, dto: BookAppointmentDto) {
    const { doctorId, appointmentDate, timeSlot, notes } = dto;

    const selectedDate = new Date(appointmentDate.trim());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(selectedDate.getTime())) {
      throw new BadRequestException('Invalid appointment date');
    }

    if (selectedDate <= today) {
      throw new BadRequestException(
        'Appointment date must be greater than today',
      );
    }

    const patient = await this.prisma.patient.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    const doctor = await this.prisma.doctor.findFirst({
      where: { id: doctorId, isDeleted: false },
      include: {
        user: { select: { name: true, email: true, isActive: true } },
      },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (!doctor.user?.isActive) {
      throw new BadRequestException('Doctor is not active');
    }

    const slot = await this.prisma.availableSlot.findFirst({
      where: {
        doctorId,
        date: selectedDate,
        time: timeSlot.trim(),
      },
    });

    if (!slot) {
      throw new BadRequestException('Selected slot is not available');
    }

    const conflict = await this.prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        appointmentDate: selectedDate,
        timeSlot: timeSlot.trim(),
        status: { not: 'CANCELLED' },
        isDeleted: false,
      },
    });

    if (conflict) {
      throw new ConflictException(
        'You already have an appointment at this date and time',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          doctorId,
          patientId: patient.id,
          appointmentDate: selectedDate,
          timeSlot: timeSlot.trim(),
          consultationFee: doctor.consultationFee,
          paymentMethod: 'CASH',
          notes: notes?.trim(),
          status: 'PENDING',
          paymentStatus: 'PENDING',
        },
      });

      await tx.payment.create({
        data: {
          appointmentId: appointment.id,
          doctorId,
          patientId: patient.id,
          amount: doctor.consultationFee,
          paymentMethod: 'CASH',
          status: 'PENDING',
        },
      });

      await tx.availableSlot.delete({
        where: { id: slot.id },
      });

      return appointment;
    });

    return {
      message: 'Appointment booked successfully',
      data: {
        appointmentId: result.id,
        doctorId,
        appointmentDate: result.appointmentDate,
        timeSlot: result.timeSlot,
        status: result.status,
        consultationFee: result.consultationFee,
        paymentMethod: result.paymentMethod,
      },
    };
  }

  async getAppointments(
    userId: string,
    status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED',
    page = 1,
    limit = 5,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    const skip = (page - 1) * limit;

    // ─── Fetch appointments (no status filter yet — need all for expire check) ───

    const allActiveFilter = {
      patientId: patient.id,
      isDeleted: false,
      status: { in: ['PENDING', 'CONFIRMED'] as AppointmentStatus[] },
    };

    const pendingConfirmed = await this.prisma.appointment.findMany({
      where: allActiveFilter,
      select: {
        id: true,
        status: true,
        appointmentDate: true,
        timeSlot: true,
        doctorId: true,
        consultationFee: true,
      },
    });

    // ─── Run expire logic before returning data ───
    await this.expireAppointments(
      pendingConfirmed.map((a) => ({
        id: a.id,
        status: a.status,
        appointmentDate: a.appointmentDate,
        timeSlot: a.timeSlot,
        doctorId: a.doctorId,
        fee: a.consultationFee,
      })),
    );

    // ─── Now fetch with pagination + optional status filter ───
    const where = {
      patientId: patient.id,
      isDeleted: false,
      ...(status && { status }),
    };

    const [appointments, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { appointmentDate: 'desc' },
        select: {
          id: true,
          appointmentDate: true,
          timeSlot: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          consultationFee: true,
          prescriptionAdded: true,
          doctor: {
            select: {
              specialization: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      data: appointments.map((apt) => ({
        appointmentId: apt.id,
        doctorName: apt.doctor?.user?.name ?? null,
        doctorEmail: apt.doctor?.user?.email ?? null,
        specialization: apt.doctor?.specialization ?? null,
        appointmentDate: apt.appointmentDate,
        timeSlot: apt.timeSlot,
        status: apt.status,
        paymentStatus: apt.paymentStatus,
        paymentMethod: apt.paymentMethod,
        consultationFee: apt.consultationFee,
        prescriptionAdded: apt.prescriptionAdded,
      })),
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        image: true,
        patient: {
          select: {
            dateOfBirth: true,
            gender: true,
            medicalHistory: true,
            latitude: true,
            longitude: true,
            address: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const patient = user.patient;

    return {
      data: {
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        image: user.image,
        dateOfBirth: patient?.dateOfBirth ?? null,
        gender: patient?.gender ?? null,
        medicalHistory: patient?.medicalHistory ?? null,
        geolocation:
          patient?.latitude && patient?.longitude
            ? {
                latitude: patient.latitude,
                longitude: patient.longitude,
                address: patient.address ?? null,
              }
            : null,
      },
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userUpdateData: { name?: string; phone?: string } = {};

    if (dto.name !== undefined) {
      userUpdateData.name = dto.name.trim();
    }

    if (dto.phone !== undefined) {
      userUpdateData.phone = dto.phone.trim();
    }

    const patientUpdateData: {
      dateOfBirth?: Date;
      gender?: Gender;
      medicalHistory?: string;
      latitude?: number;
      longitude?: number;
      address?: string;
    } = {};

    if (dto.dateOfBirth !== undefined) {
      const dob = new Date(dto.dateOfBirth);
      const today = new Date();

      if (dob >= today) {
        throw new BadRequestException('Date of birth must be in the past');
      }

      patientUpdateData.dateOfBirth = dob;
    }

    if (dto.gender !== undefined) {
      patientUpdateData.gender = dto.gender.toUpperCase() as Gender;
    }

    if (dto.medicalHistory !== undefined) {
      patientUpdateData.medicalHistory = dto.medicalHistory.trim();
    }

    if (dto.geolocation !== undefined) {
      const { latitude, longitude, address } = dto.geolocation;

      if (!latitude || !longitude) {
        throw new BadRequestException('Invalid geolocation data');
      }

      patientUpdateData.latitude = latitude;
      patientUpdateData.longitude = longitude;
      patientUpdateData.address = address ?? '';
    }

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: userUpdateData,
        });
      }
      if (Object.keys(patientUpdateData).length > 0) {
        await tx.patient.update({
          where: { userId },
          data: patientUpdateData,
        });
      }
    });
    return {
      message: 'Profile updated successfully',
    };
  }
}
