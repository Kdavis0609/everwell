# Supabase Email Templates - EverWell

This guide provides consistent, branded email templates for all Supabase authentication flows.

## Template Locations

**Supabase Dashboard → Authentication → Email Templates**

Available templates:
- **Confirm Signup** - Email confirmation for new accounts
- **Magic Link** - Passwordless sign-in
- **Reset Password** - Password recovery
- **Change Email** - Email address updates

## Template Setup Instructions

### 1. Access Email Templates
1. Go to Supabase Dashboard → Authentication → Email Templates
2. Select the template you want to customize
3. Click "Edit" to modify the template
4. Replace the default content with the HTML below
5. Save changes

### 2. Insert Dynamic Variables
- **`{{ .ConfirmationURL }}`** - The authentication link (use in both button and fallback text)
- **`{{ .Email }}`** - User's email address
- **`{{ .TokenHash }}`** - Security token (rarely needed)

### 3. Deliverability Steps
After setting up templates:

1. **Domain Authentication** (Recommended):
   - Go to SendGrid → Settings → Sender Authentication
   - Click "Authenticate Your Domain"
   - Follow DNS setup instructions
   - Wait for verification (up to 48 hours)

2. **DMARC Setup**:
   - Add DMARC record to your DNS: `v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com`
   - Monitor DMARC reports for deliverability issues

3. **Test Deliverability**:
   - Use `/dev/email` diagnostic tools
   - Check spam folder for test emails
   - Monitor SendGrid → Activity for delivery status

## Email Templates

### 1. Confirm Signup Template

**Subject:** `Confirm your EverWell account`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Your EverWell Account</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .logo {
            font-size: 28px;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
        }
        .content {
            padding: 40px 30px;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 16px 0;
            text-align: center;
        }
        .message {
            font-size: 16px;
            color: #4b5563;
            margin: 0 0 32px 0;
            text-align: center;
        }
        .button-container {
            text-align: center;
            margin: 32px 0;
        }
        .button {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: background-color 0.2s;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .fallback {
            font-size: 14px;
            color: #6b7280;
            text-align: center;
            margin: 24px 0;
            word-break: break-all;
        }
        .footer {
            background-color: #f9fafb;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer-text {
            font-size: 14px;
            color: #6b7280;
            margin: 0;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            .header, .content, .footer {
                padding: 24px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="logo">EverWell</h1>
        </div>
        
        <div class="content">
            <h2 class="title">Welcome to EverWell!</h2>
            <p class="message">
                Thanks for signing up! Please confirm your email address to start tracking your health journey.
            </p>
            
            <div class="button-container">
                <a href="{{ .ConfirmationURL }}" class="button">Confirm Email Address</a>
            </div>
            
            <div class="fallback">
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p>{{ .ConfirmationURL }}</p>
            </div>
        </div>
        
        <div class="footer">
            <p class="footer-text">
                This link will expire in 24 hours. If you didn't create an EverWell account, you can safely ignore this email.
            </p>
        </div>
    </div>
</body>
</html>
```

### 2. Magic Link Template

**Subject:** `Sign in to EverWell`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign in to EverWell</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .logo {
            font-size: 28px;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
        }
        .content {
            padding: 40px 30px;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 16px 0;
            text-align: center;
        }
        .message {
            font-size: 16px;
            color: #4b5563;
            margin: 0 0 32px 0;
            text-align: center;
        }
        .button-container {
            text-align: center;
            margin: 32px 0;
        }
        .button {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: background-color 0.2s;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .fallback {
            font-size: 14px;
            color: #6b7280;
            text-align: center;
            margin: 24px 0;
            word-break: break-all;
        }
        .footer {
            background-color: #f9fafb;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer-text {
            font-size: 14px;
            color: #6b7280;
            margin: 0;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            .header, .content, .footer {
                padding: 24px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="logo">EverWell</h1>
        </div>
        
        <div class="content">
            <h2 class="title">Sign in to EverWell</h2>
            <p class="message">
                Click the button below to securely sign in to your EverWell account. No password required!
            </p>
            
            <div class="button-container">
                <a href="{{ .ConfirmationURL }}" class="button">Sign In to EverWell</a>
            </div>
            
            <div class="fallback">
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p>{{ .ConfirmationURL }}</p>
            </div>
        </div>
        
        <div class="footer">
            <p class="footer-text">
                This link will expire in 1 hour. If you didn't request this sign-in link, you can safely ignore this email.
            </p>
        </div>
    </div>
</body>
</html>
```

### 3. Reset Password Template

**Subject:** `Reset your EverWell password`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your EverWell Password</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .logo {
            font-size: 28px;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
        }
        .content {
            padding: 40px 30px;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 16px 0;
            text-align: center;
        }
        .message {
            font-size: 16px;
            color: #4b5563;
            margin: 0 0 32px 0;
            text-align: center;
        }
        .button-container {
            text-align: center;
            margin: 32px 0;
        }
        .button {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: background-color 0.2s;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .fallback {
            font-size: 14px;
            color: #6b7280;
            text-align: center;
            margin: 24px 0;
            word-break: break-all;
        }
        .footer {
            background-color: #f9fafb;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer-text {
            font-size: 14px;
            color: #6b7280;
            margin: 0;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            .header, .content, .footer {
                padding: 24px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="logo">EverWell</h1>
        </div>
        
        <div class="content">
            <h2 class="title">Reset Your Password</h2>
            <p class="message">
                We received a request to reset your EverWell password. Click the button below to create a new password.
            </p>
            
            <div class="button-container">
                <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
            </div>
            
            <div class="fallback">
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p>{{ .ConfirmationURL }}</p>
            </div>
        </div>
        
        <div class="footer">
            <p class="footer-text">
                This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </p>
        </div>
    </div>
</body>
</html>
```

### 4. Change Email Template

**Subject:** `Confirm your new EverWell email address`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Your New Email Address</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .logo {
            font-size: 28px;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
        }
        .content {
            padding: 40px 30px;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 16px 0;
            text-align: center;
        }
        .message {
            font-size: 16px;
            color: #4b5563;
            margin: 0 0 32px 0;
            text-align: center;
        }
        .button-container {
            text-align: center;
            margin: 32px 0;
        }
        .button {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: background-color 0.2s;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .fallback {
            font-size: 14px;
            color: #6b7280;
            text-align: center;
            margin: 24px 0;
            word-break: break-all;
        }
        .footer {
            background-color: #f9fafb;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer-text {
            font-size: 14px;
            color: #6b7280;
            margin: 0;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            .header, .content, .footer {
                padding: 24px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="logo">EverWell</h1>
        </div>
        
        <div class="content">
            <h2 class="title">Confirm Your New Email</h2>
            <p class="message">
                You requested to change your EverWell email address. Click the button below to confirm this change.
            </p>
            
            <div class="button-container">
                <a href="{{ .ConfirmationURL }}" class="button">Confirm Email Change</a>
            </div>
            
            <div class="fallback">
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p>{{ .ConfirmationURL }}</p>
            </div>
        </div>
        
        <div class="footer">
            <p class="footer-text">
                This link will expire in 1 hour. If you didn't request this email change, you can safely ignore this email.
            </p>
        </div>
    </div>
</body>
</html>
```

## Template Features

### Design Elements
- **Consistent Branding**: EverWell logo and blue color scheme (#2563EB)
- **Responsive Design**: Works on desktop and mobile devices
- **Accessible**: High contrast, readable fonts, clear button text
- **Professional**: Clean layout with proper spacing and typography

### Technical Features
- **Fallback Links**: Plain text URLs for email clients that don't support HTML
- **Mobile Optimized**: Responsive design that works on all screen sizes
- **Cross-Client Compatible**: Works in Gmail, Outlook, Apple Mail, etc.
- **Security**: Clear expiration notices and security warnings

### Content Guidelines
- **Brief & Clear**: Short, actionable messages
- **User-Friendly**: Plain language, no technical jargon
- **Action-Oriented**: Clear call-to-action buttons
- **Security Conscious**: Includes expiration notices and safety warnings

## Testing Your Templates

1. **Use `/dev/email` diagnostic tools** to test email delivery
2. **Check multiple email clients** (Gmail, Outlook, Apple Mail)
3. **Test on mobile devices** to ensure responsive design works
4. **Verify link functionality** by clicking through the complete flow
5. **Check spam folder** to ensure deliverability

## Troubleshooting

### Common Issues
- **Links not working**: Ensure `{{ .ConfirmationURL }}` is properly inserted
- **Styling not showing**: Some email clients strip CSS - test fallback text
- **Images not loading**: Use text-based design for maximum compatibility
- **Spam filtering**: Set up domain authentication and DMARC records

### Best Practices
- Keep subject lines under 50 characters
- Use clear, action-oriented button text
- Include plain text fallbacks for all links
- Test across multiple email clients
- Monitor deliverability rates in SendGrid
