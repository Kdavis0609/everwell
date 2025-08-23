'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, offset, shift, flip, autoUpdate, Placement } from '@floating-ui/react';
import { formatValue, formatTooltipDate, formatDelta } from '@/lib/utils/format';

export interface ChartTooltipProps {
  /** Title of the metric being displayed */
  title?: string;
  /** Date of the hovered point */
  date?: Date | string;
  /** Value of the hovered point */
  value?: number | string;
  /** Unit of measurement */
  unit?: string;
  /** Optional target/goal value */
  target?: number | null | undefined;
  /** Optional delta/change value */
  delta?: number | null;
  /** Preferred alignment direction */
  align?: 'top' | 'bottom' | 'left' | 'right';
  /** Color of the data series (for the dot indicator) */
  color?: string;
  /** Whether the tooltip is currently visible */
  isVisible: boolean;
  /** Reference element for positioning */
  referenceElement: HTMLElement | null;
  /** Callback when tooltip should be hidden */
  onHide: () => void;
}

/**
 * Professional chart tooltip component with floating positioning
 * 
 * Features:
 * - Smart positioning with collision detection
 * - Accessible with proper ARIA attributes
 * - Supports light/dark themes automatically
 * - Responsive and mobile-friendly
 * - Professional styling with backdrop blur
 */
export function ChartTooltip({
  title,
  date,
  value,
  unit,
  target,
  delta,
  align = 'top',
  color = 'hsl(var(--primary))',
  isVisible,
  referenceElement,
  onHide
}: ChartTooltipProps) {
  const [mounted, setMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Handle portal mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Set up floating positioning
  const { refs, floatingStyles } = useFloating({
    elements: {
      reference: referenceElement
    },
    placement: align as Placement,
    middleware: [
      offset(8), // 8px gap between tooltip and reference
      shift({ padding: 8 }), // Shift to keep within viewport
      flip() // Flip to opposite side if no space
    ],
    whileElementsMounted: autoUpdate,
    // Add defensive positioning to prevent tooltips from appearing in wrong locations
    strategy: 'absolute'
  });

  // Handle escape key and cleanup
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onHide();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, onHide]);

  // Cleanup tooltip when component unmounts or reference element changes
  useEffect(() => {
    return () => {
      if (isVisible) {
        onHide();
      }
    };
  }, [isVisible, onHide, referenceElement]);

  // Don't render until mounted (for SSR)
  if (!mounted) return null;

  // Don't render if not visible
  if (!isVisible) return null;

  // Don't render if reference element is not properly positioned
  if (!referenceElement || !referenceElement.getBoundingClientRect) return null;

  // Don't render if reference element is not in viewport
  const rect = referenceElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0 || rect.top < 0 || rect.left < 0) return null;

  // Format the data
  const formattedValue = value !== undefined ? formatValue(value, unit) : null;
  const formattedDate = date ? formatTooltipDate(date) : null;
  const deltaInfo = delta !== null && value !== undefined && typeof value === 'number' 
    ? formatDelta(value, delta, unit) 
    : null;

  return createPortal(
    <div
      ref={(node) => {
        refs.setFloating(node);
        tooltipRef.current = node;
      }}
      style={floatingStyles}
      className={`
        pointer-events-none select-none rounded-xl border border-border 
        bg-popover/95 text-popover-foreground shadow-lg backdrop-blur 
        px-3 py-2 text-sm z-[9999]
        motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 
        motion-safe:duration-200
      `}
      role="tooltip"
      aria-hidden={!isVisible}
    >
      {/* Title row */}
      {title && (
        <div className="flex items-center gap-2 mb-1">
          <div 
            className="w-2 h-2 rounded-full flex-shrink-0" 
            style={{ backgroundColor: color }}
          />
          <span className="font-medium text-foreground">{title}</span>
        </div>
      )}

      {/* Date row */}
      {formattedDate && (
        <div className="text-muted-foreground text-xs mb-1">
          {formattedDate}
        </div>
      )}

      {/* Value row */}
      {formattedValue && (
        <div className="font-medium tabular-nums text-foreground">
          {formattedValue}
        </div>
      )}

      {/* Target and delta row */}
      {(target !== null || deltaInfo) && (
        <div className="flex items-center gap-2 mt-1 pt-1 border-t border-border/50">
          {target !== null && target !== undefined && (
            <span className="text-xs text-muted-foreground">
              Target: {formatValue(target, unit)}
            </span>
          )}
          
          {deltaInfo && (
            <span 
              className={`
                text-xs font-medium px-1.5 py-0.5 rounded
                ${deltaInfo.isPositive 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                  : deltaInfo.isNegative 
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-muted text-muted-foreground'
                }
              `}
            >
              {deltaInfo.value}
            </span>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}

/**
 * Hook for managing chart tooltip state
 */
export function useChartTooltip() {
  const [tooltipState, setTooltipState] = useState<{
    isVisible: boolean;
    data: Omit<ChartTooltipProps, 'isVisible' | 'referenceElement' | 'onHide'> | null;
    referenceElement: HTMLElement | null;
  }>({
    isVisible: false,
    data: null,
    referenceElement: null
  });

  const showTooltip = (data: Omit<ChartTooltipProps, 'isVisible' | 'referenceElement' | 'onHide'>, element: HTMLElement) => {
    setTooltipState({
      isVisible: true,
      data,
      referenceElement: element
    });
  };

  const hideTooltip = () => {
    setTooltipState(prev => ({
      ...prev,
      isVisible: false
    }));
  };

  const updateTooltip = (data: Partial<Omit<ChartTooltipProps, 'isVisible' | 'referenceElement' | 'onHide'>>) => {
    setTooltipState(prev => ({
      ...prev,
      data: prev.data ? { ...prev.data, ...data } : null
    }));
  };

  return {
    tooltipState,
    showTooltip,
    hideTooltip,
    updateTooltip
  };
}
