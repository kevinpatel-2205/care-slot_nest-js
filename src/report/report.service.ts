import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) { }

  async getPatientAppointmentRows(
    userId: string,
    status?: AppointmentStatus,
  ): Promise<(string | number)[][]> {
    const patient = await this.prisma.patient.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!patient) throw new NotFoundException('Patient profile not found');

    const appointments = await this.prisma.appointment.findMany({
      where: {
        patientId: patient.id,
        isDeleted: false,
        ...(status ? { status } : {}),
      },
      include: {
        doctor: { include: { user: true } },
      },
      orderBy: { appointmentDate: 'desc' },
    });

    return appointments.map((apt, i) => [
      i + 1,
      apt.doctor?.user?.name ?? '-',
      apt.doctor?.user?.email ?? '-',
      apt.doctor?.specialization ?? '-',
      new Date(apt.appointmentDate).toLocaleDateString('en-IN'),
      apt.timeSlot,
      apt.status,
      apt.paymentStatus,
      apt.consultationFee,
    ]);
  }

  async getDoctorAppointmentRows(
    userId: string,
    status?: AppointmentStatus,
  ): Promise<(string | number)[][]> {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        isDeleted: false,
        ...(status ? { status } : {}),
      },
      include: {
        patient: { include: { user: true } },
      },
      orderBy: { appointmentDate: 'desc' },
    });

    return appointments.map((apt, i) => [
      i + 1,
      apt.patient?.user?.name ?? '-',
      apt.patient?.user?.email ?? '-',
      new Date(apt.appointmentDate).toLocaleDateString('en-IN'),
      apt.timeSlot,
      apt.status,
      apt.paymentStatus,
      apt.consultationFee,
    ]);
  }

  async getAdminDoctorRows(): Promise<(string | number)[][]> {
    const doctors = await this.prisma.doctor.findMany({
      where: { isDeleted: false },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    return doctors.map((d, i) => [
      i + 1,
      d.user?.name ?? '-',
      d.user?.email ?? '-',
      d.user?.phone ?? '-',
      d.specialization,
      d.experience,
      d.consultationFee,
      d.commission,
      d.averageRating,
      d.totalReviews,
      d.isDeleted ? 'Inactive' : 'Active',
    ]);
  }

  async getAdminPatientRows(): Promise<(string | number)[][]> {
    const patients = await this.prisma.patient.findMany({
      where: { isDeleted: false },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    return patients.map((p, i) => [
      i + 1,
      p.user?.name ?? '-',
      p.user?.email ?? '-',
      p.user?.phone ?? '-',
      p.gender ?? '-',
      p.dateOfBirth
        ? new Date(p.dateOfBirth).toLocaleDateString('en-IN')
        : '-',
      p.address ?? '-',
    ]);
  }

  async getAdminAppointmentRows(
    status?: AppointmentStatus,
  ): Promise<(string | number)[][]> {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        isDeleted: false,
        ...(status ? { status } : {}),
      },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
      orderBy: { appointmentDate: 'desc' },
    });

    return appointments.map((apt, i) => [
      i + 1,
      apt.patient?.user?.name ?? '-',
      apt.doctor?.user?.name ?? '-',
      apt.doctor?.specialization ?? '-',
      new Date(apt.appointmentDate).toLocaleDateString('en-IN'),
      apt.timeSlot,
      apt.status,
      apt.paymentStatus,
      apt.consultationFee,
      apt.adminCommission,
    ]);
  }

  async getAdminReviewRows(): Promise<(string | number)[][]> {
    const reviews = await this.prisma.review.findMany({
      where: { isDeleted: false, isApprove: false },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((r, i) => [
      i + 1,
      r.patient?.user?.name ?? '-',
      r.doctor?.user?.name ?? '-',
      r.rating,
      r.comment ?? '-',
      r.isApprove ? 'Approved' : 'Pending',
      new Date(r.createdAt).toLocaleDateString('en-IN'),
    ]);
  }

  // ── Admin Dashboard (full multi-sheet export) ──────────────────────────────

  async getAdminDashboardData() {
    const [totalDoctors, totalPatients, totalAppointments] = await Promise.all([
      this.prisma.doctor.count({ where: { isDeleted: false } }),
      this.prisma.patient.count({ where: { isDeleted: false } }),
      this.prisma.appointment.count({ where: { isDeleted: false } }),
    ]);

    const commissionAgg = await this.prisma.appointment.aggregate({
      where: {
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        isDeleted: false,
      },
      _sum: { adminCommission: true },
    });

    const totalCommission = commissionAgg._sum.adminCommission ?? 0;

    return { totalDoctors, totalPatients, totalAppointments, totalCommission };
  }

  async getAdminDashboardDoctorRows(): Promise<(string | number)[][]> {
    const doctors = await this.prisma.doctor.findMany({
      where: { isDeleted: false },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    const allAppointments = await this.prisma.appointment.findMany({
      where: { isDeleted: false },
      select: {
        doctorId: true,
        patientId: true,
        status: true,
        consultationFee: true,
        adminCommission: true,
      },
    });

    return doctors.map((d, i) => {
      const appts = allAppointments.filter((a) => a.doctorId === d.id);
      const completed = appts.filter((a) =>
        ['CONFIRMED', 'COMPLETED'].includes(a.status),
      );
      const totalEarning = completed.reduce((s, a) => s + a.consultationFee, 0);
      const totalCommission = completed.reduce((s, a) => s + a.adminCommission, 0);
      const uniquePatients = new Set(appts.map((a) => a.patientId)).size;

      return [
        i + 1,
        d.user?.name ?? '-',
        d.user?.email ?? '-',
        d.user?.phone ?? '-',
        d.specialization,
        d.experience,
        d.consultationFee,
        d.commission + '%',
        appts.length,
        uniquePatients,
        totalCommission,
        totalEarning,
        totalEarning - totalCommission,
        d.user?.isActive ? 'Active' : 'Inactive',
        new Date(d.createdAt).toLocaleDateString('en-IN'),
      ];
    });
  }

  async getAdminDashboardPatientRows(): Promise<(string | number)[][]> {
    const patients = await this.prisma.patient.findMany({
      where: { isDeleted: false },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    const allAppointments = await this.prisma.appointment.findMany({
      where: { isDeleted: false },
      select: { patientId: true, status: true, consultationFee: true },
    });

    return patients.map((p, i) => {
      const appts = allAppointments.filter((a) => a.patientId === p.id);
      const completed = appts.filter((a) =>
        ['CONFIRMED', 'COMPLETED'].includes(a.status),
      );
      const totalPay = completed.reduce((s, a) => s + a.consultationFee, 0);

      return [
        i + 1,
        p.user?.name ?? '-',
        p.user?.email ?? '-',
        p.user?.phone ?? '-',
        p.gender ?? '-',
        p.dateOfBirth
          ? new Date(p.dateOfBirth).toLocaleDateString('en-IN')
          : '-',
        appts.length,
        totalPay,
        new Date(p.createdAt).toLocaleDateString('en-IN'),
      ];
    });
  }

  async getAdminDashboardAppointmentRows(): Promise<(string | number)[][]> {
    const appointments = await this.prisma.appointment.findMany({
      where: { isDeleted: false },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
      orderBy: { appointmentDate: 'desc' },
    });

    return appointments.map((a, i) => {
      const commPct =
        a.consultationFee > 0
          ? ((a.adminCommission / a.consultationFee) * 100).toFixed(2) + '%'
          : '0%';
      return [
        i + 1,
        a.doctor?.user?.name ?? '-',
        a.doctor?.user?.email ?? '-',
        a.patient?.user?.name ?? '-',
        a.patient?.user?.email ?? '-',
        new Date(a.appointmentDate).toLocaleDateString('en-IN'),
        a.timeSlot,
        a.status,
        a.notes ?? '-',
        a.consultationFee,
        commPct,
        a.adminCommission,
      ];
    });
  }

  async getAdminDashboardPaymentRows(): Promise<(string | number)[][]> {
    const payments = await this.prisma.payment.findMany({
      include: {
        appointment: {
          include: {
            doctor: { include: { user: true } },
            patient: { include: { user: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p, i) => [
      i + 1,
      p.appointmentId,
      p.appointment?.doctor?.user?.name ?? '-',
      p.appointment?.doctor?.user?.email ?? '-',
      p.appointment?.patient?.user?.name ?? '-',
      p.appointment?.patient?.user?.email ?? '-',
      p.amount,
      p.paymentMethod ?? '-',
      p.status,
      new Date(p.createdAt).toLocaleDateString('en-IN'),
    ]);
  }

  // ── Doctor Dashboard (multi-section: appointments + patients + commission) ──

  async getDoctorDashboardData(userId: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
      include: {
        user: true,
        commissionHistory: { orderBy: { changedAt: 'asc' } },
      },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  async getDoctorPatientRows(userId: string): Promise<(string | number)[][]> {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    // Group unique patients with appointment count
    const grouped = await this.prisma.appointment.groupBy({
      by: ['patientId'],
      where: { doctorId: doctor.id, isDeleted: false },
      _count: { id: true },
    });

    const patientIds = grouped.map((g) => g.patientId);

    const patients = await this.prisma.patient.findMany({
      where: { id: { in: patientIds } },
      include: { user: true },
    });

    const patientMap = Object.fromEntries(patients.map((p) => [p.id, p]));

    return grouped.map((g, i) => {
      const p = patientMap[g.patientId];
      return [
        i + 1,
        p?.user?.name ?? '-',
        p?.user?.email ?? '-',
        p?.user?.phone ?? '-',
        p?.gender ?? '-',
        p?.dateOfBirth
          ? new Date(p.dateOfBirth).toLocaleDateString('en-IN')
          : '-',
        g._count.id,
      ];
    });
  }

  async getDoctorCommissionRows(userId: string): Promise<(string | number)[][]> {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
      include: { commissionHistory: { orderBy: { changedAt: 'asc' } } },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const history = doctor.commissionHistory;
    const rows: (string | number)[][] = [];

    for (let i = 0; i < history.length; i++) {
      const startDate = history[i].changedAt;
      const endDate = i + 1 < history.length ? history[i + 1].changedAt : null;
      const commissionPct = history[i].commission;

      const where: any = {
        doctorId: doctor.id,
        isDeleted: false,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        createdAt: { gte: startDate },
      };
      if (endDate) where.createdAt.lt = endDate;

      const appts = await this.prisma.appointment.findMany({ where });
      const totalFee = appts.reduce((s, a) => s + a.consultationFee, 0);
      const totalComm = appts.reduce(
        (s, a) => s + (a.consultationFee * commissionPct) / 100,
        0,
      );

      rows.push([
        i + 1,
        commissionPct + '%',
        new Date(startDate).toLocaleDateString('en-IN'),
        endDate ? new Date(endDate).toLocaleDateString('en-IN') : 'Present',
        appts.length,
        totalFee,
        +totalComm.toFixed(2),
      ]);
    }

    return rows;
  }

  async getDoctorReviewRows(userId: string): Promise<(string | number)[][]> {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, isDeleted: false },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const reviews = await this.prisma.review.findMany({
      where: { doctorId: doctor.id, isApprove: true, isDeleted: false },
      include: { patient: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((r, i) => [
      i + 1,
      r.patient?.user?.name ?? '-',
      r.patient?.user?.email ?? '-',
      r.rating,
      r.comment ?? '-',
      new Date(r.createdAt).toLocaleDateString('en-IN'),
    ]);
  }
}