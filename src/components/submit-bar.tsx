import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Plus } from 'lucide-react';

interface SubmitBarProps {
  children?: ReactNode;
  className?: string;
  hasChanges?: boolean;
  savedState?: boolean;
  onSave?: () => void;
  isInputFocused?: boolean;
}

export function SubmitBar({ 
  children, 
  className, 
  hasChanges = false, 
  savedState = false, 
  onSave, 
  isInputFocused = false 
}: SubmitBarProps) {
  return (
    <>
      {/* Regular submit bar */}
      <div className={`flex items-center justify-end space-x-2 pt-4 ${className}`}>
        {children || (onSave && (
          <Button 
            onClick={onSave}
            disabled={!hasChanges}
            className={savedState ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {savedState ? (
              <>
                <span className="mr-2">✓</span>
                Saved
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Save Today's Metrics
              </>
            )}
          </Button>
        ))}
      </div>

      {/* Sticky mobile save bar */}
      {isInputFocused && hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-50 md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">Unsaved changes</span>
            </div>
            <Button 
              onClick={onSave}
              size="sm"
              className="bg-primary text-primary-foreground"
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
