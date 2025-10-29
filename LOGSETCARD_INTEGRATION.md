# LogSetCard Slide-Up Panel Integration Guide

This guide explains how to use the `LogSetCard` component within a slide-up bottom sheet panel during rest periods.

## 📦 Components Created

### 1. `SlideUpPanel` ([src/components/SlideUpPanel.tsx](src/components/SlideUpPanel.tsx))

A reusable bottom sheet panel component with smooth animations.

**Features:**
- Smooth slide-up animation using `framer-motion`
- Semi-transparent backdrop with click-to-dismiss
- Swipe-down gesture support for dismissal
- Optional delay before appearing
- Configurable z-index

**Props:**
```tsx
interface SlideUpPanelProps {
  isOpen: boolean;          // Controls visibility
  onClose: () => void;      // Called when panel should close
  children: React.ReactNode; // Panel content
  delay?: number;           // Delay in ms before showing (default: 0)
  zIndex?: number;          // Z-index for panel (default: 50)
}
```

**Usage:**
```tsx
import { SlideUpPanel } from '@/components/SlideUpPanel';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SlideUpPanel isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <div className="p-6">Your content here</div>
    </SlideUpPanel>
  );
}
```

### 2. `LogSetCard` ([src/components/LogSetCard.tsx](src/components/LogSetCard.tsx))

A card for logging workout set data (reps, weight, effort, notes).

**Features:**
- Input fields for reps, weight, effort level (1-10), and notes
- Visual effort slider
- Live stats summary
- Save callback for parent notification

**Props:**
```tsx
interface LogSetCardProps {
  setNumber?: number;                    // Current set number
  exerciseName?: string;                 // Exercise name
  onSaved?: (data: SetData) => void;    // Called when user saves
  initialValues?: Partial<SetData>;      // Pre-populate values
}

interface SetData {
  reps: number;
  weight: number;
  effort: number;  // 1-10 scale
  notes?: string;
}
```

**Usage:**
```tsx
import { LogSetCard } from '@/components/LogSetCard';

function MyComponent() {
  const handleSaved = (data: SetData) => {
    console.log('Set saved:', data);
    // Save to database, close panel, etc.
  };

  return (
    <LogSetCard
      exerciseName="Barbell Squat"
      setNumber={1}
      onSaved={handleSaved}
    />
  );
}
```

### 3. `RestScreen` ([src/screens/RestScreen.tsx](src/screens/RestScreen.tsx))

A complete rest period screen that integrates both components.

**Features:**
- Countdown timer display
- Progress bar
- Auto-shows LogSetCard panel after 500ms delay
- Manual "Log Set" button
- Coaching tips

**Props:**
```tsx
interface RestScreenProps {
  exerciseName?: string;
  setNumber?: number;
  restSeconds?: number;
  onTimerEnd?: () => void;
  onSetSaved?: (data: SetData) => void;
}
```

## 🎯 Integration Pattern

Here's the recommended pattern for integrating these components:

```tsx
import React, { useState, useEffect } from 'react';
import { SlideUpPanel } from '@/components/SlideUpPanel';
import { LogSetCard, SetData } from '@/components/LogSetCard';

function MyRestScreen() {
  const [showLogPanel, setShowLogPanel] = useState(false);

  // Auto-show panel when entering rest period
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLogPanel(true);
    }, 500); // 500ms delay for polish

    return () => clearTimeout(timer);
  }, []);

  const handleSetSaved = (data: SetData) => {
    console.log('Set logged:', data);
    // TODO: Save to your database/state
    setShowLogPanel(false); // Close panel
  };

  return (
    <div>
      {/* Your rest screen UI */}
      <button onClick={() => setShowLogPanel(true)}>
        Log Set
      </button>

      {/* Slide-up panel */}
      <SlideUpPanel
        isOpen={showLogPanel}
        onClose={() => setShowLogPanel(false)}
      >
        <LogSetCard
          exerciseName="Barbell Squat"
          setNumber={1}
          onSaved={handleSetSaved}
        />
      </SlideUpPanel>
    </div>
  );
}
```

## 🚀 Demo

A fully working demo is available at [src/screens/RestScreenDemo.tsx](src/screens/RestScreenDemo.tsx).

**To run the demo:**
```bash
npm run dev
```

Then navigate to the RestScreenDemo screen in your app.

## ✨ UX Features

1. **Auto-appearance**: Panel automatically slides up 500ms after entering rest period
2. **Multiple dismiss methods**:
   - Click/tap outside the panel
   - Swipe down on the panel
   - Click "Save Set" button
3. **Smooth animations**: Spring-based physics for natural motion
4. **Responsive**: Works on mobile and desktop
5. **Accessible**: Proper ARIA labels and keyboard support

## 🎨 Customization

### Changing Animation Timing

Edit the spring configuration in [SlideUpPanel.tsx:71-75](src/components/SlideUpPanel.tsx#L71-L75):

```tsx
transition={{
  type: 'spring',
  damping: 30,      // Lower = more bouncy
  stiffness: 300,   // Higher = faster
}}
```

### Changing Delay

Pass the `delay` prop to `SlideUpPanel`:

```tsx
<SlideUpPanel
  isOpen={showLogPanel}
  onClose={() => setShowLogPanel(false)}
  delay={300}  // 300ms delay
>
  ...
</SlideUpPanel>
```

### Customizing LogSetCard Styling

The component uses Tailwind classes. Edit [src/components/LogSetCard.tsx](src/components/LogSetCard.tsx) to customize colors, spacing, etc.

### Adding Haptic Feedback (Mobile)

Add to the save handler:

```tsx
const handleSetSaved = (data: SetData) => {
  // Trigger haptic feedback on mobile
  if ('vibrate' in navigator) {
    navigator.vibrate(50);
  }

  onSaved?.(data);
  setShowLogPanel(false);
};
```

## 🔧 Advanced Usage

### Conditional Panel Appearance

Show the panel only under certain conditions:

```tsx
useEffect(() => {
  // Only show if user completed at least 5 reps
  if (lastSetReps >= 5) {
    const timer = setTimeout(() => {
      setShowLogPanel(true);
    }, 500);
    return () => clearTimeout(timer);
  }
}, [lastSetReps]);
```

### Pre-populating Data

Pass initial values to LogSetCard:

```tsx
<LogSetCard
  exerciseName="Barbell Squat"
  setNumber={2}
  initialValues={{
    reps: 10,
    weight: 225,
    effort: 8,
  }}
  onSaved={handleSetSaved}
/>
```

### Preventing Accidental Dismissal

Require confirmation before closing:

```tsx
const handleClose = () => {
  if (hasUnsavedData) {
    if (confirm('You have unsaved changes. Close anyway?')) {
      setShowLogPanel(false);
    }
  } else {
    setShowLogPanel(false);
  }
};

<SlideUpPanel
  isOpen={showLogPanel}
  onClose={handleClose}
>
  ...
</SlideUpPanel>
```

## 📱 Mobile Considerations

- Panel takes up to 85% of viewport height (`max-h-[85vh]`)
- Content is scrollable if it exceeds the height
- Touch gestures work on mobile devices
- Backdrop prevents accidental taps on background content

## 🐛 Troubleshooting

### Panel doesn't appear

1. Check that `isOpen` is true
2. Verify `framer-motion` is installed: `npm list framer-motion`
3. Check browser console for errors

### Animation is janky

1. Ensure you're not re-rendering the parent component frequently
2. Use `React.memo()` for expensive child components
3. Check if any heavy computations are blocking the main thread

### Panel appears immediately without delay

The `delay` prop only works when passed to `SlideUpPanel`. If you're using `useEffect` to set `isOpen`, that delay is separate from the panel's internal delay.

## 🎓 Best Practices

1. **Single responsibility**: Keep panel content focused on one task
2. **Clear exit paths**: Always provide multiple ways to dismiss
3. **Visual feedback**: Show loading states when saving data
4. **Error handling**: Display validation errors inline
5. **Accessibility**: Test with keyboard navigation and screen readers

## 📚 Related Components

- [BottomSheet.tsx](src/components/BottomSheet.tsx) - Alternative bottom sheet implementation
- [RestCoach.tsx](src/components/coach/RestCoach.tsx) - Rest period coaching component

## 🤝 Contributing

To modify these components:

1. Components are exported from [src/components/index.ts](src/components/index.ts)
2. Screens are exported from [src/screens.tsx](src/screens.tsx)
3. Follow existing TypeScript patterns and prop interfaces
4. Test on both mobile and desktop viewports

---

**Need help?** Check the demo implementation in [RestScreenDemo.tsx](src/screens/RestScreenDemo.tsx) for a complete working example.
