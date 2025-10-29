# Quick Integration - LogSetCard Slide-Up Panel

## 📦 3-Step Integration

### Step 1: Import
```tsx
import { SlideUpLogPanel } from '@/components/SlideUpLogPanel';
```

### Step 2: Add State
```tsx
const [showLogPanel, setShowLogPanel] = useState(false);

// Auto-show when rest begins
useEffect(() => {
  const timer = setTimeout(() => setShowLogPanel(true), 500);
  return () => clearTimeout(timer);
}, []);
```

### Step 3: Render Panel
```tsx
<SlideUpLogPanel
  show={showLogPanel}
  onClose={() => setShowLogPanel(false)}
  initialExercise="Barbell Squat"
  initialWeight="95"
/>
```

## 🎯 Complete Example

```tsx
import React, { useState, useEffect } from 'react';
import { SlideUpLogPanel } from '@/components/SlideUpLogPanel';

export function MyRestScreen() {
  const [showLogPanel, setShowLogPanel] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowLogPanel(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen p-6">
      <h1>Rest Period</h1>

      <button onClick={() => setShowLogPanel(true)}>
        Log Set
      </button>

      <SlideUpLogPanel
        show={showLogPanel}
        onClose={() => setShowLogPanel(false)}
        initialExercise="Squat"
        initialWeight="95"
      />
    </div>
  );
}
```

## ✅ Features

- ✅ Auto-slides up after 500ms
- ✅ Click outside to dismiss
- ✅ Auto-closes after save (2s delay)
- ✅ Your design 100% preserved
- ✅ Smooth spring animations

## 🎨 What's Preserved

Your entire LogSetCard design:
- Gradient background (zinc-900 → black)
- Scrollable weight picker (5-500 lbs)
- Manual input toggle
- Success animation
- All styling and animations

## 📚 Full Documentation

See [LOGSETCARD_SLIDE_UP_INTEGRATION.md](LOGSETCARD_SLIDE_UP_INTEGRATION.md) for:
- Detailed API reference
- Customization options
- Advanced patterns
- Troubleshooting

## 🏃 Run It

```bash
npm run dev
```

Import `RestScreen` from `@/screens/RestScreen` to see the full demo!

---

That's it! Copy the code above and you're ready to go. 🚀
