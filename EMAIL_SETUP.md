# Daily Email Reminders Setup

This document covers the setup and usage of EverWell's daily email reminder system using Resend.

## Overview

The daily email reminder system provides:
- **Personalized daily emails** with AI insights and health goals
- **User-controlled preferences** to enable/disable reminders
- **Production-ready cron integration** for automated sending
- **Development testing** with individual user emails
- **Beautiful email templates** with responsive design

## Environment Variables

Add these to your `.env.local` file:

```bash
# Resend API Key (get from https://resend.com)
RESEND_API_KEY=re_xxxxxxxxxxxx

# Cron Secret for production automation
CRON_SECRET=your-secure-random-string

# Site URL for email links
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Features

### Daily Email Content

Each email includes:
- **Personalized greeting** with user's name
- **Today's AI insights** (if available)
- **Weekly progress** toward goals
- **Today's metrics** to track
- **Call-to-action** to log metrics
- **Unsubscribe link** to manage preferences

### Email Template

The email template features:
- **Responsive design** that works on all devices
- **Branded styling** with EverWell colors
- **Accessible HTML** with proper semantic markup
- **Plain text fallback** for email clients that don't support HTML
- **Professional layout** with clear sections and visual hierarchy

## API Endpoints

### `/api/email/daily`

**Method**: POST  
**Authentication**: CRON_SECRET header or userId in body  
**Purpose**: Send daily reminder emails

**Development Mode** (with userId in body):
```json
{
  "userId": "user-uuid-here"
}
```

**Production Mode** (with CRON_SECRET header):
```bash
curl -X POST https://your-domain.com/api/email/daily \
  -H "CRON_SECRET: your-secret-here"
```

**Response**:
```json
{
  "success": true
}
```

## User Interface

### Settings Page (`/settings`)

The settings page includes:
- **Email reminder toggle** to enable/disable daily emails
- **Email preview** showing how the email will look
- **Test email button** to send a test email immediately
- **Account information** and quick links

### Email Preview Component

Features:
- **Real-time preview** of email content
- **Toggle switch** for enabling/disabling reminders
- **Test email functionality** for immediate testing
- **Mock data display** showing sample content

## Vercel Cron Setup

### 1. Create Cron Job

In your Vercel dashboard, go to **Functions** → **Cron Jobs** and create a new job:

**Path**: `/api/email/daily`  
**Schedule**: `0 8 * * *` (daily at 8:00 AM)  
**Headers**:
```
CRON_SECRET: your-secure-random-string
```

### 2. Environment Variables

Ensure these are set in your Vercel project:
- `RESEND_API_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_SITE_URL`

### 3. Verify Setup

The cron job will:
- Run daily at 8:00 AM in your deployment timezone
- Send emails to all users with reminders enabled
- Log success/failure for monitoring

## Testing

### Development Testing

1. **Individual User Testing**:
   ```bash
   curl -X POST http://localhost:3000/api/email/daily \
     -H "Content-Type: application/json" \
     -d '{"userId": "your-user-id"}'
   ```

2. **UI Testing**:
   - Navigate to `/settings`
   - Enable daily reminders
   - Click "Send Test Email"
   - Check your email inbox

3. **Email Preview Testing**:
   - Navigate to `/test-email`
   - Use the mock Resend client
   - Test success and failure scenarios

### Production Testing

1. **Cron Job Testing**:
   ```bash
   curl -X POST https://your-domain.com/api/email/daily \
     -H "CRON_SECRET: your-secret-here"
   ```

2. **User Preference Testing**:
   - Enable/disable reminders in settings
   - Verify emails are sent only to enabled users

## Database Integration

### User Preferences

The system uses the existing `user_preferences` table:
- `reminders.daily_email`: Boolean flag for email preferences
- RLS policies ensure users can only manage their own preferences

### Data Sources

Emails include data from:
- `profiles`: User information and email
- `ai_insights`: Daily AI-generated insights
- `derived_features`: Weekly progress calculations
- `user_metric_settings`: Enabled metrics list

## Security

### Authentication

- **Development**: Requires valid userId in request body
- **Production**: Requires CRON_SECRET header
- **RLS**: All database queries respect Row Level Security

### Data Protection

- **No secrets logged**: API keys and secrets are never logged
- **User isolation**: Users can only access their own data
- **Email validation**: Recipients are validated against user profiles

## Error Handling

### Graceful Degradation

- **Missing insights**: Email sent without AI insights section
- **No progress data**: Weekly progress section omitted
- **User not found**: Error logged, email skipped
- **Resend failures**: Detailed error logging for debugging

### Monitoring

- **Success logs**: Email delivery confirmations
- **Error logs**: Detailed failure information
- **User feedback**: Toast notifications for UI actions

## Customization

### Email Template

The email template can be customized in `/api/email/daily/route.ts`:
- **Styling**: Modify CSS in the HTML template
- **Content**: Adjust sections and layout
- **Branding**: Update colors, logos, and messaging

### Scheduling

To change the email schedule:
1. Update the Vercel cron schedule
2. Modify the timezone in the email template
3. Update user-facing messaging

### Content Personalization

The system supports:
- **User names**: Personalized greetings
- **Time zones**: Localized timing
- **Metric preferences**: Customized content based on enabled metrics
- **Progress data**: Dynamic weekly progress display

## Troubleshooting

### Common Issues

1. **Emails not sending**:
   - Check RESEND_API_KEY is valid
   - Verify CRON_SECRET matches
   - Check user preferences are enabled

2. **Cron job failing**:
   - Verify Vercel cron job is active
   - Check environment variables are set
   - Review function logs in Vercel dashboard

3. **Template rendering issues**:
   - Test with different email clients
   - Verify HTML is valid
   - Check responsive design on mobile

### Debugging

1. **Enable detailed logging**:
   - Check browser console for client-side errors
   - Review server logs for API errors
   - Monitor Resend dashboard for delivery status

2. **Test individual components**:
   - Use `/test-email` for isolated testing
   - Test database queries separately
   - Verify user preferences are saved correctly

## Future Enhancements

Potential improvements:
- **Email templates**: Multiple template options
- **Scheduling flexibility**: User-defined send times
- **Content customization**: User preferences for email content
- **Analytics**: Email open and click tracking
- **A/B testing**: Different email variations
- **Internationalization**: Multi-language support

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Vercel function logs
3. Test with the provided test components
4. Verify environment variable configuration
