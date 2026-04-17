import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Response } from 'express';
import PDFDocument from 'pdfkit';
import axios from 'axios';

@Injectable()
export class PrescriptionService {
  constructor(private readonly prisma: PrismaService) { }

  async downloadPrescription(
    appointmentId: string,
    userId: string,
    role: string,
    res: Response,
  ): Promise<void> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, isDeleted: false },
      include: {
        doctor: {
          include: { user: true },
        },
        patient: {
          include: { user: true },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (role === 'PATIENT') {
      const patient = await this.prisma.patient.findFirst({
        where: { userId, isDeleted: false },
      });
      if (!patient || appointment.patientId !== patient.id) {
        throw new ForbiddenException('Access denied');
      }
    } else if (role === 'DOCTOR') {
      const doctor = await this.prisma.doctor.findFirst({
        where: { userId, isDeleted: false },
      });
      if (!doctor || appointment.doctorId !== doctor.id) {
        throw new ForbiddenException('Access denied');
      }
    }

    const prescription = await this.prisma.prescription.findFirst({
      where: { appointmentId, isDeleted: false },
      include: {
        medicines: {
          include: {
            timings: true,
          },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    await this.generatePrescriptionPDF(
      res,
      appointment,
      prescription,
      appointmentId,
    );
  }

  private async generatePrescriptionPDF(
    res: Response,
    appointment: any,
    prescription: any,
    appointmentId: string,
  ): Promise<void> {

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=prescription-${appointmentId}.pdf`,
    );
    doc.pipe(res);

    const primaryColor = '#2e7df2';
    const tableHeaderColor = '#6c757d';
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Page border
    doc
      .lineWidth(2)
      .strokeColor(primaryColor)
      .rect(10, 10, pageWidth - 20, pageHeight - 20)
      .stroke();

    // Logo
    try {
      const logoUrl =
        'https://res.cloudinary.com/dqkbv1knl/image/upload/v1772173127/logo_pfynmy.png';
      const response = await axios.get(logoUrl, {
        responseType: 'arraybuffer',
        timeout: 5000,
      });
      const logoBuffer = Buffer.from(response.data, 'binary');
      doc.image(logoBuffer, 40, 30, { width: 60 });
    } catch {
      console.warn('Failed to load logo image, skipping logo in PDF');
    }

    // Header
    doc.fillColor(primaryColor).fontSize(22).text('CareSlot', 110, 40);
    doc
      .fontSize(11)
      .fillColor('gray')
      .text('Doctor Appointment Management System', 110, 65);
    doc.moveTo(40, 95).lineTo(550, 95).strokeColor(primaryColor).stroke();

    const doctorUser = appointment.doctor?.user;
    const doctor = appointment.doctor;
    const patientUser = appointment.patient?.user;
    const patient = appointment.patient;

    // Doctor Box
    doc
      .strokeColor(primaryColor)
      .lineWidth(1.5)
      .roundedRect(40, 110, 510, 80, 6)
      .stroke();
    doc.fillColor(primaryColor).fontSize(14).text('Doctor Information', 50, 120);
    doc
      .fillColor('black')
      .fontSize(12)
      .text(`Dr. ${doctorUser?.name ?? '-'}`, 50, 140)
      .text(`Specialization: ${doctor?.specialization ?? '-'}`, 250, 140)
      .text(`Email: ${doctorUser?.email ?? '-'}`, 50, 160)
      .text(`Experience: ${doctor?.experience ?? 0} Years`, 250, 160);

    // Patient Box
    doc
      .strokeColor(tableHeaderColor)
      .lineWidth(1.5)
      .roundedRect(40, 210, 510, 90, 6)
      .stroke();
    doc
      .fillColor(tableHeaderColor)
      .fontSize(14)
      .text('Patient Information', 50, 220);

    const age = patient?.dateOfBirth
      ? new Date().getFullYear() -
      new Date(patient.dateOfBirth).getFullYear()
      : '-';

    doc
      .fillColor('black')
      .fontSize(12)
      .text(`Name: ${patientUser?.name ?? '-'}`, 50, 240)
      .text(`Email: ${patientUser?.email ?? '-'}`, 250, 240)
      .text(`Age: ${age}`, 50, 260)
      .text(
        `Appointment: ${new Date(appointment.appointmentDate).toDateString()}`,
        250,
        260,
      )
      .text(`Time: ${appointment.timeSlot}`, 50, 280);

    // Medicine Table
    const tableTop = 330;
    const tableLeft = 40;
    const tableWidth = 510;
    const rowHeight = 25;

    const columns = [
      { label: 'Medicine', x: 50 },
      { label: 'Dosage', x: 170 },
      { label: 'Timing', x: 260 },
      { label: 'Meal', x: 360 },
      { label: 'Duration', x: 440 },
    ];

    // Table header
    doc
      .fillColor(tableHeaderColor)
      .rect(tableLeft, tableTop, tableWidth, rowHeight)
      .fill();
    doc.fillColor('white').fontSize(11);
    columns.forEach((col) => doc.text(col.label, col.x, tableTop + 7));

    doc.strokeColor(tableHeaderColor).lineWidth(1.2);
    doc.rect(tableLeft, tableTop, tableWidth, rowHeight).stroke();
    for (let i = 1; i < columns.length; i++) {
      const x = columns[i].x - 10;
      doc.moveTo(x, tableTop).lineTo(x, tableTop + rowHeight).stroke();
    }

    // Table rows
    let y = tableTop + rowHeight;
    const medicines = prescription.medicines ?? [];

    medicines.forEach((med: any) => {
      doc.strokeColor(tableHeaderColor).lineWidth(1);
      doc.rect(tableLeft, y, tableWidth, rowHeight).stroke();
      for (let i = 1; i < columns.length; i++) {
        const x = columns[i].x - 10;
        doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
      }
      doc.fillColor('black').fontSize(12);
      doc.text(med.medicineName ?? '-', columns[0].x, y + 7);
      doc.text(med.dosage ?? '-', columns[1].x, y + 7);
      const timing = med.timings?.length
        ? med.timings.map(t => t.timing.toLowerCase()).join(', ')
        : '-';
      doc.fontSize(10).text(timing, columns[2].x, y + 7);
      const meal = med.mealTime
        ? med.mealTime.toLowerCase().replace('_', ' ')
        : '-';

      doc.fontSize(10).text(meal, columns[3].x, y + 7);
      doc.text(med.duration ?? '-', columns[4].x, y + 7);
      y += rowHeight;
    });

    // Additional Notes
    doc.fillColor(primaryColor).fontSize(14).text('Additional Notes', 40, y + 20);
    doc
      .fillColor('black')
      .fontSize(12)
      .text(prescription.additionalNotes ?? '-', 40, y + 40);

    // Signature
    const signatureY = y + 80;
    doc
      .strokeColor(primaryColor)
      .lineWidth(1)
      .moveTo(400, signatureY)
      .lineTo(540, signatureY)
      .stroke();
    doc.text('Doctor Signature', 420, signatureY + 10);

    // Footer
    const footerLineY = 730;
    doc
      .strokeColor(primaryColor)
      .lineWidth(1)
      .moveTo(40, footerLineY)
      .lineTo(550, footerLineY)
      .stroke();
    doc
      .fillColor('gray')
      .fontSize(10)
      .text('Ahmedabad, Gujarat', 40, 735)
      .text('www.careslot.com', 220, 735)
      .text('support@careslot.com', 400, 735);


    doc.end();
  }
}