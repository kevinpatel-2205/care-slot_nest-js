import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AppointmentStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  Timing,
} from '@prisma/client';
import { AddSlotsDto } from './dto/add-slots.dto';
import { BulkSlotsDto } from './dto/bulk-slots.dto';
import { UpdateDoctorProfileDto } from './dto/update-profile.dto';
import { AddPrescriptionDto } from './dto/add-prescription.dto';

@Injectable()
export class DoctorService {
  constructor(private readonly prisma: PrismaService) {}

  private convertTo24(time: string): number {
    const [timePart, period] = time.split(' ');
    let [hour, min] = timePart.split(':').map(Number);

    if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
    if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;

    return hour * 60 + min;
  }

  private convertTo12(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;

    return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  }

  async getDashboard(userId: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const doctorId = doctor.id;

    const statusCountsRaw = await this.prisma.appointment.groupBy({
      by: ['status'],
      where: { doctorId, isDeleted: false },
      _count: { id: true },
    });

    const appointmentCounts = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const item of statusCountsRaw) {
      const key = item.status.toLowerCase() as keyof typeof appointmentCounts;
      if (key in appointmentCounts) {
        appointmentCounts[key] = item._count.id;
      }
    }

    const commissionData = await this.prisma.appointment.aggregate({
      where: {
        doctorId,
        isDeleted: false,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      },
      _sum: { adminCommission: true },
    });

    const totalAdminCommission = commissionData._sum.adminCommission ?? 0;

    const monthlyPayments = await this.prisma.payment.findMany({
      where: {
        doctorId,
        status: PaymentStatus.PAID,
      },
      select: {
        amount: true,
        paymentMethod: true,
        createdAt: true,
        appointmentId: true,
      },
    });

    const appointmentIds = monthlyPayments.map((p) => p.appointmentId);

    const appointments = await this.prisma.appointment.findMany({
      where: { id: { in: appointmentIds } },
      select: { id: true, adminCommission: true },
    });

    const commissionMap = new Map<string, number>(
      appointments.map((a) => [a.id, a.adminCommission ?? 0]),
    );

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const monthlyData = Array.from({ length: 12 }, () => ({
      cash: 0,
      razorpay: 0,
    }));

    let totalEarnings = 0;

    for (const p of monthlyPayments) {
      const commission = commissionMap.get(p.appointmentId) ?? 0;
      const net = p.amount - commission;
      const monthIndex = new Date(p.createdAt).getMonth();

      totalEarnings += net;

      if (p.paymentMethod === 'CASH') {
        monthlyData[monthIndex].cash += net;
      } else if (p.paymentMethod === 'RAZORPAY') {
        monthlyData[monthIndex].razorpay += net;
      }
    }

    const monthlyEarnings = {
      labels: monthNames,
      cash: monthlyData.map((m) => m.cash),
      razorpay: monthlyData.map((m) => m.razorpay),
    };

    return {
      data: {
        totalEarnings,
        appointmentCounts,
        monthlyEarnings,
        totalAdminCommission,
      },
    };
  }

  async getUpcomingAppointments(userId: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        isDeleted: false,
        appointmentDate: { gte: new Date() },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: {
        id: true,
        appointmentDate: true,
        timeSlot: true,
        paymentMethod: true,
        status: true,
        patient: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [{ appointmentDate: 'asc' }, { timeSlot: 'asc' }],
    });
    return { data: appointments };
  }

  async getAllAppointments(
    userId: string,
    page: number,
    limit: number,
    status?: AppointmentStatus,
  ) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const skip = (page - 1) * limit;

    const where: Prisma.AppointmentWhereInput = {
      doctorId: doctor.id,
      isDeleted: false,
      ...(status && { status }),
    };

    const [appointments, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          appointmentDate: true,
          timeSlot: true,
          paymentMethod: true,
          status: true,
          prescriptionAdded: true,
          patient: {
            select: {
              id: true,
              user: {
                select: { name: true, email: true },
              },
            },
          },
        },
        orderBy: [{ appointmentDate: 'asc' }, { timeSlot: 'asc' }],
      }),

      this.prisma.appointment.count({ where }),
    ]);

    return {
      data: appointments,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    };
  }

  async changeAppointmentStatus(userId: string, appointmentId: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true, commission: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        doctorId: doctor.id,
        isDeleted: false,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Cancelled appointment cannot be updated');
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Appointment already completed');
    }

    if (appointment.status === AppointmentStatus.PENDING) {
      const adminCommission =
        (appointment.consultationFee * doctor.commission) / 100;

      await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: AppointmentStatus.CONFIRMED,
          adminCommission,
        },
      });

      return {
        message: 'Appointment status updated to CONFIRMED',
        data: { appointmentId, status: AppointmentStatus.CONFIRMED },
      };
    }

    // CONFIRMED → COMPLETED
    await this.prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: AppointmentStatus.COMPLETED,
          paymentStatus: PaymentStatus.PAID,
        },
      });

      if (appointment.paymentMethod === PaymentMethod.CASH) {
        await tx.payment.updateMany({
          where: { appointmentId },
          data: { status: PaymentStatus.PAID },
        });
      }
    });

    return {
      message: 'Appointment status updated to COMPLETED',
      data: { appointmentId, status: AppointmentStatus.COMPLETED },
    };
  }

  async cancelAppointment(userId: string, appointmentId: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        doctorId: doctor.id,
        isDeleted: false,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment already cancelled');
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException(
        'Completed appointment cannot be cancelled',
      );
    }

    if (appointment.status === AppointmentStatus.CONFIRMED) {
      throw new BadRequestException(
        'Confirmed appointment cannot be cancelled',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.CANCELLED },
      });

      const existingSlot = await tx.availableSlot.findFirst({
        where: {
          doctorId: doctor.id,
          date: appointment.appointmentDate,
        },
      });

      if (existingSlot) {
        const timeAlreadyExists = await tx.availableSlot.findFirst({
          where: {
            doctorId: doctor.id,
            date: appointment.appointmentDate,
            time: appointment.timeSlot,
          },
        });

        if (!timeAlreadyExists) {
          await tx.availableSlot.create({
            data: {
              doctorId: doctor.id,
              date: appointment.appointmentDate,
              time: appointment.timeSlot,
            },
          });
        }
      } else {
        await tx.availableSlot.create({
          data: {
            doctorId: doctor.id,
            date: appointment.appointmentDate,
            time: appointment.timeSlot,
          },
        });
      }

      if (appointment.paymentMethod === PaymentMethod.RAZORPAY) {
        await tx.payment.updateMany({
          where: { appointmentId },
          data: { status: PaymentStatus.FAILED },
        });
      }
    });

    return {
      message: 'Appointment cancelled successfully',
      data: { appointmentId },
    };
  }

  async getDoctorPatients(userId: string, page: number, limit: number) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const skip = (page - 1) * limit;

    const patientGroups = await this.prisma.appointment.groupBy({
      by: ['patientId'],
      where: {
        doctorId: doctor.id,
        isDeleted: false,
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      skip,
      take: limit,
    });

    // Total unique patients count for pagination
    const totalGroups = await this.prisma.appointment.groupBy({
      by: ['patientId'],
      where: {
        doctorId: doctor.id,
        isDeleted: false,
      },
      _count: { id: true },
    });

    const patientIds = patientGroups.map((g) => g.patientId);

    // Fetch patient details
    const patients = await this.prisma.patient.findMany({
      where: { id: { in: patientIds } },
      select: {
        id: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            image: true,
          },
        },
      },
    });

    // Map patient details with appointment count
    const patientMap = new Map(patients.map((p) => [p.id, p]));

    const data = patientGroups.map((g) => {
      const patient = patientMap.get(g.patientId);
      return {
        patientId: g.patientId,
        totalAppointments: g._count.id,
        name: patient?.user?.name ?? null,
        email: patient?.user?.email ?? null,
        phone: patient?.user?.phone ?? null,
        image: patient?.user?.image ?? null,
      };
    });

    return {
      data,
      currentPage: page,
      totalPages: Math.ceil(totalGroups.length / limit),
      total: totalGroups.length,
    };
  }

  async getDoctorPatientDetails(userId: string, patientId: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, isDeleted: false },
      select: {
        id: true,
        dateOfBirth: true,
        gender: true,
        medicalHistory: true,
        address: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            image: true,
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    let age: number | null = null;
    if (patient.dateOfBirth) {
      const diff = Date.now() - new Date(patient.dateOfBirth).getTime();
      age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    }

    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        patientId,
        isDeleted: false,
      },
      select: {
        id: true,
        appointmentDate: true,
        timeSlot: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        consultationFee: true,
        adminCommission: true,
        prescriptionAdded: true,
        notes: true,
      },
      orderBy: { appointmentDate: 'desc' },
    });

    return {
      data: {
        patientDetails: {
          patientId: patient.id,
          name: patient.user?.name ?? null,
          email: patient.user?.email ?? null,
          phone: patient.user?.phone ?? null,
          image: patient.user?.image ?? null,
          gender: patient.gender,
          dateOfBirth: patient.dateOfBirth,
          age,
          address: patient.address,
          medicalHistory: patient.medicalHistory,
        },
        appointments,
      },
    };
  }

  async getAvailableSlots(userId: string, page: number, limit: number) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.availableSlot.deleteMany({
      where: {
        doctorId: doctor.id,
        date: { lt: today },
      },
    });

    const uniqueDatesRaw = await this.prisma.availableSlot.findMany({
      where: { doctorId: doctor.id },
      select: { date: true },
      distinct: ['date'],
      orderBy: { date: 'asc' },
    });

    const totalDates = uniqueDatesRaw.length;

    const skip = (page - 1) * limit;
    const paginatedDates = uniqueDatesRaw.slice(skip, skip + limit);

    if (paginatedDates.length === 0) {
      return {
        data: [],
        currentPage: page,
        totalPages: Math.ceil(totalDates / limit),
        total: totalDates,
      };
    }

    const dateValues = paginatedDates.map((d) => d.date);

    const slots = await this.prisma.availableSlot.findMany({
      where: {
        doctorId: doctor.id,
        date: { in: dateValues },
      },
      select: {
        id: true,
        date: true,
        time: true,
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });

    type SlotGroup = { date: Date; times: { id: string; time: string }[] };
    const groupedMap = new Map<string, SlotGroup>();

    for (const slot of slots) {
      const dateKey = slot.date.toISOString().split('T')[0];

      if (!groupedMap.has(dateKey)) {
        groupedMap.set(dateKey, { date: slot.date, times: [] });
      }

      const group = groupedMap.get(dateKey);
      if (group) {
        group.times.push({ id: slot.id, time: slot.time });
      }
    }

    for (const slot of slots) {
      const dateKey = slot.date.toISOString().split('T')[0];

      if (!groupedMap.has(dateKey)) {
        groupedMap.set(dateKey, { date: slot.date, times: [] });
      }

      groupedMap.get(dateKey)!.times.push({ id: slot.id, time: slot.time });
    }

    return {
      data: Array.from(groupedMap.values()),
      currentPage: page,
      totalPages: Math.ceil(totalDates / limit),
      total: totalDates,
    };
  }

  async addAvailableSlots(userId: string, dto: AddSlotsDto) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const selectedDate = new Date(dto.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(selectedDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (selectedDate <= today) {
      throw new BadRequestException('Date must be greater than today');
    }

    const existingSlots = await this.prisma.availableSlot.findMany({
      where: {
        doctorId: doctor.id,
        date: selectedDate,
      },
      select: { time: true },
    });

    const existingTimes = new Set(existingSlots.map((s) => s.time));

    const uniqueNewTimes = dto.times.filter((t) => !existingTimes.has(t));

    if (uniqueNewTimes.length === 0) {
      return {
        message: 'All provided slots already exist for this date',
      };
    }

    await this.prisma.availableSlot.createMany({
      data: uniqueNewTimes.map((time) => ({
        doctorId: doctor.id,
        date: selectedDate,
        time,
      })),
    });

    return {
      message: 'Available slots added successfully',
    };
  }

  async addBulkAvailableSlots(userId: string, dto: BulkSlotsDto) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today || end < today) {
      throw new BadRequestException('Dates cannot be less than today');
    }

    if (end < start) {
      throw new BadRequestException('End date must be greater than start date');
    }

    const maxEnd = new Date(start);
    maxEnd.setMonth(maxEnd.getMonth() + 1);

    if (end > maxEnd) {
      throw new BadRequestException(
        'Cannot create slots for more than 1 month at a time',
      );
    }

    const startTime = dto.startTime ?? '10:00 AM';
    const endTime = dto.endTime ?? '05:00 PM';

    const startMinutes = this.convertTo24(startTime);
    const endMinutes = this.convertTo24(endTime);

    if (startMinutes >= endMinutes) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Generate all time slots between startTime and endTime
    const generatedTimes: string[] = [];
    for (let t = startMinutes; t < endMinutes; t += dto.interval) {
      generatedTimes.push(this.convertTo12(t));
    }

    if (generatedTimes.length === 0) {
      throw new BadRequestException(
        'No slots generated — check your time range and interval',
      );
    }

    // Collect all dates in range
    const dates: Date[] = [];
    const current = new Date(start);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    const existingSlots = await this.prisma.availableSlot.findMany({
      where: {
        doctorId: doctor.id,
        date: { gte: start, lte: end },
      },
      select: { date: true, time: true },
    });

    const existingSet = new Set(
      existingSlots.map(
        (s) => `${s.date.toISOString().split('T')[0]}|${s.time}`,
      ),
    );

    const slotsToCreate: { doctorId: string; date: Date; time: string }[] = [];

    for (const date of dates) {
      const dateKey = date.toISOString().split('T')[0];

      for (const time of generatedTimes) {
        const key = `${dateKey}|${time}`;

        if (!existingSet.has(key)) {
          slotsToCreate.push({
            doctorId: doctor.id,
            date,
            time,
          });
        }
      }
    }

    if (slotsToCreate.length === 0) {
      return {
        message: 'All generated slots already exist for the given date range',
      };
    }

    await this.prisma.availableSlot.createMany({
      data: slotsToCreate,
    });

    return {
      message: `Bulk slots created successfully`,
      data: {
        totalCreated: slotsToCreate.length,
        daysCount: dates.length,
        timesPerDay: generatedTimes.length,
      },
    };
  }

  async deleteAvailableSlot(userId: string, date: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const selectedDate = new Date(date);

    if (isNaN(selectedDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    selectedDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const deleted = await this.prisma.availableSlot.deleteMany({
      where: {
        doctorId: doctor.id,
        date: {
          gte: selectedDate,
          lt: nextDay,
        },
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('No slots found for this date');
    }

    return {
      message: 'Slots deleted successfully',
      data: { date, deletedCount: deleted.count },
    };
  }

  async getDoctorProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
      select: {
        id: true,
        specialization: true,
        experience: true,
        about: true,
        consultationFee: true,
        isApproved: true,
        commission: true,
        averageRating: true,
        totalReviews: true,
        latitude: true,
        longitude: true,
        address: true,
        commissionHistory: {
          orderBy: { changedAt: 'desc' },
          select: {
            id: true,
            commission: true,
            changedAt: true,
          },
        },
      },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    return {
      data: {
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image,
        isActive: user.isActive,
        specialization: doctor.specialization,
        experience: doctor.experience,
        about: doctor.about,
        consultationFee: doctor.consultationFee,
        isApproved: doctor.isApproved,
        commission: doctor.commission,
        averageRating: doctor.averageRating,
        totalReviews: doctor.totalReviews,
        geolocation:
          doctor.latitude && doctor.longitude
            ? {
                latitude: doctor.latitude,
                longitude: doctor.longitude,
                address: doctor.address ?? null,
              }
            : null,
        commissionHistory: doctor.commissionHistory,
      },
    };
  }

  async updateDoctorProfile(userId: string, dto: UpdateDoctorProfileDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    // Build user update payload — only include provided fields
    const userUpdateData: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined) {
      userUpdateData.name = dto.name.trim();
    }

    if (dto.phone !== undefined) {
      userUpdateData.phone = dto.phone.trim();
    }

    if (dto.isActive !== undefined) {
      userUpdateData.isActive = dto.isActive;
    }

    // Build doctor update payload — only include provided fields
    const doctorUpdateData: Prisma.DoctorUpdateInput = {};

    if (dto.specialization !== undefined) {
      doctorUpdateData.specialization = dto.specialization.trim();
    }

    if (dto.experience !== undefined) {
      doctorUpdateData.experience = dto.experience;
    }

    if (dto.about !== undefined) {
      doctorUpdateData.about = dto.about.trim();
    }

    if (dto.consultationFee !== undefined) {
      doctorUpdateData.consultationFee = dto.consultationFee;
    }

    if (dto.geolocation !== undefined) {
      doctorUpdateData.latitude = dto.geolocation.latitude;
      doctorUpdateData.longitude = dto.geolocation.longitude;
      doctorUpdateData.address = dto.geolocation.address ?? null;
    }

    // Run both updates in a transaction
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      }),

      this.prisma.doctor.update({
        where: { id: doctor.id },
        data: doctorUpdateData,
      }),
    ]);

    return {
      message: 'Doctor profile updated successfully',
    };
  }

  async getDoctorReviews(userId: string, page: number, limit: number) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
      select: {
        id: true,
        averageRating: true,
        totalReviews: true,
      },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      doctorId: doctor.id,
      isApprove: true,
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
              user: {
                select: {
                  name: true,
                  image: true,
                  email: true,
                },
              },
            },
          },
        },
      }),

      this.prisma.review.count({ where }),
    ]);

    const formattedReviews = reviews.map((rev) => ({
      reviewId: rev.id,
      rating: rev.rating,
      comment: rev.comment,
      createdAt: rev.createdAt,
      patientName: rev.patient?.user?.name ?? null,
      patientImage: rev.patient?.user?.image ?? null,
      patientEmail: rev.patient?.user?.email ?? null,
    }));

    return {
      data: {
        averageRating: doctor.averageRating,
        totalReviews: doctor.totalReviews,
        reviews: formattedReviews,
      },
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    };
  }

  async addPrescription(
    userId: string,
    appointmentId: string,
    dto: AddPrescriptionDto,
  ) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        doctorId: doctor.id,
        isDeleted: false,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException(
        'Prescription can only be added after appointment is completed',
      );
    }

    if (appointment.prescriptionAdded) {
      throw new BadRequestException(
        'Prescription already added for this appointment',
      );
    }

    const prescription = await this.prisma.$transaction(async (tx) => {
      const newPrescription = await tx.prescription.create({
        data: {
          appointmentId,
          doctorId: doctor.id,
          patientId: appointment.patientId,
          notes: dto.additionalNotes ?? null,
        },
      });

      for (const med of dto.medicines) {
        const medicine = await tx.medicine.create({
          data: {
            prescriptionId: newPrescription.id,
            medicineName: med.medicineName,
            dosage: med.dosage,
            duration: med.duration ?? undefined,
            mealTime: med.mealTime ?? undefined,
          },
        });

        if (med.timing && med.timing.length > 0) {
          await tx.medicineTiming.createMany({
            data: med.timing.map((t: Timing) => ({
              medicineId: medicine.id,
              timing: t,
            })),
          });
        }
      }

      await tx.appointment.update({
        where: { id: appointmentId },
        data: { prescriptionAdded: true },
      });

      return newPrescription;
    });

    return {
      message: 'Prescription added successfully',
      data: { prescriptionId: prescription.id },
    };
  }
}
