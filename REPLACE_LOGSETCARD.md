# How to Replace the LogSetCard Component

If you already have a `LogSetCard` component, here's how to integrate it with the slide-up panel.

## Option 1: Add `onSaved` prop to your existing component

### Your Current LogSetCard

```tsx
// Your existing component
export function LogSetCard({ setNumber, exerciseName }) {
  const [reps, setReps] = useState(0);
  const [weight, setWeight] = useState(0);

  const handleSave = () => {
    // Your save logic
    console.log('Saved!');
  };

  return (
    <div>
      {/* Your existing UI */}
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

### Add the callback prop

```tsx
export function LogSetCard({
  setNumber,
  exerciseName,
  onSaved  // ADD THIS
}: {
  setNumber?: number;
  exerciseName?: string;
  onSaved?: (data: any) => void;  // ADD THIS
}) {
  const [reps, setReps] = useState(0);
  const [weight, setWeight] = useState(0);

  const handleSave = () => {
    // Your save logic
    console.log('Saved!');

    // ADD THIS: Notify parent
    onSaved?.({
      reps,
      weight,
      // ... any other data you want to pass
    });
  };

  return (
    <div>
      {/* Your existing UI */}
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

That's it! Now you can use it with `SlideUpPanel`:

```tsx
<SlideUpPanel
  isOpen={showLogPanel}
  onClose={() => setShowLogPanel(false)}
>
  <LogSetCard
    exerciseName="Squat"
    setNumber={1}
    onSaved={(data) => {
      console.log('Saved:', data);
      setShowLogPanel(false);  // Close the panel
    }}
  />
</SlideUpPanel>
```

## Option 2: Use the provided LogSetCard as-is

If you don't have a `LogSetCard` yet, the one I created ([src/components/LogSetCard.tsx](src/components/LogSetCard.tsx)) is fully functional and includes:

- Reps input
- Weight input
- Effort slider (1-10)
- Notes textarea
- Visual stats summary
- `onSaved` callback already built-in

Just use it directly:

```tsx
import { LogSetCard } from '@/components/LogSetCard';

<LogSetCard
  exerciseName="Barbell Squat"
  setNumber={1}
  onSaved={(data) => {
    console.log('Data:', data);
    // data = { reps: 10, weight: 225, effort: 8, notes: "Felt strong" }
  }}
/>
```

## Option 3: Customize the provided LogSetCard

Edit [src/components/LogSetCard.tsx](src/components/LogSetCard.tsx) to match your needs:

### Add custom fields

```tsx
// Add to the component
const [tempo, setTempo] = useState('3-0-1-0');

// Add to the SetData interface
export interface SetData {
  reps: number;
  weight: number;
  effort: number;
  notes?: string;
  tempo?: string;  // NEW
}

// Add to the JSX
<div>
  <label htmlFor="tempo">Tempo</label>
  <input
    id="tempo"
    value={tempo}
    onChange={(e) => setTempo(e.target.value)}
  />
</div>

// Add to handleSave
const data: SetData = {
  reps,
  weight,
  effort,
  notes: notes.trim() || undefined,
  tempo,  // NEW
};
```

### Change styling

The component uses Tailwind classes. Example:

```tsx
// Change button color from blue to green
<button
  className="... bg-green-600 hover:bg-green-700 ..."
>
  Save Set
</button>
```

## TypeScript Types

If you want to use your own data structure:

```tsx
// Define your type
interface MySetData {
  reps: number;
  load: number;  // Using 'load' instead of 'weight'
  rpe: number;   // Using RPE instead of 'effort'
  // ... your fields
}

// Use it with the callback
<LogSetCard
  onSaved={(data) => {
    const myData: MySetData = {
      reps: data.reps,
      load: data.weight,
      rpe: data.effort,
    };
    // Save your way
  }}
/>
```

## Comparison: Provided vs Custom

| Feature | Provided LogSetCard | Your LogSetCard |
|---------|-------------------|-----------------|
| Reps input | ✅ | ✅ |
| Weight input | ✅ | ✅ |
| Effort slider | ✅ | ? |
| Notes | ✅ | ? |
| Stats summary | ✅ | ? |
| `onSaved` callback | ✅ | Need to add |
| Custom fields | Can add | Already has |

## Need Help?

- See [LOGSETCARD_QUICKSTART.md](LOGSETCARD_QUICKSTART.md) for basic usage
- See [LOGSETCARD_INTEGRATION.md](LOGSETCARD_INTEGRATION.md) for advanced patterns
- Check [src/screens/RestScreenDemo.tsx](src/screens/RestScreenDemo.tsx) for a working example

---

**Tip:** Start with the provided component to get it working quickly, then customize as needed!
