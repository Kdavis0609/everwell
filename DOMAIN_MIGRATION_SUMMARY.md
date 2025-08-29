# EverWell Domain Migration Summary

## Overview

This document summarizes all the changes made to configure EverWell for the new domain `www.everwellhealth.us`.

## Changes Made

### 1. Configuration Files Updated

#### `next.config.ts`
- Added security headers for production domain
- Configured X-Frame-Options, X-Content-Type-Options, and Referrer-Policy headers

#### `vercel.json`
- Added security headers configuration
- Enhanced deployment settings for custom domain

#### `src/lib/utils/url.ts`
- Updated default fallback URL from `localhost:3000` to `https://www.everwellhealth.us`
- Improved domain handling logic

### 2. Documentation Updates

#### New Files Created
- `DOMAIN_SETUP.md` - Comprehensive domain setup guide
- `scripts/setup-domain.sh` - Bash setup script
- `scripts/setup-domain.ps1` - PowerShell setup script
- `DOMAIN_MIGRATION_SUMMARY.md` - This summary document

#### Updated Files
- `README.md` - Added live site link and domain-specific environment variables
- `DEPLOYMENT.md` - Updated production URL references
- `AUTH_SETUP.md` - Updated domain configuration examples
- `EMAIL_TROUBLESHOOTING.md` - Updated URL examples and email configuration
- `AI_INSIGHTS_SETUP.md` - Updated production URL references
- `package.json` - Added domain setup scripts

### 3. Environment Variables

#### Production Environment Variables Required
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=https://www.everwellhealth.us
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SMTP_FROM=EverWell <no-reply@everwellhealth.us>
OPENAI_API_KEY=your_openai_api_key_here
CRON_SECRET=your_secure_random_string_here
```

#### Local Development Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SMTP_FROM=EverWell <no-reply@everwellhealth.us>
OPENAI_API_KEY=your_openai_api_key_here
CRON_SECRET=your_secure_random_string_here
```

## Required Configuration Steps

### 1. Supabase Configuration
- Update Authentication → URL Configuration
- Set Site URL to: `https://www.everwellhealth.us`
- Add redirect URLs for authentication callbacks

### 2. Vercel Configuration
- Add custom domain: `www.everwellhealth.us`
- Set environment variables in Vercel dashboard
- Configure DNS records as per Vercel instructions

### 3. DNS Configuration
- A record: `www.everwellhealth.us` → Vercel IP
- CNAME record: `everwellhealth.us` → `www.everwellhealth.us`
- SPF record: `v=spf1 include:sendgrid.net ~all`
- DMARC record: `v=DMARC1; p=quarantine; rua=mailto:dmarc@everwellhealth.us`

### 4. Email Configuration (if using SendGrid)
- Authenticate domain in SendGrid
- Update Supabase SMTP settings
- Verify sender email addresses

## Testing Checklist

- [ ] Authentication works at `https://www.everwellhealth.us/login`
- [ ] Magic link emails are delivered correctly
- [ ] Password reset functionality works
- [ ] All API endpoints respond correctly
- [ ] Email templates use correct domain
- [ ] SSL certificate is valid
- [ ] Security headers are present
- [ ] Mobile responsiveness works
- [ ] Performance is acceptable

## Quick Setup Commands

### Windows (PowerShell)
```powershell
npm run setup:domain:ps
```

### Unix/Linux/macOS (Bash)
```bash
npm run setup:domain:bash
```

## Security Enhancements

The migration includes several security improvements:
- Security headers to prevent clickjacking and MIME sniffing
- Proper referrer policy configuration
- Domain-specific email authentication
- Enhanced DNS security with SPF and DMARC records

## Monitoring

After deployment, monitor:
- Vercel Analytics for performance and errors
- Supabase logs for authentication events
- SendGrid Activity for email deliverability
- DNS propagation and SSL certificate status

## Support

For issues related to the domain migration:
1. Check Vercel deployment logs
2. Verify environment variables are set correctly
3. Test with diagnostic tools at `/dev/email` and `/dev/auth-config`
4. Review Supabase authentication logs
5. Check DNS propagation status

## Rollback Plan

If issues occur, you can:
1. Revert environment variables to previous values
2. Update Supabase URL configuration
3. Switch DNS back to previous configuration
4. Deploy previous version from Git history

---

**Migration Date**: $(date)
**Domain**: www.everwellhealth.us
**Status**: Configuration Complete - Ready for Deployment
