/**
 * Get the base URL for the application
 * Returns window.location.origin in the browser and process.env.NEXT_PUBLIC_SITE_URL on the server
 */
export function getBaseUrl(): string {
  // Check if we're in the browser
  if (typeof window !== 'undefined') {
    const baseUrl = window.location.origin;
    
    // Runtime check: warn if emailRedirectTo host doesn't match window.location.host
    const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (envSiteUrl) {
      try {
        const envUrl = new URL(envSiteUrl);
        const currentUrl = new URL(baseUrl);
        
        if (envUrl.host !== currentUrl.host) {
          console.warn(
            `[Auth] Email redirect host mismatch: ` +
            `NEXT_PUBLIC_SITE_URL host (${envUrl.host}) ` +
            `does not match current host (${currentUrl.host}). ` +
            `Using current host for email redirects.`
          );
        }
      } catch (error) {
        console.warn('[Auth] Invalid NEXT_PUBLIC_SITE_URL format:', envSiteUrl);
      }
    }
    
    return baseUrl;
  }
  
  // Server-side: use environment variable with fallback
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.everwellhealth.us';
}

/**
 * Get the auth callback URL
 */
export function getAuthCallbackUrl(type?: 'recovery' | 'signup'): string {
  const baseUrl = getBaseUrl();
  const callbackUrl = `${baseUrl}/auth/callback`;
  
  if (type === 'recovery') {
    return `${callbackUrl}?type=recovery`;
  }
  
  return callbackUrl;
}
