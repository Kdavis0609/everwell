-- Fix profiles table schema
-- This script ensures the profiles table has all required columns

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
    RAISE NOTICE 'Added email column to profiles table';
  END IF;

  -- Add full_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    RAISE NOTICE 'Added full_name column to profiles table';
  END IF;

  -- Add avatar_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    RAISE NOTICE 'Added avatar_url column to profiles table';
  END IF;

  -- Add handle column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'handle'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN handle TEXT;
    RAISE NOTICE 'Added handle column to profiles table';
  END IF;

  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added created_at column to profiles table';
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to profiles table';
  END IF;
END $$;

-- Create unique index on handle if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_unique ON public.profiles(handle) WHERE handle IS NOT NULL;

-- Update existing profiles with email from auth.users if email is NULL
UPDATE public.profiles 
SET email = auth.users.email
FROM auth.users 
WHERE profiles.email IS NULL 
  AND profiles.id = auth.users.id;

-- Set created_at for profiles that don't have it
UPDATE public.profiles 
SET created_at = COALESCE(created_at, NOW())
WHERE created_at IS NULL;

-- Set updated_at for profiles that don't have it
UPDATE public.profiles 
SET updated_at = COALESCE(updated_at, NOW())
WHERE updated_at IS NULL;

-- Show the current table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
