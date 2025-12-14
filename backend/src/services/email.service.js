import nodemailer from 'nodemailer';

class EmailService {
  constructor() {

    const isSecure = process.env.EMAIL_PORT == 465;

    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: isSecure,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async sendResetPasswordEmail(email, username, resetCode) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'Mã xác thực đặt lại mật khẩu',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Xin chào ${username}!</h2>
            <p style="font-size: 16px; color: #555;">
              Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.
            </p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p style="font-size: 14px; color: #666; margin: 0 0 10px 0;">
                Mã xác thực của bạn là:
              </p>
              <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px; margin: 10px 0;">
                ${resetCode}
              </h1>
            </div>
            <p style="font-size: 14px; color: #555;">
              Mã này sẽ hết hiệu lực sau <strong>5 phút</strong>.
            </p>
            <p style="font-size: 14px; color: #999;">
              Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
            </p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #999;">
              Email này được gửi tự động từ hệ thống giám sát IoT.
            </p>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✓ Reset password email sent:', info.messageId);
      return true;
    } catch (err) {
      console.error('Error sending email:', err);
      return false;
    }
  }

  async sendAlertEmail(email, deviceName, rule){
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: '[CẢNH BÁO] Từ hệ thống giám sát',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Xin chào!</h2>
            <p style="font-size: 16px; color: #555;">
              Có 1 thiết bị đã vượt ngưỡng cảnh báo mà bạn đã đặt ra.
            </p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p style="font-size: 14px; color: #666; margin: 0 0 10px 0;">
                Thiêt bị có tên ${deviceName} đã kích hoạt cảnh báo ${rule}
              </p>
            </div>
            <p style="font-size: 14px; color: #555;">
              Hãy kiểm tra có chuyện gì đang xảy ra để đảm bảo hệ thống hoạt động ổn định.
            </p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #999;">
              Email này được gửi tự động từ hệ thống giám sát IoT.
            </p>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✓ Alert email sent:', info.messageId);
      return true;
    } catch (err) {
      console.error('Error sending email:', err);
      return false;
    }
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✓ Email service ready');
      return true;
    } catch (err) {
      console.error('Email service error:', err.message);
      return false;
    }
  }
}

const emailService = new EmailService();
export default emailService;