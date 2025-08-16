import { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, children, className }: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
    </div>
  );
}
