import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const to = searchParams.get('to');

    if (!to) {
      return NextResponse.json(
        { ok: false, error: 'Missing "to" parameter' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check for required environment variables
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendgridApiKey) {
      return NextResponse.json(
        { ok: false, error: 'SENDGRID_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: sendgridApiKey
      }
    });

    // Email content
    const from = process.env.SMTP_FROM || 'EverWell <no-reply@everwellhealth.us>';
    const subject = 'SMTP Test - EverWell';
    const text = 'SMTP test OK - This email confirms your SendGrid SMTP configuration is working.';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563EB;">SMTP Test Successful</h2>
        <p>This email confirms your SendGrid SMTP configuration is working correctly.</p>
        <p><strong>Test Details:</strong></p>
        <ul>
          <li>Host: smtp.sendgrid.net</li>
          <li>Port: 587</li>
          <li>From: ${from}</li>
          <li>To: ${to}</li>
          <li>Timestamp: ${new Date().toISOString()}</li>
        </ul>
        <p style="color: #10B981; font-weight: bold;">✅ SMTP connection successful!</p>
      </div>
    `;

    // Send email
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html
    });

    return NextResponse.json({
      ok: true,
      message: 'SMTP test email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('SMTP test error:', error);
    
    let errorMessage = 'Unknown error occurred';
    let errorCode = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Extract error codes from common SMTP errors
      const message = error.message.toLowerCase();
      if (message.includes('535')) {
        errorCode = '535';
      } else if (message.includes('550')) {
        errorCode = '550';
      } else if (message.includes('429')) {
        errorCode = '429';
      } else if (message.includes('connection')) {
        errorCode = 'CONNECTION';
      }
    }
    
    return NextResponse.json(
      { 
        ok: false, 
        error: errorMessage,
        details: {
          code: errorCode,
          message: errorMessage
        }
      },
      { status: 500 }
    );
  }
}
