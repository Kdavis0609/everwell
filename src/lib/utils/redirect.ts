/**
 * Safely parse and validate redirectTo URLs
 * Only allows same-origin paths, defaults to /dashboard
 */
export function parseRedirectTo(redirectTo: string | null): string {
  if (!redirectTo) {
    return '/dashboard';
  }

  // Only allow relative paths starting with /
  if (!redirectTo.startsWith('/')) {
    return '/dashboard';
  }

  // Prevent redirect to auth pages to avoid loops
  if (redirectTo.startsWith('/login') || redirectTo.startsWith('/signup') || redirectTo.startsWith('/auth/')) {
    return '/dashboard';
  }

  return redirectTo;
}
