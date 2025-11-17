# Phase 1 Architecture Improvements

## Overview

This document describes the Phase 1 architectural improvements made to enhance the maintainability, testability, and resilience of the Symmetric app.

## What Was Done

### 1. Error Handling & Resilience ✅

**Created:**
- `src/components/ErrorBoundary.tsx` - React error boundary component
- `src/utils/errorHandling.ts` - Comprehensive error handling utilities

**Features:**
- Custom error types (NetworkError, APIError, SensorError, ValidationError)
- Retry logic with exponential backoff
- Circuit breaker pattern for API calls
- Timeout utility for promises
- Safe localStorage wrapper
- User-friendly error messages
- Error logging utilities

**Usage Example:**
```tsx
import { ErrorBoundary } from './components/ErrorBoundary';
import { retry } from './utils/errorHandling';

// Wrap components
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>

// Retry API calls
const data = await retry(() => fetchData(), {
  maxAttempts: 3,
  exponentialBackoff: true
});
```

### 2. Context Providers ✅

**Created:**
- `src/providers/SessionProvider.tsx` - Session & history management
- `src/providers/SensorProvider.tsx` - Sensor connection & readiness
- `src/providers/CoachProvider.tsx` - AI coach messaging & context
- `src/providers/index.tsx` - Combined AppProviders wrapper

**Benefits:**
- Separation of concerns from monolithic App.tsx
- Centralized state management
- Built-in error handling and retry logic
- Type-safe context values
- Easy to test and mock

**Usage Example:**
```tsx
import { useSession, useSensor, useCoach } from './providers';

function MyScreen() {
  const { currentSession, startSession } = useSession();
  const { readiness, isConnected } = useSensor();
  const { sendMessage } = useCoach();

  // Use provider data and actions
}
```

### 3. Loading States & UI Components ✅

**Created:**
- `src/components/LoadingSpinner.tsx` - Loading indicators
- `src/components/Skeleton.tsx` - Skeleton loading screens

**Components:**
- `LoadingSpinner` - Simple spinner with optional text
- `LoadingOverlay` - Full-screen overlay with blur
- `LoadingButton` - Button with loading state
- `Skeleton` - Basic skeleton shape
- `SkeletonText` - Multi-line text skeleton
- `SkeletonCard`, `SkeletonReadinessArc`, `SkeletonRepBars`, etc.

**Updated:**
- `tailwind.config.cjs` - Added shimmer animation

**Usage Example:**
```tsx
import { LoadingSpinner, SkeletonReadinessArc } from './components';

{isLoading ? <SkeletonReadinessArc /> : <ReadinessArc value={readiness} />}
```

### 4. Routing Configuration ✅

**Created:**
- `src/routes.tsx` - Comprehensive route configuration

**Features:**
- React Router DOM integration
- Lazy loading for code splitting
- Error boundaries per route
- Type-safe route constants (ROUTES object)
- Organized demo routes under `/demo/*`

**Updated:**
- `package.json` - Added react-router-dom dependency

**Usage Example:**
```tsx
import { RouterProvider } from 'react-router-dom';
import { router, ROUTES } from './routes';
import { useNavigate } from 'react-router-dom';

// In App.tsx
<RouterProvider router={router} />

// In any component
const navigate = useNavigate();
navigate(ROUTES.HISTORY);
```

## Benefits

### Maintainability
- **Modular architecture**: Logic is separated into providers instead of one massive App.tsx
- **Clear responsibilities**: Each provider manages one domain (session, sensor, coach)
- **Easy to extend**: Add new providers or modify existing ones without touching App.tsx

### Testability
- **Isolated units**: Providers can be tested independently
- **Mockable**: Easy to mock providers for component tests
- **Type-safe**: Full TypeScript coverage catches errors early

### Resilience
- **Error boundaries**: Graceful error handling prevents full app crashes
- **Retry logic**: Automatic retry for failed API calls
- **Circuit breaker**: Prevents cascade failures
- **Safe operations**: Safe wrappers for localStorage and async operations

### User Experience
- **Loading states**: Users see feedback during operations
- **Skeleton screens**: Better perceived performance
- **Error messages**: User-friendly error communication
- **Smooth routing**: Lazy loading reduces initial bundle size

## File Structure

```
src/
├── components/
│   ├── ErrorBoundary.tsx          ← Error boundary component
│   ├── LoadingSpinner.tsx         ← Loading indicators
│   ├── Skeleton.tsx               ← Skeleton screens
│   └── ...
├── providers/
│   ├── SessionProvider.tsx        ← Session management
│   ├── SensorProvider.tsx         ← Sensor management
│   ├── CoachProvider.tsx          ← Coach management
│   └── index.tsx                  ← Combined providers
├── utils/
│   └── errorHandling.ts           ← Error utilities
├── routes.tsx                     ← Route configuration
└── ...
```

## Next Steps

### Immediate (Phase 1.5)
1. **Update App.tsx** to use new providers and router
2. **Add error boundaries** around major sections in App.tsx
3. **Replace manual screen switching** with React Router navigation
4. **Test the refactored app** to ensure everything works

### Future (Phase 2)
1. **Split services.ts** into domain-specific service modules
2. **Add service workers** for PWA functionality
3. **Implement cloud sync** with backend API (Firebase/Supabase)
4. **Add advanced analytics** and volume tracking
5. **Create comprehensive test suite**

## Migration Guide

### Step 1: Wrap App with Providers

```tsx
// Before
function App() {
  const [session, setSession] = useState(null);
  const [sensor, setSensor] = useState(null);
  // ... lots of state

  return <div>...</div>;
}

// After
import { AppProviders } from './providers';

function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
```

### Step 2: Use Providers in Components

```tsx
// Before
function HomeScreen({ session, sensor, coach }) {
  // Props drilling
}

// After
import { useSession, useSensor, useCoach } from './providers';

function HomeScreen() {
  const { currentSession } = useSession();
  const { readiness } = useSensor();
  const { homeFeedback } = useCoach();

  // No props needed!
}
```

### Step 3: Add Error Boundaries

```tsx
// Wrap critical sections
<ErrorBoundary>
  <TrainingSection />
</ErrorBoundary>

<ErrorBoundary>
  <CoachSection />
</ErrorBoundary>
```

### Step 4: Add Loading States

```tsx
// Before
{loading && <div>Loading...</div>}
{data && <Content data={data} />}

// After
{loading ? <SkeletonContent /> : <Content data={data} />}
```

## API Reference

### SessionProvider

```tsx
const {
  currentSession,      // Current active session
  isSessionActive,     // Boolean flag
  history,             // Historical data
  sessions,            // Array of sessions
  startSession,        // (sessionId: string) => void
  endSession,          // () => void
  updateSession,       // (updates: Partial<Session>) => void
  addSessionToHistory, // (session: Session) => void
  clearHistory,        // () => void
  isLoading,           // Loading state
  error,               // Error state
} = useSession();
```

### SensorProvider

```tsx
const {
  sensorState,         // Current sensor data
  sensorStatus,        // Connection status
  isConnected,         // Boolean flag
  readiness,           // 0-100 score
  predictions,         // Array of predictions
  currentRep,          // Current rep data
  connectSensor,       // () => Promise<void>
  disconnectSensor,    // () => void
  updateSensorState,   // (state: Partial<SensorState>) => void
  addPrediction,       // (prediction: PredictionData) => void
  clearPredictions,    // () => void
  isConnecting,        // Connecting state
  error,               // Error state
} = useSensor();
```

### CoachProvider

```tsx
const {
  messages,            // Array of messages
  currentContext,      // Coaching context
  homeFeedback,        // Home screen feedback
  sendMessage,         // (content: string) => Promise<void>
  getCoachResponse,    // (prompt: string) => Promise<string>
  fetchHomeFeedback,   // () => Promise<void>
  clearMessages,       // () => void
  setContext,          // (context: CoachContextState) => void
  isLoading,           // Loading state
  isSendingMessage,    // Sending message state
  error,               // Error state
} = useCoach();
```

### Error Handling Utilities

```tsx
import {
  retry,              // Retry with backoff
  withTimeout,        // Add timeout to promise
  CircuitBreaker,     // Circuit breaker pattern
  safeLocalStorage,   // Safe localStorage wrapper
  logError,           // Error logger
  NetworkError,       // Custom error types
  APIError,
  SensorError,
  ValidationError,
} from './utils/errorHandling';
```

## Testing

### Provider Testing

```tsx
import { renderHook, act } from '@testing-library/react';
import { SessionProvider, useSession } from './providers';

test('startSession creates new session', () => {
  const { result } = renderHook(() => useSession(), {
    wrapper: SessionProvider,
  });

  act(() => {
    result.current.startSession('test-session');
  });

  expect(result.current.currentSession).toBeTruthy();
  expect(result.current.isSessionActive).toBe(true);
});
```

### Error Boundary Testing

```tsx
import { render } from '@testing-library/react';
import { ErrorBoundary } from './components/ErrorBoundary';

const ThrowError = () => {
  throw new Error('Test error');
};

test('ErrorBoundary catches errors', () => {
  const { getByText } = render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(getByText('Something went wrong')).toBeInTheDocument();
});
```

## Troubleshooting

### "useSession must be used within SessionProvider"

**Solution:** Wrap your app with AppProviders:

```tsx
<AppProviders>
  <YourApp />
</AppProviders>
```

### React Router not working

**Solution:** Install react-router-dom:

```bash
npm install react-router-dom
```

### Retry logic not working

**Solution:** Check that you're using async/await:

```tsx
// ❌ Wrong
retry(() => fetchData());

// ✅ Correct
await retry(() => fetchData());
```

## Performance Considerations

- **Code splitting**: Lazy loaded routes reduce initial bundle size
- **Provider memoization**: Use React.memo() for expensive computations
- **Skeleton screens**: Improve perceived performance
- **Error boundaries**: Prevent cascade re-renders on errors

## Security Considerations

- **Safe localStorage**: Catches and logs errors, doesn't crash app
- **Input validation**: Add validation before API calls
- **Error messages**: Don't expose sensitive information in error messages
- **API keys**: Keep in environment variables, not in code

## Conclusion

Phase 1 provides a solid architectural foundation for the Symmetric app. The improvements enable:

- ✅ Better maintainability through separation of concerns
- ✅ Improved resilience with error handling and retry logic
- ✅ Enhanced user experience with loading states
- ✅ Easier testing with modular providers
- ✅ Future-proof architecture for scaling

The next phase will focus on refactoring App.tsx to use these new providers and implementing more advanced features like cloud sync and PWA support.
