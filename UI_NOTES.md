# EverWell UI Design System

## Overview

EverWell now uses a modern, accessible design system built with:
- **shadcn/ui** - Component library
- **Tailwind CSS v4** - Styling
- **Lucide React** - Icons
- **Sonner** - Toast notifications
- **Inter font** - Typography

## Theme Colors

```css
--primary: #2563EB (blue-600)
--secondary: #10B981 (emerald-500)
--background: #FAFAFA (neutral-50)
--foreground: #1F2937 (neutral-800)
--muted: #F3F4F6 (neutral-100)
--muted-foreground: #6B7280 (neutral-500)
--border: #E5E7EB (neutral-200)
--destructive: #EF4444 (red-500)
```

## Components

### Layout Components

#### `<AppShell>`
Main layout wrapper with navigation and container.
```tsx
<AppShell>
  <YourPageContent />
</AppShell>
```

#### `<TopNav>`
Navigation bar with logo and user menu.
- Left: EverWell logo with heart icon
- Right: User avatar with dropdown menu

### Form Components

#### `<FormField>`
Wrapper for form inputs with consistent styling.
```tsx
<FormField label="Weight (lbs)">
  <Input type="number" placeholder="Enter weight" />
</FormField>
```

#### `<SubmitBar>`
Container for form submission buttons.
```tsx
<SubmitBar>
  <Button type="submit">Save</Button>
</SubmitBar>
```

### Display Components

#### `<StatTile>`
Individual metric display with date, values, and notes.
```tsx
<StatTile metric={metricData} />
```

#### `<EmptyState>`
Empty state with icon and message.
```tsx
<EmptyState 
  icon={Activity} 
  message="No metrics logged yet" 
/>
```

#### `<LoadingSpinner>`
Loading indicator with customizable size.
```tsx
<LoadingSpinner size={20} />
```

### UI Primitives

All shadcn/ui components are available:
- `Button` - Various styles and states
- `Input` - Form inputs
- `Textarea` - Multi-line text
- `Card` - Content containers
- `Label` - Form labels
- `Avatar` - User avatars
- `DropdownMenu` - Navigation menus

## Page Layouts

### Dashboard
- 12-column responsive grid
- Left (8 cols): Today's metrics form
- Right (4 cols): Recent entries list
- Loading states and empty states

### Login
- Centered card layout
- Brand area with logo
- Auth form integration
- Legal text footer

### Metrics
- Dedicated metrics page
- Form and recent entries side-by-side
- Same functionality as dashboard

## Accessibility Features

- **Focus management** - Proper focus rings and keyboard navigation
- **ARIA labels** - Screen reader support
- **Color contrast** - WCAG AA compliant
- **Motion preferences** - Respects `prefers-reduced-motion`
- **Semantic HTML** - Proper heading hierarchy

## Responsive Design

- **Mobile-first** approach
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Grid system**: 1 column on mobile, 12 columns on desktop
- **Touch-friendly** buttons and inputs

## Extending the Design System

### Adding New Components

1. Create component in `/src/components/`
2. Use existing shadcn/ui primitives
3. Follow naming conventions
4. Add TypeScript interfaces
5. Include accessibility features

### Customizing Theme

Edit CSS variables in `/src/app/globals.css`:
```css
:root {
  --primary: #your-color;
  --secondary: #your-color;
  /* ... */
}
```

### Adding Icons

Import from `lucide-react`:
```tsx
import { Heart, Activity, TrendingUp } from 'lucide-react';
```

## Best Practices

1. **Consistent spacing** - Use Tailwind spacing scale
2. **Component composition** - Build complex UIs from simple components
3. **Loading states** - Always show loading indicators
4. **Error handling** - Display user-friendly error messages
5. **Toast notifications** - Use Sonner for user feedback
6. **Form validation** - Client and server-side validation
7. **Performance** - Lazy load components when possible

## File Structure

```
src/
├── components/
│   ├── ui/           # shadcn/ui primitives
│   ├── app-shell.tsx
│   ├── top-nav.tsx
│   ├── form-field.tsx
│   ├── submit-bar.tsx
│   ├── stat-tile.tsx
│   ├── empty-state.tsx
│   └── loading-spinner.tsx
├── app/
│   ├── dashboard/
│   ├── login/
│   ├── metrics/
│   └── auth/callback/
└── lib/
    ├── utils.ts      # shadcn/ui utilities
    └── supabaseClient.ts
```
