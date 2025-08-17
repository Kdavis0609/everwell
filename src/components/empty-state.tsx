'use client';

import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: React.ReactNode;
  variant?: 'default' | 'illustration';
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  message, 
  action,
  variant = 'default' 
}: EmptyStateProps) {
  if (variant === 'illustration') {
    return (
      <Card className="border-dashed border-2 border-muted/50 bg-muted/20">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">{message}</p>
          {action && (
            <div className="flex justify-center">
              {action}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{message}</p>
      {action && (
        <div className="mt-3">
          {action}
        </div>
      )}
    </div>
  );
}
