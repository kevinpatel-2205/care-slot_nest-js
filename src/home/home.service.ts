import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getHomeData() {
    const [
      topDoctors,
      topReviews,
      totalDoctors,
      totalPatients,
      totalAppointments,
    ] = await Promise.all([
      this.prisma.doctor.findMany({
        where: { isApproved: true, isDeleted: false },
        orderBy: { averageRating: 'desc' },
        take: 5,
        select: {
          id: true,
          specialization: true,
          experience: true,
          consultationFee: true,
          averageRating: true,
          totalReviews: true,
          user: {
            select: { name: true, email: true, image: true },
          },
        },
      }),

      this.prisma.review.findMany({
        where: { rating: 5, isApprove: true, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          patient: {
            select: {
              user: { select: { name: true, email: true, image: true } },
            },
          },
          doctor: {
            select: {
              user: { select: { name: true, email: true, image: true } },
            },
          },
        },
      }),

      this.prisma.doctor.count({ where: { isDeleted: false } }),
      this.prisma.patient.count({ where: { isDeleted: false } }),
      this.prisma.appointment.count({ where: { isDeleted: false } }),
    ]);

    const formattedDoctors = topDoctors.map((doc) => ({
      id: doc.id,
      name: doc.user?.name,
      email: doc.user?.email,
      image: doc.user?.image,
      specialization: doc.specialization,
      experience: doc.experience,
      consultationFee: doc.consultationFee,
      rating: doc.averageRating,
      totalReviews: doc.totalReviews,
    }));

    const formattedReviews = topReviews.map((rev) => ({
      id: rev.id,
      rating: rev.rating,
      comment: rev.comment,
      createdAt: rev.createdAt,
      patientName: rev.patient?.user?.name,
      patientEmail: rev.patient?.user?.email,
      patientImage: rev.patient?.user?.image,
      doctorName: rev.doctor?.user?.name,
      doctorEmail: rev.doctor?.user?.email,
      doctorImage: rev.doctor?.user?.image,
    }));

    return {
      data: {
        topDoctors: formattedDoctors,
        topReviews: formattedReviews,
        stats: { totalDoctors, totalPatients, totalAppointments },
      },
    };
  }
}
