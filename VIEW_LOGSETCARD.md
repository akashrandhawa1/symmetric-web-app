# 🚀 How to View Your LogSetCard Slide-Up Panel

## Quick Start (Recommended)

Run the dedicated demo:

```bash
npm run dev:logset
```

Then open your browser to: **http://localhost:3000**

## What You'll See

1. ✨ **Rest period screen** with timer and progress bar
2. ⏱️ **After 500ms**, your LogSetCard slides up from the bottom
3. 🎨 **Your beautiful design** preserved (gradient, scroll picker, everything!)
4. 💾 Fill in exercise & weight, then click **"Save Set"**
5. ✅ Success animation plays
6. 🎭 Panel auto-closes after 2 seconds

## Alternative: Manual Browser Open

Open directly in browser:
```
http://localhost:3000/logset-demo.html
```

## Demo Features

### Auto-Show
- Panel automatically slides up 500ms after page loads
- Simulates entering a rest period

### Dismiss Methods
- ✅ Click/tap outside the panel (on backdrop)
- ✅ Click "Save Set" button
- ✅ Click "Log Set" to reopen manually

### Your Design
- ✅ `bg-gradient-to-b from-zinc-900 to-black`
- ✅ Scrollable weight picker (5-500 lbs)
- ✅ Manual input toggle
- ✅ Success animation
- ✅ All styling intact

## Troubleshooting

### Port already in use?
```bash
# Kill the process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev:logset -- --port 3001
```

### Not seeing the panel?
1. Check browser console for errors
2. Wait 500ms - it auto-shows with delay
3. Click "Log Set" button to manually open

### Seeing the old version?
1. Hard refresh: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
2. Clear browser cache
3. Restart dev server

## Integration Into Your Main App

Once you've verified it works in the demo, integrate it into your main app:

### Step 1: Import
```tsx
import { SlideUpLogPanel } from '@/components/SlideUpLogPanel';
```

### Step 2: Add State
```tsx
const [showLogPanel, setShowLogPanel] = useState(false);
```

### Step 3: Render
```tsx
<SlideUpLogPanel
  show={showLogPanel}
  onClose={() => setShowLogPanel(false)}
  initialExercise="Barbell Squat"
  initialWeight="95"
/>
```

See [QUICK_INTEGRATION.md](QUICK_INTEGRATION.md) for full example.

## Files to Check

- **Demo entry**: [src/logset-demo-entry.tsx](src/logset-demo-entry.tsx)
- **Your LogSetCard**: [src/components/LogSetCard.tsx](src/components/LogSetCard.tsx)
- **Wrapper component**: [src/components/SlideUpLogPanel.tsx](src/components/SlideUpLogPanel.tsx)
- **Integration example**: [src/screens/RestScreen.tsx](src/screens/RestScreen.tsx)

## Next Steps

1. ✅ Run `npm run dev:logset`
2. ✅ See it in action
3. ✅ Read [QUICK_INTEGRATION.md](QUICK_INTEGRATION.md)
4. ✅ Integrate into your app

---

**Need help?** Check the browser console for any errors or see [LOGSETCARD_SLIDE_UP_INTEGRATION.md](LOGSETCARD_SLIDE_UP_INTEGRATION.md) for detailed docs.
