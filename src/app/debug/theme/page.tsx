'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { ThemeToggle } from '@/components/theme-toggle';

export default function DebugThemePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    htmlClasses: '',
    bodyBackground: '',
    bodyColor: '',
    cssVariables: {} as Record<string, string>
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      const updateDebugInfo = () => {
        const html = document.documentElement;
        const body = document.body;
        const computedStyle = getComputedStyle(html);
        
        // Get CSS variables
        const cssVars: Record<string, string> = {};
        const varNames = [
          '--background', '--foreground', '--card', '--card-foreground',
          '--primary', '--primary-foreground', '--secondary', '--secondary-foreground',
          '--muted', '--muted-foreground', '--accent', '--accent-foreground',
          '--border', '--input', '--ring'
        ];
        
        varNames.forEach(varName => {
          cssVars[varName] = computedStyle.getPropertyValue(varName).trim();
        });

        setDebugInfo({
          htmlClasses: html.className,
          bodyBackground: getComputedStyle(body).backgroundColor,
          bodyColor: getComputedStyle(body).color,
          cssVariables: cssVars
        });
      };

      updateDebugInfo();
      
      // Update when theme changes
      const observer = new MutationObserver(updateDebugInfo);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      
      return () => observer.disconnect();
    }
  }, [mounted, theme]);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Theme Debug Page</h1>
          <ThemeToggle />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Theme State */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Theme State</h2>
            <div className="space-y-2">
              <p><strong>Active Theme:</strong> {theme}</p>
              <p><strong>HTML Classes:</strong> <code className="bg-muted px-2 py-1 rounded">{debugInfo.htmlClasses}</code></p>
              <p><strong>Body Background:</strong> <code className="bg-muted px-2 py-1 rounded">{debugInfo.bodyBackground}</code></p>
              <p><strong>Body Color:</strong> <code className="bg-muted px-2 py-1 rounded">{debugInfo.bodyColor}</code></p>
            </div>
          </div>

          {/* CSS Variables */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">CSS Variables</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {Object.entries(debugInfo.cssVariables).map(([varName, value]) => (
                <div key={varName} className="flex justify-between items-center">
                  <code className="text-sm">{varName}:</code>
                  <code className="text-sm bg-muted px-2 py-1 rounded">{value}</code>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visual Test */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Visual Test</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-20 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-medium">Primary</span>
            </div>
            <div className="h-20 bg-secondary rounded flex items-center justify-center">
              <span className="text-secondary-foreground font-medium">Secondary</span>
            </div>
            <div className="h-20 bg-accent rounded flex items-center justify-center">
              <span className="text-accent-foreground font-medium">Accent</span>
            </div>
          </div>
        </div>

        {/* Theme Controls */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Theme Controls</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setTheme('light')} 
              className={`px-4 py-2 rounded ${theme === 'light' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
            >
              Light
            </button>
            <button 
              onClick={() => setTheme('dark')} 
              className={`px-4 py-2 rounded ${theme === 'dark' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
            >
              Dark
            </button>
            <button 
              onClick={() => setTheme('system')} 
              className={`px-4 py-2 rounded ${theme === 'system' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
            >
              System
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
