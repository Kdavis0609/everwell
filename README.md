# EverWell - Health Metrics Tracker

A modern health metrics tracking application built with Next.js, Supabase, and Tailwind CSS.

## Features

- 🔐 **Secure Authentication** - Magic link login with Supabase Auth
- 📊 **Health Metrics Tracking** - Log weight, waist measurements, and notes
- 📱 **Responsive Design** - Works on desktop and mobile
- 🔒 **Row Level Security** - Users can only access their own data
- ⚡ **Real-time Updates** - Optimistic UI with toast notifications
- 🚀 **Vercel Ready** - Optimized for deployment

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Deployment**: Vercel
- **Testing**: Playwright

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd everwell
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy .env.local.example to .env.local
   cp .env.local.example .env.local
   
   # Add your Supabase credentials
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Set up the database**
   - Go to your Supabase project SQL Editor
   - Run the migration: `supabase/migrations/everwell_init.sql`

5. **Start the development server**
   ```bash
   npm run dev:strict
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Running locally (port 3000)

To ensure the development server runs on port 3000 and kills any existing processes:

```bash
npm run dev:strict
```

This command will:
- Kill any existing process on port 3000
- Start the Next.js development server with Turbopack
- Make the app available at http://localhost:3000

For regular development (without killing existing processes):
```bash
npm run dev
```

## Dev Reset

To kill any processes on ports 3000/3001 and start a fresh dev server:

**PowerShell:**
```bash
npm run dev:reset:ps
```

**Git Bash:**
```bash
npm run dev:reset:bash
```

## Database Migrations

Push database migrations to your Supabase project:

**PowerShell:**
```bash
npm run db:push:ps
```

**Git Bash:**
```bash
npm run db:push:bash
```

**First time setup:**
```bash
# Login to Supabase (paste your Access Token from Dashboard → Settings → Access Tokens)
npx supabase login

# Link to your project (if not already linked)
npx supabase link --project-ref <your-project-ref>
```

## Project Structure

```
everwell/
├── src/
│   ├── app/
│   │   ├── auth/callback/    # Auth callback handler
│   │   ├── dashboard/        # Main dashboard
│   │   ├── login/           # Login page
│   │   ├── metrics/         # Metrics tracking
│   │   └── layout.tsx       # Root layout
│   └── lib/
│       └── supabaseClient.ts # Supabase configuration
├── supabase/
│   └── migrations/          # Database migrations
├── tests/                   # Playwright tests
└── public/                  # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run Playwright tests
- `npm run test:ui` - Run tests with UI

## Database Schema

### Profiles Table
- `id` (UUID, Primary Key) - References auth.users
- `email` (TEXT, Unique) - User email
- `full_name` (TEXT) - User's full name
- `avatar_url` (TEXT) - Profile picture URL
- `created_at` (TIMESTAMP) - Record creation time
- `updated_at` (TIMESTAMP) - Last update time

### Metrics Table
- `id` (UUID, Primary Key) - Unique identifier
- `user_id` (UUID) - References auth.users
- `date` (DATE) - Metrics date
- `weight_lbs` (DECIMAL) - Weight in pounds
- `waist_inches` (DECIMAL) - Waist measurement
- `notes` (TEXT) - Additional notes
- `created_at` (TIMESTAMP) - Record creation time
- `updated_at` (TIMESTAMP) - Last update time

## Security Features

- **Row Level Security (RLS)** enabled on all tables
- **User-specific policies** ensure data isolation
- **Environment variables** for all secrets
- **Input validation** on all forms
- **Error handling** with user-friendly messages

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE.md](./LICENSE.md) file for details.