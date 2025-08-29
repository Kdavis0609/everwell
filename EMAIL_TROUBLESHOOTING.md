# Email Troubleshooting (Supabase + SendGrid)

This guide helps you diagnose and fix email issues with EverWell's authentication system.

## Quick Diagnostic Tools

Visit `/dev/email` in development mode to run automated tests:
- **SMTP Test**: Direct SendGrid connection test
- **Magic Link Test**: Supabase magic link email test
- **Password Reset Test**: Supabase password reset email test
- **Config Check**: Verify environment variables and redirect URLs

## Supabase Configuration

### 1. Authentication → Emails (SMTP Settings)

Configure these **exact** settings in your Supabase project dashboard:

```
Host: smtp.sendgrid.net
Port: 587 (try 465 if 587 is blocked)
Username: apikey
Password: <Your SendGrid API key that starts with "SG.">
Sender email: <Verified sender email, e.g., kevin@everwellhealth.us>
Reply-to: <Your support inbox>
```

**Important Notes:**
- **Username must be exactly `apikey`** (not your SendGrid username)
- **Password must be your SendGrid API key** (starts with `SG.`)
- **Sender email must be verified** in SendGrid → Sender Authentication
- **Copy the exact values** from your SendGrid API key and verified sender

### 2. Authentication → URL Configuration

Set these URLs in your Supabase project:

```
Site URL: https://www.everwellhealth.us (or http://localhost:3000 in dev)
Additional Redirect URLs:
- https://www.everwellhealth.us/auth/callback
- https://www.everwellhealth.us/auth/callback?type=recovery
- http://localhost:3000/auth/callback (for development)
- http://localhost:3000/auth/callback?type=recovery (for development)
```

### 3. Authentication → Settings

Configure email settings:

```
Enable email confirmations: ON/OFF (your preference)
Secure email change: ON (recommended)
Double confirm changes: ON (recommended)
Minimum interval between emails: 10-30 seconds (for testing)
```

## SendGrid Configuration

### 1. Sender Authentication

**Option A: Single Sender Verification**
1. Go to SendGrid → Settings → Sender Authentication
2. Click "Verify a Single Sender"
3. Enter your sender details and verify via email
4. Status must show "Verified" (not "Pending")

**Option B: Domain Authentication (Recommended for Production)**
1. Go to SendGrid → Settings → Sender Authentication
2. Click "Authenticate Your Domain"
3. Follow DNS setup instructions
4. Wait for verification (can take up to 48 hours)

### 2. API Key Setup

1. Go to SendGrid → Settings → API Keys
2. Create a new API key with "Mail Send" permissions
3. Copy the key (starts with `SG.`)
4. Add to your environment variables as `SENDGRID_API_KEY`

### 3. Clear Suppressions

If emails aren't being delivered:
1. Go to SendGrid → Activity
2. Check for bounces, blocks, or spam reports
3. Clear suppressions for your test email address

## Environment Variables

Ensure these are set in your `.env.local`:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# For SMTP testing (optional)
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SMTP_FROM=EverWell <no-reply@everwellhealth.us>
```

**Where to set these:**
- **Local development**: Add to `.env.local` file in project root
- **Vercel production**: Set in Vercel dashboard → Project Settings → Environment Variables
- **SendGrid API Key**: Get from SendGrid → Settings → API Keys (create with "Mail Send" permissions)
- **SMTP_FROM**: Use a verified sender email from SendGrid → Sender Authentication

For production:
```bash
NEXT_PUBLIC_SITE_URL=https://www.everwellhealth.us
```

## Common Errors & Fixes

### 535 Authentication Failed
**Error**: `535 Authentication failed`
**Cause**: Wrong SendGrid API key or username
**Fix**: 
- Ensure username is exactly `apikey`
- Verify API key starts with `SG.`
- Check API key has "Mail Send" permissions

### 550 Unauthenticated Sender
**Error**: `550 Unauthenticated sender`
**Cause**: Sender email not verified in SendGrid
**Fix**:
- Verify sender email in SendGrid → Sender Authentication
- Wait for verification to complete
- Use domain authentication for production

### 429 Rate Limit Exceeded
**Error**: `429 Too many requests`
**Cause**: Too many email requests
**Fix**:
- Wait 30+ seconds between tests
- Increase "Minimum interval between emails" in Supabase
- Check SendGrid rate limits

### Invalid Redirect URL
**Error**: `Invalid redirect URL`
**Cause**: Redirect URLs not configured in Supabase
**Fix**:
- Add redirect URLs to Supabase → Authentication → URL Configuration
- Include both production and development URLs
- Ensure URLs match exactly (including protocol)

### User Not Found
**Error**: `User not found`
**Cause**: Email address not registered
**Fix**:
- Register the email address first
- Check if user exists in Supabase → Authentication → Users

### Email Not Received
**Symptoms**: No error but email not in inbox
**Causes & Fixes**:
1. **Spam Folder**: Check spam/junk folder
2. **Email Templates**: Verify templates in Supabase → Authentication → Email Templates
3. **SendGrid Activity**: Check SendGrid → Activity for delivery status
4. **Rate Limits**: Wait longer between requests

## Testing Checklist

### Before Testing
- [ ] SendGrid sender verified
- [ ] Supabase SMTP configured
- [ ] Redirect URLs added to Supabase
- [ ] Environment variables set
- [ ] Rate limits configured

### Test Sequence
1. **Config Check**: Visit `/dev/email` and click "Check Config"
2. **SMTP Test**: Test direct SendGrid connection
3. **Magic Link Test**: Test Supabase magic link
4. **Password Reset Test**: Test Supabase password reset
5. **Check Email**: Look in inbox and spam folder

### Expected Results
- **SMTP Test**: Should show "PASS" with message ID
- **Magic Link Test**: Should show "PASS" with user data
- **Password Reset Test**: Should show "PASS" with user data
- **Emails**: Should arrive within 1-2 minutes

## Production Deployment

### Vercel Environment Variables
Set these in your Vercel project settings:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_SITE_URL=https://your-domain.com
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SMTP_FROM=EverWell <no-reply@everwellhealth.us>
```

### Domain Authentication
For production, use SendGrid domain authentication:
1. Verify your domain in SendGrid
2. Update `SMTP_FROM` to use your domain
3. Update Supabase sender email to match

### Monitoring
- Monitor SendGrid → Activity for delivery rates
- Check Supabase → Authentication → Users for sign-ups
- Set up alerts for authentication failures

## Debug Mode

Enable debug logging by adding to your Supabase client:

```typescript
const supabase = createSupabaseClient(url, anon, {
  auth: {
    debug: true
  }
});
```

## Supabase Email Debugging

### Exact Supabase SMTP Settings

Configure these **exact** values in Supabase → Authentication → Emails → SMTP Settings:

```
Host: smtp.sendgrid.net
Port: 587 (try 465 if 587 is blocked)
Username: apikey
Password: <Your SendGrid API key that starts with "SG.">
Sender email: <Must be a VERIFIED SendGrid sender or domain>
Reply-to: <Your support inbox>
```

**Critical Notes:**
- **Username must be exactly `apikey`** (not your SendGrid username)
- **Password must be your SendGrid API key** (starts with `SG.`)
- **Sender email must be verified** in SendGrid → Sender Authentication
- **Copy the exact values** from your SendGrid API key and verified sender

### Where to See Errors

1. **Supabase Logs**: 
   - Go to Supabase → Logs
   - Filter: `service=auth`, `level=error`
   - Look for SMTP-related error messages

2. **SendGrid Activity**:
   - Go to SendGrid → Activity
   - Check for bounces, blocks, or spam reports
   - Clear suppressions if needed

3. **Rate Limits**:
   - Raise/lower "Minimum interval between emails" in Supabase → Auth → Emails
   - Default is often 60s - lower to 10-30s for testing
   - Check SendGrid rate limits in your account

### Testing Configuration

- **Keep Confirm Email OFF** for local testing if needed
- **Use verified sender email** in both SendGrid and Supabase
- **Test with `/dev/email`** diagnostic tools for detailed error information
- **Check spam folder** for test emails

## Email Templates Setup

### Where to Find Templates
**Supabase Dashboard → Authentication → Email Templates**

Available templates:
- **Confirm Signup** - Email confirmation for new accounts
- **Magic Link** - Passwordless sign-in
- **Reset Password** - Password recovery
- **Change Email** - Email address updates

### How to Insert Dynamic Variables
- **`{{ .ConfirmationURL }}`** - The authentication link (use in both button and fallback text)
- **`{{ .Email }}`** - User's email address
- **`{{ .TokenHash }}`** - Security token (rarely needed)

### Template Setup Steps
1. Go to Supabase Dashboard → Authentication → Email Templates
2. Select the template you want to customize
3. Click "Edit" to modify the template
4. Replace the default content with the HTML from `EMAIL_TEMPLATES.md`
5. Save changes

### Deliverability Steps
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

## Support

If issues persist:
1. Check SendGrid → Activity for detailed error logs
2. Review Supabase → Authentication → Users for user status
3. Test with `/dev/email` diagnostic tools
4. Check browser console for client-side errors
5. Review server logs for API errors
6. Check Supabase → Logs (service=auth, level=error) for SMTP errors
