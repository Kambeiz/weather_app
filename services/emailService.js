// Email service for password reset functionality
const { Resend } = require('resend');
const nodemailer = require('nodemailer');

// Initialize Resend if API key is available (for local development)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Send email using Resend (commented for production, available for local dev)
const sendViaResend = async (emailContent) => {
  try {
    const { data, error } = await resend.emails.send({
      from: emailContent.from,
      to: [emailContent.to],
      subject: emailContent.subject,
      html: emailContent.html
    });

    if (error) {
      throw error;
    }

    console.log('Email sent successfully via Resend to:', emailContent.to);
    return { success: true, message: 'Email sent successfully via Resend' };
  } catch (error) {
    console.error('Resend error:', error);
    throw error;
  }
};

// Create email transporter
const createTransporter = () => {
  // Mailjet SMTP (Primary - French service)
  if (process.env.EMAIL_HOST && process.env.EMAIL_HOST.includes('mailjet.com')) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  
  // Fallback to generic SMTP configuration
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'in-v3.mailjet.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}/reset-password?token=${resetToken}`
    : `http://localhost:3000/reset-password?token=${resetToken}`;

  const emailContent = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Reset your D Weather password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Reset your D Weather password</title>
      </head>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; border: 0;">
          <tr>
            <td style="padding: 20px;">
              <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; border-collapse: collapse; border: 0;">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">D Weather</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your Weather Companion</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="background: white; padding: 40px; border-radius: 0 0 8px 8px;">
                    <h2 style="color: #2c5aa0; margin: 0 0 20px 0; font-size: 24px;">Reset Your Password</h2>
                    
                    <p style="color: #333; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                      Hello,
                    </p>
                    
                    <p style="color: #333; margin: 0 0 30px 0; font-size: 16px; line-height: 1.5;">
                      We received a request to reset the password for your D Weather account. 
                      Click the button below to create a new password:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${resetUrl}" style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 30px; display: inline-block; font-weight: bold; font-size: 16px;">
                        Reset Password
                      </a>
                    </div>
                    
                    <p style="color: #666; margin: 30px 0 15px 0; font-size: 14px; line-height: 1.5;">
                      Or copy and paste this link into your browser:
                    </p>
                    
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 0 0 30px 0;">
                      <p style="margin: 0; font-family: monospace; font-size: 12px; word-break: break-all; color: #495057;">
                        ${resetUrl}
                      </p>
                    </div>
                    
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 0 0 30px 0;">
                      <p style="margin: 0; color: #856404; font-size: 14px; font-weight: bold;">
                        ⏰ This link will expire in 1 hour.
                      </p>
                    </div>
                    
                    <p style="color: #666; margin: 0 0 30px 0; font-size: 14px; line-height: 1.5;">
                      If you didn't request this password reset, please ignore this email. 
                      Your account remains secure.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
                    
                    <p style="color: #6c757d; margin: 0; font-size: 14px; line-height: 1.5;">
                      Best regards,<br>
                      <strong>The D Weather Team</strong>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px; text-align: center; color: #6c757d; font-size: 12px;">
                    <p style="margin: 0;">
                      &copy; 2024 D Weather. All rights reserved.
                    </p>
                    <p style="margin: 10px 0 0 0;">
                      This email was sent to ${email}. If you believe this was sent in error, 
                      please contact our support team.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
D Weather - Password Reset Request

Hello,

You requested a password reset for your D Weather account. 

Reset your password by visiting this link: ${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, please ignore this email.

Best regards,
The D Weather Team
    `
  };

  try {
    const transporter = createTransporter();
    await transporter.sendMail(emailContent);
    console.log('Password reset email sent successfully to:', email);
    return {
      success: true,
      message: 'Password reset email sent successfully',
      resetUrl: resetUrl
    };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    
    // Fallback to logging if email sending fails
    console.log('=== PASSWORD RESET EMAIL (FALLBACK) ===');
    console.log('To:', emailContent.to);
    console.log('Subject:', emailContent.subject);
    console.log('Reset URL:', resetUrl);
    console.log('Error:', error.message);
    console.log('====================================');
    
    return {
      success: false,
      message: 'Failed to send email, but reset link has been logged',
      error: error.message,
      resetUrl: resetUrl
    };
  }
};

const sendWelcomeEmail = async (email, username) => {
  // Welcome email for new registrations
  const emailContent = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Welcome to D Weather!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to D Weather!</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #2c5aa0;">Hello ${username}!</h2>
          <p>Thank you for joining D Weather. You can now:</p>
          <ul>
            <li>Check weather for any location instantly</li>
            <li>Save your favorite locations</li>
            <li>Access detailed weather maps and forecasts</li>
            <li>Install our app on your mobile device</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.VERCEL_URL || 'http://localhost:3000'}" style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">Start Using D Weather</a>
          </div>
          <p>Happy weather checking!</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; font-size: 14px;">
            Best regards,<br>
            The D Weather Team
          </p>
        </div>
      </div>
    `
  };

  try {
    const transporter = createTransporter();
    await transporter.sendMail(emailContent);
    console.log('Welcome email sent successfully to:', email);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    
    // Fallback to logging if email sending fails
    console.log('=== WELCOME EMAIL (FALLBACK) ===');
    console.log('To:', emailContent.to);
    console.log('Subject:', emailContent.subject);
    console.log('Error:', error.message);
    console.log('===============================');
  }  
};

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail
};
