require('dotenv').config();
const { sendPasswordResetEmail } = require('./services/emailService');

// Test email function
async function testEmail() {
  console.log('=== TESTING MAILJET SMTP ===');
  console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
  
  // Check if EMAIL_FROM is properly configured
  if (process.env.EMAIL_FROM === 'your-email@domain.com') {
    console.log('⚠️  EMAIL_FROM needs to be a verified email address');
  }
  
  // Check Mailjet configuration
  if (process.env.EMAIL_HOST && process.env.EMAIL_HOST.includes('mailjet.com')) {
    console.log(' Mailjet SMTP configured');
  } else {
    console.log(' Mailjet SMTP not configured');
  }
  
  try {
    const testEmail = 'debbah.nagi.ala@gmail.com';
    const testToken = 'test-token-12345';
    
    console.log(`\nSending test email to: ${testEmail}`);
    
    const result = await sendPasswordResetEmail(testEmail, testToken);
    
    console.log('\n=== RESULT ===');
    console.log('Success:', result.success);
    console.log('Message:', result.message);
    
    if (result.error) {
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testEmail();
