import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_SENDER_EMAIL,
    pass: (process.env.SMTP_APP_PASSWORD || '').replace(/\s+/g, '')
  }
});

export const sendOtpEmail = async (toEmail, otpCode, purpose = 'Account Verification') => {
  const mailOptions = {
    from: `"SASCMA Result Analyzer" <${process.env.SMTP_SENDER_EMAIL}>`,
    to: toEmail,
    subject: `[${purpose}] Your Verification OTP: ${otpCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
        <div style="background: linear-gradient(135deg, #0d9488, #0284c7); padding: 24px; text-align: center;">
          <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: bold;">SASCMA Student Result Analyzer</h2>
          <p style="margin: 4px 0 0; color: #e0f2fe; font-size: 13px;">Veer Narmad South Gujarat University Examination Portal</p>
        </div>
        <div style="padding: 28px 24px; text-align: center;">
          <p style="font-size: 15px; color: #94a3b8; margin-bottom: 20px;">Use the following One-Time Password (OTP) to complete your <strong>${purpose}</strong>:</p>
          <div style="display: inline-block; background: #1e293b; border: 2px dashed #0d9488; color: #38bdf8; font-size: 32px; font-weight: 800; letter-spacing: 8px; padding: 12px 28px; border-radius: 8px; margin: 12px 0 24px;">
            ${otpCode}
          </div>
          <p style="font-size: 13px; color: #64748b; margin: 0;">This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
        </div>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
};

export const sendParentWarningEmail = async (toEmail, studentDetails) => {
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
