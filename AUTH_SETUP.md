# EverWell Authentication Setup

## Overview

EverWell now supports both Magic Link and Email + Password authentication methods. Users can choose their preferred sign-in method, and the system handles session persistence and password recovery flows.

## Features

### Authentication Methods
- **Magic Link**: Passwordless authentication via email
- **Email & Password**: Traditional username/password authentication
- **Password Recovery**: Secure password reset flow
- **Session Persistence**: "Remember me" functionality
- **Email Confirmation**: Optional email verification for new accounts

### Security Features
- Password strength validation
- Secure password reset flow
- Session management with auto-refresh
- Authentication guards for protected routes

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Site URL for redirects (required for auth flows)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

For production, set `NEXT_PUBLIC_SITE_URL` to your production domain:
```bash
NEXT_PUBLIC_SITE_URL=https://www.everwellhealth.us
```

### Supabase Dashboard Configuration

#### 1. Email Confirmation Settings

In your Supabase project dashboard:

1. Go to **Authentication** → **Settings**
2. Under **Email Auth**, configure:
   - **Enable email confirmations**: Toggle ON/OFF based on your preference
   - **Secure email change**: Recommended to keep ON
   - **Double confirm changes**: Recommended to keep ON

#### 2. Email Templates

Customize email templates in **Authentication** → **Email Templates**:

- **Confirm signup**: Email sent when email confirmation is enabled
- **Magic Link**: Email sent for passwordless sign-in
- **Reset password**: Email sent for password recovery

#### 3. URL Configuration

In **Authentication** → **URL Configuration**:

- **Site URL**: Set to your production domain
- **Redirect URLs**: Add your auth callback URLs:
  - `https://your-domain.com/auth/callback`
  - `https://your-domain.com/auth/callback?type=recovery`

## User Flows

### Sign Up Flow

1. User visits `/signup`
2. Enters email, password, and confirms password
3. Password strength is validated in real-time
4. If email confirmation is OFF: User is redirected to `/dashboard`
5. If email confirmation is ON: User is redirected to `/signup/check-email`

### Sign In Flow

1. User visits `/login`
2. Chooses between Magic Link or Email & Password tabs
3. **Magic Link**: Enters email, receives sign-in link
4. **Email & Password**: Enters credentials, optionally checks "Remember me"
5. Successful authentication redirects to `/dashboard`

### Password Recovery Flow

1. User clicks "Forgot password?" on login page
2. Enters email address
3. Receives password reset email
4. Clicks link in email → redirected to `/auth/callback?type=recovery`
5. Enters new password and confirms
6. Password is updated and user is redirected to `/dashboard`

### Session Management

- **Remember Me**: When checked, session persists across browser sessions
- **Auto-refresh**: Tokens are automatically refreshed
- **Sign Out**: Clears session and redirects to `/login`

## Security Considerations

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Session Security
- Tokens are stored securely in browser storage
- Auto-refresh prevents session expiration
- Sign out clears all session data

### Rate Limiting
Supabase provides built-in rate limiting for:
- Sign-up attempts
- Sign-in attempts
- Password reset requests

## Testing

Run the authentication tests:

```bash
npm test tests/auth.spec.ts
```

Tests cover:
- Login page tab functionality
- Signup validation
- Password strength requirements
- Password recovery flow
- Authentication guards

## Troubleshooting

### Common Issues

1. **"Invalid redirect URL" error**
   - Check `NEXT_PUBLIC_SITE_URL` environment variable
   - Verify redirect URLs in Supabase dashboard

2. **Email not received**
   - Check spam folder
   - Verify email templates in Supabase dashboard
   - Check email provider settings

3. **Session not persisting**
   - Ensure `persistSession: true` in Supabase client config
   - Check browser storage settings

4. **Password reset not working**
   - Verify `type=recovery` parameter in callback URL
   - Check email template configuration

### Debug Mode

Enable debug logging by adding to your Supabase client:

```typescript
const supabase = createSupabaseClient(url, anon, {
  auth: {
    debug: true
  }
});
```

## API Reference

### Authentication Hooks

#### `useAuthGuard()`
Redirects authenticated users away from auth pages.

```typescript
const { loading } = useAuthGuard();
```

### Authentication Functions

#### `supabase.auth.signUp()`
Create a new user account.

#### `supabase.auth.signInWithPassword()`
Sign in with email and password.

#### `supabase.auth.signInWithOtp()`
Send magic link for passwordless sign-in.

#### `supabase.auth.resetPasswordForEmail()`
Send password reset email.

#### `supabase.auth.updateUser()`
Update user password (in recovery flow).

#### `supabase.auth.signOut()`
Sign out and clear session.

## Migration Notes

If upgrading from magic-link-only authentication:

1. No database changes required
2. Existing users can continue using magic links
3. New users can choose either authentication method
4. Password recovery is available for all users
