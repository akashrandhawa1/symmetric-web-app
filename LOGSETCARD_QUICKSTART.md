# LogSetCard Quick Start Guide

Get the slide-up panel working in 3 minutes!

## 🚀 Quick Integration

### Step 1: Import the components

```tsx
import { SlideUpPanel } from '@/components/SlideUpPanel';
import { LogSetCard, SetData } from '@/components/LogSetCard';
```

### Step 2: Add state to your component

```tsx
const [showLogPanel, setShowLogPanel] = useState(false);
```

### Step 3: Add the panel to your JSX

```tsx
<SlideUpPanel
  isOpen={showLogPanel}
  onClose={() => setShowLogPanel(false)}
>
  <LogSetCard
    exerciseName="Barbell Squat"
    setNumber={1}
    onSaved={(data) => {
      console.log('Saved:', data);
      setShowLogPanel(false);
    }}
  />
</SlideUpPanel>
```

### Step 4: Trigger it

```tsx
<button onClick={() => setShowLogPanel(true)}>
  Log Set
</button>
```

## ✨ Complete Example

```tsx
import React, { useState, useEffect } from 'react';
import { SlideUpPanel } from '@/components/SlideUpPanel';
import { LogSetCard, SetData } from '@/components/LogSetCard';

export function MyWorkoutScreen() {
  const [showLogPanel, setShowLogPanel] = useState(false);

  // Auto-show after entering rest period
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLogPanel(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSetSaved = (data: SetData) => {
    // Save to database
    console.log('Set logged:', data);

    // Close panel
    setShowLogPanel(false);
  };

  return (
    <div>
      <h1>Rest Period</h1>

      <button onClick={() => setShowLogPanel(true)}>
        Log Set
      </button>

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

## 🎨 Customization

### Change the delay

```tsx
<SlideUpPanel
  isOpen={showLogPanel}
  onClose={() => setShowLogPanel(false)}
  delay={300}  // 300ms delay
>
```

### Pre-fill data

```tsx
<LogSetCard
  exerciseName="Bench Press"
  setNumber={2}
  initialValues={{
    reps: 10,
    weight: 185,
    effort: 7,
  }}
  onSaved={handleSetSaved}
/>
```

### Multiple dismiss methods

Users can dismiss the panel by:
- Clicking outside (backdrop)
- Swiping down
- Clicking "Save Set"

## 🧪 Test It

Run the demo:

```bash
npm run dev
```

Then import and render `RestScreenDemo` in your app to see it in action.

## 📚 Full Documentation

See [LOGSETCARD_INTEGRATION.md](LOGSETCARD_INTEGRATION.md) for:
- Advanced usage patterns
- Customization options
- Troubleshooting
- Best practices

## 🎯 Key Files

- [SlideUpPanel.tsx](src/components/SlideUpPanel.tsx) - Animated bottom sheet
- [LogSetCard.tsx](src/components/LogSetCard.tsx) - Set logging form
- [RestScreen.tsx](src/screens/RestScreen.tsx) - Full integration example
- [RestScreenDemo.tsx](src/screens/RestScreenDemo.tsx) - Interactive demo

---

That's it! You now have a fully working slide-up panel with set logging. 🎉
