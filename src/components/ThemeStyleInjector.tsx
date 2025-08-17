'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { lightPalette, darkPalette, applyPalette } from '@/theme/palette';

// WHY: Runtime theme palette injector that overrides CSS variables without modifying globals.css
// This component applies improved colors and contrast at runtime based on the active theme
export function ThemeStyleInjector() {
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    // Determine which palette to apply
    let activePalette = lightPalette;
    
    if (resolvedTheme === 'dark') {
      activePalette = darkPalette;
    } else if (resolvedTheme === 'light') {
      activePalette = lightPalette;
    } else {
      // For system theme, check OS preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      activePalette = prefersDark ? darkPalette : lightPalette;
    }

    // Apply the palette
    applyPalette(activePalette);

    // Log theme info in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🎨 ThemeStyleInjector:', {
        theme,
        resolvedTheme,
        palette: activePalette === lightPalette ? 'light' : 'dark',
        variablesApplied: Object.keys(activePalette).length
      });
    }
  }, [theme, resolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (resolvedTheme === 'system') {
        const prefersDark = mediaQuery.matches;
        const activePalette = prefersDark ? darkPalette : lightPalette;
        applyPalette(activePalette);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🎨 System theme changed:', prefersDark ? 'dark' : 'light');
        }
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [resolvedTheme]);

  // This component doesn't render anything visible
  return null;
}
