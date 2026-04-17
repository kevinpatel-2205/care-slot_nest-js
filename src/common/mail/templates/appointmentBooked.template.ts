export function appointmentBookedTemplate({
  doctorName,
  patientName,
  patientEmail,
  patientAge,
  dateOfBirth,
  appointmentDate,
  timeSlot,
  reason,
  medicalHistory,
  dashboardLink,
  year,
}: {
  doctorName: string;
  patientName: string;
  patientEmail: string;
  patientAge: string | number;
  dateOfBirth: string;
  appointmentDate: string;
  timeSlot: string;
  reason: string;
  medicalHistory: string;
  dashboardLink: string;
  year: number;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>New Appointment Booked - CareSlot</title>
<style>
body { margin: 0; padding: 0; background-color: #f4f7fc; font-family: 'Segoe UI', Arial, sans-serif; }
.container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.05); }
.header { background: linear-gradient(135deg, #2563eb, #1e40af); padding: 30px; text-align: center; color: #ffffff; }
.logo { width: 60px; margin-bottom: 10px; }
.header h1 { margin: 0; font-size: 26px; letter-spacing: 1px; }
.content { padding: 35px; color: #1f2937; }
.content h2 { margin-top: 0; color: #1e3a8a; }
.content p { font-size: 15px; line-height: 1.6; }
.info-card { background: #f1f5f9; padding: 20px; border-radius: 10px; margin-top: 20px; }
.info-card p { margin: 8px 0; font-size: 14px; }
.label { font-weight: bold; color: #111827; }
.button-wrapper { text-align: center; }
.button { display: inline-block; margin-top: 30px; padding: 14px 30px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; }
.footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; background-color: #f9fafb; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <img src="https://res.cloudinary.com/dqkbv1knl/image/upload/v1772173127/logo_pfynmy.png" class="logo" alt="CareSlot Logo">
    <h1>CareSlot</h1>
  </div>
  <div class="content">
    <h2>New Appointment Booked, Dr. ${doctorName},</h2>
    <p>A patient has successfully booked an appointment with you. Below are the appointment and patient details:</p>
    <div class="info-card">
      <p><span class="label">Patient Name:</span> ${patientName}</p>
      <p><span class="label">Patient Email:</span> ${patientEmail}</p>
      <p><span class="label">Patient Age:</span> ${patientAge ?? 'N/A'}</p>
      <p><span class="label">Date of Birth:</span> ${dateOfBirth ?? 'N/A'}</p>
      <p><span class="label">Appointment Date:</span> ${appointmentDate}</p>
      <p><span class="label">Time Slot:</span> ${timeSlot}</p>
      <p><span class="label">Reason / Notes:</span> ${reason ?? 'N/A'}</p>
      <p><span class="label">Medical History:</span> ${medicalHistory ?? 'N/A'}</p>
    </div>
    <div class="button-wrapper">
      <a href="${dashboardLink}" class="button">View Appointment Details</a>
    </div>
    <p style="margin-top:30px;">Please log in to your dashboard for more details and to manage this appointment.</p>
  </div>
  <div class="footer">
    © ${year} CareSlot. All rights reserved.<br>
    Created By <strong>Kevin Patel</strong>
  </div>
</div>
</body>
</html>`;
}