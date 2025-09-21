// Email service for password reset functionality
const { Resend } = require('resend');
const nodemailer = require('nodemailer');

// Initialize Resend if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Send email using Resend
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
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else if (process.env.EMAIL_SERVICE === 'outlook') {
    return nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  
  // Fallback to SMTP configuration
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
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
    subject: 'D Weather - Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">D Weather</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #2c5aa0;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You requested a password reset for your D Weather account. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px; font-family: monospace;">${resetUrl}</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; font-size: 14px;">
            Best regards,<br>
            The D Weather Team
          </p>
        </div>
      </div>
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
    // Try Resend first if API key is available
    if (resend && process.env.RESEND_API_KEY) {
      return await sendViaResend(emailContent);
    }
    
    // Check if email configuration is available
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('Email configuration not found. Logging email content for demo purposes:');
      console.log('=== PASSWORD RESET EMAIL ===');
      console.log('To:', emailContent.to);
      console.log('Subject:', emailContent.subject);
      console.log('Reset URL:', resetUrl);
      console.log('========================');
      
      return {
        success: true,
        message: 'Password reset email logged (demo mode - no email sent)',
        resetUrl: resetUrl,
        demo: true
      };
    }

    // Create transporter and send email
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
    // Try Resend first if API key is available
    if (resend && process.env.RESEND_API_KEY) {
      await sendViaResend(emailContent);
      console.log('Welcome email sent successfully via Resend to:', email);
      return;
    }
    
    // Check if email configuration is available
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('Email configuration not found. Logging welcome email for demo purposes:');
      console.log('=== WELCOME EMAIL ===');
      console.log('To:', emailContent.to);
      console.log('Subject:', emailContent.subject);
      console.log('==================');
      return;
    }

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
    return {
      success: false,
      message: 'Failed to send welcome email',
      error: error.message
    };
};

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail
};
