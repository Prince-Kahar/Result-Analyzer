import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const createTransporter = () => {
  const user = process.env.SMTP_SENDER_EMAIL;
  const pass = (process.env.SMTP_APP_PASSWORD || '').replace(/\s+/g, '');
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user, pass }
  });
};

export const isEmailConfigured = () => {
  return !!(process.env.SMTP_SENDER_EMAIL && process.env.SMTP_APP_PASSWORD);
};

// Automated OTP Email Generator
export const sendOtpEmail = async (toEmail, otpCode, purpose = 'Faculty Registration') => {
  const transporter = createTransporter();
  const senderEmail = process.env.SMTP_SENDER_EMAIL || 'no-reply@vnsgu.ac.in';

  const mailOptions = {
    from: `"VNSGU Result Intelligence Suite" <${senderEmail}>`,
    to: toEmail,
    subject: `🔐 [${purpose}] Your Verification Code: ${otpCode}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; background-color: #0b132b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
          .container { max-width: 560px; margin: 30px auto; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #0d9488 0%, #0284c7 100%); padding: 32px 24px; text-align: center; }
          .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0; color: #ccfbf1; font-size: 13px; font-weight: 500; }
          .content { padding: 36px 28px; text-align: center; color: #e2e8f0; }
          .subtext { font-size: 15px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
          .otp-card { background: #1e293b; border: 2px dashed #0d9488; border-radius: 12px; padding: 18px 24px; margin: 20px auto 28px; display: inline-block; }
          .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #2dd4bf; margin: 0; }
          .notice-box { background: #1e1e38; border-left: 4px solid #38bdf8; padding: 12px 16px; border-radius: 6px; text-align: left; margin-bottom: 24px; }
          .notice-text { font-size: 12px; color: #cbd5e1; margin: 0; line-height: 1.5; }
          .footer { background: #080d1a; padding: 20px 24px; text-align: center; border-top: 1px solid #1e293b; }
          .footer p { margin: 0; font-size: 12px; color: #64748b; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Veer Narmad South Gujarat University</h1>
            <p>SASCMA Examination Result Analytics Suite</p>
          </div>
          <div class="content">
            <h2 style="margin: 0 0 12px; font-size: 18px; color: #ffffff;">Account Verification Required</h2>
            <p class="subtext">
              We received a request to complete <strong>${purpose}</strong> for your institutional profile. Please use the one-time verification code below:
            </p>
            
            <div class="otp-card">
              <div class="otp-code">${otpCode}</div>
            </div>

            <div class="notice-box">
              <p class="notice-text">
                ⏱️ <strong>Validity:</strong> This code expires in <strong>10 minutes</strong>.<br>
                🔒 <strong>Security Advice:</strong> Never disclose this code to anyone. University staff will never ask for your password or OTP.
              </p>
            </div>

            <p style="font-size: 13px; color: #64748b; margin: 0;">
              If you did not initiate this request, you can safely disregard this message.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} SASCMA & VNSGU Examination Intelligence Division.<br>Surat, Gujarat, India.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  return transporter.sendMail(mailOptions);
};

// Automated Welcome Email Generator
export const sendWelcomeEmail = async (toEmail, username, collegeName = 'VNSGU Affiliated College') => {
  const transporter = createTransporter();
  const senderEmail = process.env.SMTP_SENDER_EMAIL || 'no-reply@vnsgu.ac.in';
  const loginUrl = 'https://student-result-analyzer.antideploy.com/login';

  const mailOptions = {
    from: `"VNSGU Result Intelligence Suite" <${senderEmail}>`,
    to: toEmail,
    subject: `🎉 Welcome to VNSGU Result Analyzer, ${username}!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; background-color: #0b132b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
          .container { max-width: 580px; margin: 30px auto; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #0d9488 0%, #0369a1 100%); padding: 36px 24px; text-align: center; }
          .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; }
          .header p { margin: 6px 0 0; color: #ccfbf1; font-size: 13px; font-weight: 500; }
          .content { padding: 36px 30px; color: #e2e8f0; line-height: 1.6; }
          .greeting { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
          .details-card { background: #1e293b; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #334155; }
          .cta-btn { display: inline-block; background: #0d9488; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 14px 32px; border-radius: 10px; margin-top: 20px; text-align: center; box-shadow: 0 4px 14px rgba(13,148,136,0.4); }
          .footer { background: #080d1a; padding: 20px 24px; text-align: center; border-top: 1px solid #1e293b; }
          .footer p { margin: 0; font-size: 12px; color: #64748b; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Result Analyzer</h1>
            <p>Faculty & Evaluation Intelligence Platform</p>
          </div>
          <div class="content">
            <div class="greeting">Hello, ${username}!</div>
            <p style="color: #94a3b8; margin: 0 0 18px; font-size: 14px;">
              Your faculty account has been officially registered on the <strong>SASCMA Student Result Analyzer</strong>. You now have full access to university-wide examination gazette parsing, student lookups, and visual performance analytics.
            </p>

            <div class="details-card">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Username:</td>
                  <td style="padding: 6px 0; color: #ffffff; font-weight: 700; text-align: right;">${username}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Email:</td>
                  <td style="padding: 6px 0; color: #38bdf8; font-weight: 600; text-align: right;">${toEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">College/Institute:</td>
                  <td style="padding: 6px 0; color: #2dd4bf; font-weight: 600; text-align: right;">${collegeName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Account Status:</td>
                  <td style="padding: 6px 0; color: #10b981; font-weight: 700; text-align: right;">Verified & Active</td>
                </tr>
              </table>
            </div>

            <div style="background: #131c31; border-radius: 10px; padding: 16px; margin: 20px 0;">
              <div style="font-size: 14px; font-weight: 700; color: #2dd4bf; margin-bottom: 8px;">What you can do next:</div>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #cbd5e1;">
                <li style="margin-bottom: 6px;"><strong>Upload Tabulated Marksheets:</strong> Parse multi-page VNSGU PDFs in seconds.</li>
                <li style="margin-bottom: 6px;"><strong>Student Lookup:</strong> Search individual seat numbers, subject scores, and SGPA.</li>
                <li style="margin-bottom: 6px;"><strong>Comparative Analytics:</strong> Analyze pass/fail distributions across participating colleges.</li>
                <li style="margin-bottom: 6px;"><strong>Export Gazette Reports:</strong> Generate instant PDF and Excel summaries for academic meetings.</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 28px 0 10px;">
              <a href="${loginUrl}" class="cta-btn">Access Faculty Portal →</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} SASCMA & Veer Narmad South Gujarat University.<br>All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  return transporter.sendMail(mailOptions);
};

export const sendParentWarningEmail = async (toEmail, studentDetails) => {
  const transporter = createTransporter();
  const mailOptions = {
    from: `"Academic Office - SASCMA" <${process.env.SMTP_SENDER_EMAIL}>`,
    to: toEmail,
    subject: `Urgent Academic Warning: ${studentDetails.name} (Seat No: ${studentDetails.seat_no})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #ef4444;">
        <div style="background: #dc2626; padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0;">Official Academic Notice</h2>
          <p style="margin: 4px 0 0; font-size: 14px;">Veer Narmad South Gujarat University Examination Division</p>
        </div>
        <div style="padding: 24px;">
          <p>Dear Parent / Guardian,</p>
          <p>This is to formally notify you regarding the academic standing of <strong>${studentDetails.name}</strong> (Seat: <strong>${studentDetails.seat_no}</strong>, College: ${studentDetails.college}).</p>
          <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Current Status:</strong> <span style="color: #ef4444; font-weight: bold;">${studentDetails.overall_status}</span></p>
            <p style="margin: 4px 0;"><strong>SGPA:</strong> ${studentDetails.sgpa}</p>
            <p style="margin: 4px 0;"><strong>Active Backlogs / ATKT:</strong> ${studentDetails.atkt_count}</p>
          </div>
          <p>Please contact the institution administration for counseling and remedial lecture scheduling.</p>
        </div>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
};
