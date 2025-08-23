# Chart Components

This directory contains reusable chart components for the EverWell application, featuring professional tooltips and responsive design.

## Components

### ChartTooltip

A professional, accessible tooltip component for charts with smart positioning and theme support.

#### Features

- **Smart Positioning**: Uses @floating-ui/react for collision detection and viewport-aware placement
- **Accessible**: Proper ARIA attributes, keyboard support (ESC to close), and screen reader friendly
- **Theme Support**: Automatically adapts to light/dark themes using CSS tokens
- **Mobile Friendly**: Touch-friendly with proper event handling
- **Performance**: Only renders when visible, uses portals to avoid clipping

#### Usage

```tsx
import { ChartTooltip, useChartTooltip } from '@/components/charts/ChartTooltip';

function MyChart() {
  const { tooltipState, showTooltip, hideTooltip } = useChartTooltip();

  const handlePointHover = (event: React.MouseEvent, data: any) => {
    const element = event.currentTarget as HTMLElement;
    showTooltip({
      title: 'Weight',
      date: data.date,
      value: data.value,
      unit: 'lbs',
      target: 180,
      color: 'hsl(var(--primary))'
    }, element);
  };

  return (
    <div>
      {/* Your chart content */}
      <div 
        onMouseEnter={(e) => handlePointHover(e, { date: '2024-01-15', value: 175.5 })}
        onMouseLeave={hideTooltip}
        onFocus={(e) => handlePointHover(e, { date: '2024-01-15', value: 175.5 })}
        onBlur={hideTooltip}
      >
        {/* Chart point */}
      </div>

      <ChartTooltip
        {...tooltipState.data}
        isVisible={tooltipState.isVisible}
        referenceElement={tooltipState.referenceElement}
        onHide={hideTooltip}
      />
    </div>
  );
}
```

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Title of the metric being displayed |
| `date` | `Date \| string` | Date of the hovered point |
| `value` | `number \| string` | Value of the hovered point |
| `unit` | `string` | Unit of measurement |
| `target` | `number \| null` | Optional target/goal value |
| `delta` | `number \| null` | Optional delta/change value |
| `align` | `'top' \| 'bottom' \| 'left' \| 'right'` | Preferred alignment direction |
| `color` | `string` | Color of the data series (for the dot indicator) |
| `isVisible` | `boolean` | Whether the tooltip is currently visible |
| `referenceElement` | `HTMLElement \| null` | Reference element for positioning |
| `onHide` | `() => void` | Callback when tooltip should be hidden |

### Sparkline

A lightweight sparkline chart component for displaying trends.

### TrendChart

A full-featured trend chart with multiple metrics and time ranges.

## Formatting Utilities

The chart components use formatting utilities from `@/lib/utils/format.ts`:

- `formatValue(value, unit)`: Formats values with appropriate decimal places based on unit type
- `formatTooltipDate(date)`: Formats dates as "Mon, Jan 15" for tooltips
- `formatDelta(current, target, unit)`: Calculates and formats deltas with proper signs

## Dependencies

- **@floating-ui/react**: For smart tooltip positioning and collision detection
- **recharts**: For chart rendering (LineChart, Line, etc.)

## Accessibility

All chart components follow accessibility best practices:

- Proper ARIA labels and descriptions
- Keyboard navigation support
- Screen reader compatibility
- High contrast support
- Reduced motion support

## Styling

Chart components use Tailwind CSS classes that map to shadcn/ui design tokens:

- `bg-popover/95`: Semi-transparent background with backdrop blur
- `border-border`: Consistent border colors
- `text-popover-foreground`: Proper text contrast
- `shadow-lg`: Professional shadow effects

No global styles are modified - all styling is contained within the components.
