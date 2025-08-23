# Chart Tooltip QA Checklist

## Manual Testing Checklist

### Basic Functionality
- [ ] Hovering over sparkline points shows the new professional tooltip
- [ ] Hovering over trend chart points shows the new professional tooltip
- [ ] Tooltip displays correct date format (Mon, Jan 15)
- [ ] Tooltip displays correct value with appropriate decimal places
- [ ] Tooltip shows unit of measurement
- [ ] Tooltip shows metric title/name
- [ ] Tooltip shows target value when available
- [ ] Tooltip shows delta/change when available

### Positioning & Collision Detection
- [ ] Tooltip positions correctly above/below/left/right of data points
- [ ] Tooltip flips to opposite side when near viewport edges
- [ ] Tooltip stays within viewport bounds
- [ ] No tooltip clipping or overflow issues

### Accessibility
- [ ] Keyboard navigation works (Tab to focus data points)
- [ ] Focus on data point shows tooltip
- [ ] Blur/ESC key hides tooltip
- [ ] Screen reader announces tooltip content correctly
- [ ] ARIA attributes are properly set

### Theme Support
- [ ] Tooltip looks good in light theme
- [ ] Tooltip looks good in dark theme
- [ ] Colors match the design system tokens
- [ ] Proper contrast ratios maintained

### Mobile Support
- [ ] Touch/tap on data points shows tooltip
- [ ] Tap elsewhere closes tooltip
- [ ] No layout shift when tooltip appears
- [ ] Tooltip is readable on mobile screens

### Performance
- [ ] No console warnings about React keys
- [ ] No hydration errors
- [ ] Tooltip renders smoothly without lag
- [ ] No memory leaks (tooltip state cleans up properly)

### Formatting
- [ ] Weight values show 1 decimal place (175.5 lbs)
- [ ] Steps show whole numbers (8500 steps)
- [ ] Time shows 1 decimal place (7.5 h)
- [ ] Volume shows whole numbers (64 oz)
- [ ] Calories show whole numbers (2500 kcal)
- [ ] Small weights show 1 decimal place (25.3 g)

### Edge Cases
- [ ] Tooltip handles null/undefined values gracefully
- [ ] Tooltip works with empty data sets
- [ ] Tooltip works with single data points
- [ ] Tooltip works with very long metric names
- [ ] Tooltip works with very large numbers

## Build Verification
- [ ] `npm run build` completes successfully
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] All imports resolve correctly

## Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

## Responsive Testing
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

## Notes
- Tooltip uses @floating-ui/react for positioning
- All styling uses Tailwind classes that map to shadcn/ui tokens
- No global styles were modified
- Format utilities handle different unit types appropriately
