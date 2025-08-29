# EverWell Domain Setup - www.everwellhealth.us

This document covers the configuration required to run EverWell on your custom domain `www.everwellhealth.us`.

## Environment Variables

### Production Environment Variables

Set these in your Vercel project settings:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Site URL for your domain
NEXT_PUBLIC_SITE_URL=https://www.everwellhealth.us

# Email Configuration (if using SendGrid)
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SMTP_FROM=EverWell <no-reply@everwellhealth.us>

# AI Insights (if enabled)
OPENAI_API_KEY=your_openai_api_key_here
CRON_SECRET=your_secure_random_string_here
```

### Local Development Environment Variables

Create a `.env.local` file in the project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Site URL for local development
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email Configuration (if using SendGrid)
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SMTP_FROM=EverWell <no-reply@everwellhealth.us>

# AI Insights (if enabled)
OPENAI_API_KEY=your_openai_api_key_here
CRON_SECRET=your_secure_random_string_here
```

## Supabase Configuration

### 1. Authentication URL Configuration

In your Supabase project dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Set the following URLs:

```
Site URL: https://www.everwellhealth.us
Additional Redirect URLs:
- https://www.everwellhealth.us/auth/callback
- https://www.everwellhealth.us/auth/callback?type=recovery
- http://localhost:3000/auth/callback (for development)
- http://localhost:3000/auth/callback?type=recovery (for development)
```

### 2. Email Configuration

If using SendGrid for email delivery:

1. Go to **Authentication** → **Emails** → **SMTP Settings**
2. Configure with your verified sender:

```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: <Your SendGrid API key>
Sender email: no-reply@everwellhealth.us
Reply-to: support@everwellhealth.us
```

## DNS Configuration

### Required DNS Records

Ensure your domain has the following DNS records:

```
# A record for www subdomain
www.everwellhealth.us -> <Your hosting provider's IP>

# CNAME record for apex domain (optional)
everwellhealth.us -> www.everwellhealth.us

# MX records for email (if using custom email)
everwellhealth.us -> <Your email provider's MX servers>

# TXT records for email authentication (if using SendGrid)
everwellhealth.us -> v=spf1 include:sendgrid.net ~all
```

## Vercel Deployment

### 1. Domain Configuration

1. In your Vercel dashboard, go to your project settings
2. Navigate to **Domains**
3. Add your custom domain: `www.everwellhealth.us`
4. Follow the DNS configuration instructions provided by Vercel

### 2. Environment Variables

1. Go to **Environment Variables** in your Vercel project settings
2. Add all the production environment variables listed above
3. Ensure `NEXT_PUBLIC_SITE_URL` is set to `https://www.everwellhealth.us`

## Email Deliverability

### SendGrid Domain Authentication

For better email deliverability:

1. Go to SendGrid → Settings → Sender Authentication
2. Click "Authenticate Your Domain"
3. Follow the DNS setup instructions for `everwellhealth.us`
4. Wait for verification (can take up to 48 hours)

### DMARC Setup

Add a DMARC record to your DNS:

```
Type: TXT
Name: _dmarc.everwellhealth.us
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@everwellhealth.us
```

## Testing

### 1. Authentication Testing

1. Visit `https://www.everwellhealth.us/login`
2. Test magic link authentication
3. Verify email redirects work correctly
4. Test password reset functionality

### 2. Email Testing

1. Use the diagnostic tools at `/dev/email` (development only)
2. Test magic link emails
3. Test password reset emails
4. Check spam folder for test emails

### 3. API Testing

Test the following endpoints:

```bash
# Health check
curl https://www.everwellhealth.us/api/insights/health

# Authentication callback
curl https://www.everwellhealth.us/auth/callback

# Daily insights (if enabled)
curl -X POST https://www.everwellhealth.us/api/cron/daily-insights \
  -H "CRON_SECRET: your-secret-here"
```

## Security Headers

The application includes security headers configured in `next.config.ts` and `vercel.json`:

- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `Referrer-Policy: origin-when-cross-origin` - Controls referrer information

## Monitoring

### 1. Vercel Analytics

Enable Vercel Analytics to monitor:
- Page views and user engagement
- Performance metrics
- Error rates

### 2. Supabase Monitoring

Monitor your Supabase project for:
- Authentication events
- Database performance
- API usage

### 3. Email Deliverability

Monitor SendGrid Activity for:
- Email delivery rates
- Bounces and blocks
- Spam reports

## Troubleshooting

### Common Issues

1. **Authentication redirect errors**: Check Supabase URL configuration
2. **Email delivery issues**: Verify SendGrid domain authentication
3. **DNS propagation**: Allow up to 48 hours for DNS changes
4. **SSL certificate**: Ensure HTTPS is properly configured

### Debug Tools

- `/dev/email` - Email diagnostic tools (development only)
- `/dev/auth-config` - Authentication configuration check (development only)
- Browser developer tools - Check for console errors
- Network tab - Monitor API requests and responses

## Support

For domain-specific issues:
1. Check Vercel deployment logs
2. Verify environment variables are set correctly
3. Test with the diagnostic tools
4. Review Supabase authentication logs
