// Simple email test script
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('Testing email configuration...');
  
  // Create transporter
  const transporter = nodemailer.createTransporter({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  });

  try {
    // Send test email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'EverWell <kevin@everwellhealth.us>',
      to: 'test@example.com',
      subject: 'Test Email from EverWell',
      text: 'This is a test email to verify SMTP configuration.',
      html: '<p>This is a test email to verify SMTP configuration.</p>'
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (error) {
    console.error('❌ Email failed to send:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
  }
}

testEmail();
