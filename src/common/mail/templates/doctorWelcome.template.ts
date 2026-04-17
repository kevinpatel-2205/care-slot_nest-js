export function doctorWelcomeTemplate({
  doctorName,
  email,
  password,
  dashboardLink,
  year,
}: {
  doctorName: string;
  email: string;
  password: string;
  dashboardLink: string;
  year: number;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Welcome to CareSlot</title>
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
    <h2>Welcome Dr. ${doctorName},</h2>
    <p>Your account has been successfully created by the administrator. Below are your login details:</p>
    <div class="info-card">
      <p><span class="label">Email:</span> ${email}</p>
      <p><span class="label">Password:</span> ${password}</p>
    </div>
    <div class="button-wrapper">
      <a href="${dashboardLink}" class="button">Open Doctor Dashboard</a>
    </div>
    <p style="margin-top:30px;">For security reasons, please log in and change your password immediately.</p>
  </div>
  <div class="footer">
    © ${year} CareSlot. All rights reserved.<br>
    Created By <strong>Kevin Patel</strong>
  </div>
</div>
</body>
</html>`;
}