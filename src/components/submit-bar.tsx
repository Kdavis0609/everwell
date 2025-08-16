import { ReactNode } from 'react';

interface SubmitBarProps {
  children: ReactNode;
  className?: string;
}

export function SubmitBar({ children, className }: SubmitBarProps) {
  return (
    <div className={`flex items-center justify-end space-x-2 pt-4 ${className}`}>
      {children}
    </div>
  );
}
