# EverWell Deployment Guide

## Prerequisites

- Vercel account
- Supabase project with database setup
- Environment variables configured

## Environment Variables

### Required for Production

Set these environment variables in your Vercel project settings:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=https://your-vercel-app.vercel.app
```

### Local Development

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Database Setup

1. Run the SQL migration in your Supabase SQL Editor:
   ```sql
   -- Copy and paste the contents of supabase/migrations/everwell_init.sql
   ```

2. Verify the tables are created:
   - `profiles` table with RLS policies
   - `metrics` table with RLS policies
   - Proper indexes and triggers

## Deployment Steps

### 1. Connect to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### 2. Configure Environment Variables

In Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add the required variables listed above

### 3. Deploy

```bash
# Deploy to production
vercel --prod
```

## Post-Deployment Verification

1. **Authentication**: Test magic link login
2. **Database**: Verify metrics can be saved
3. **Redirects**: Check auth callback works
4. **Performance**: Monitor function execution times

## Troubleshooting

### Common Issues

1. **Auth callback errors**: Check `NEXT_PUBLIC_SITE_URL` is correct
2. **Database connection**: Verify Supabase URL and keys
3. **RLS policies**: Ensure database policies are active
4. **Build errors**: Check TypeScript compilation

### Debug Commands

```bash
# Check build locally
npm run build

# Run tests
npm test

# Type check
npx tsc --noEmit
```

## Security Notes

- Never commit `.env.local` to version control
- Use environment variables for all secrets
- Enable RLS on all database tables
- Regularly rotate Supabase keys
