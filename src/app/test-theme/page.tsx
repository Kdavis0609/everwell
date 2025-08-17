'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TestThemePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [computedColors, setComputedColors] = useState({
    background: '',
    color: '',
    htmlClasses: ''
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      const updateColors = () => {
        const body = document.body;
        const html = document.documentElement;
        setComputedColors({
          background: getComputedStyle(body).backgroundColor,
          color: getComputedStyle(body).color,
          htmlClasses: html.className
        });
      };

      updateColors();
      // Update colors when theme changes
      const observer = new MutationObserver(updateColors);
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
          <h1 className="text-3xl font-bold">Theme Test Page</h1>
          <ThemeToggle />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current Theme Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Theme State</h3>
                <p><strong>Active Theme:</strong> {theme}</p>
                <p><strong>HTML Classes:</strong> {computedColors.htmlClasses}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Computed Colors</h3>
                <p><strong>Background:</strong> {computedColors.background}</p>
                <p><strong>Text Color:</strong> {computedColors.color}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Primary Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-12 bg-primary rounded flex items-center justify-center">
                <span className="text-primary-foreground font-medium">Primary</span>
              </div>
              <div className="h-12 bg-secondary rounded flex items-center justify-center">
                <span className="text-secondary-foreground font-medium">Secondary</span>
              </div>
              <div className="h-12 bg-accent rounded flex items-center justify-center">
                <span className="text-accent-foreground font-medium">Accent</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Background Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-12 bg-background border border-border rounded flex items-center justify-center">
                <span className="text-foreground font-medium">Background</span>
              </div>
              <div className="h-12 bg-card border border-border rounded flex items-center justify-center">
                <span className="text-card-foreground font-medium">Card</span>
              </div>
              <div className="h-12 bg-muted rounded flex items-center justify-center">
                <span className="text-muted-foreground font-medium">Muted</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interactive Elements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button>Primary Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="secondary">Secondary Button</Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Theme Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button onClick={() => setTheme('light')} variant={theme === 'light' ? 'default' : 'outline'}>
                Light
              </Button>
              <Button onClick={() => setTheme('dark')} variant={theme === 'dark' ? 'default' : 'outline'}>
                Dark
              </Button>
              <Button onClick={() => setTheme('system')} variant={theme === 'system' ? 'default' : 'outline'}>
                System
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
