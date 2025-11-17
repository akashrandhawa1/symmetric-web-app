import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouteObject, Navigate } from 'react-router-dom';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load screens for code splitting
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const RestScreen = lazy(() => import('./screens/RestScreen'));
const HistoryScreen = lazy(() => import('./screens/HistoryScreen'));
const ChatScreen = lazy(() => import('./screens/ChatScreen'));
const PreTrainingScreen = lazy(() => import('./screens/PreTrainingScreen'));
const PlacementGuideScreen = lazy(() => import('./screens/PlacementGuideScreen'));
const TestingScreen = lazy(() => import('./screens/TestingScreen'));
const SetupScreen = lazy(() => import('./screens/SetupScreen'));
const ConnectScreen = lazy(() => import('./screens/ConnectScreen'));
const SplashScreen = lazy(() => import('./screens/SplashScreen'));
const IntroScreen = lazy(() => import('./screens/IntroScreen'));
const ImpactScreen = lazy(() => import('./screens/ImpactScreen'));
const MVCScreen = lazy(() => import('./screens/MVCScreen'));

// Demo screens
const PlanDemo = lazy(() => import('./screens/PlanDemo'));
const LiveCoachingDemo = lazy(() => import('./screens/LiveCoachingDemo'));
const ExerciseRecommendationDemo = lazy(() => import('./screens/ExerciseRecommendationDemo'));
const ComplianceDemo = lazy(() => import('./screens/ComplianceDemo'));
const RestScreenDemo = lazy(() => import('./screens/RestScreenDemo'));
const WorkoutCompleteDemo = lazy(() => import('./screens/WorkoutCompleteDemo'));
const PlanRevealMinimalDemo = lazy(() => import('./screens/PlanRevealMinimalDemo'));
const PlanInlineDemo = lazy(() => import('./screens/PlanInlineDemo'));
const PlanRightSpineDemo = lazy(() => import('./screens/PlanRightSpineDemo'));
const VariationDemo = lazy(() => import('./screens/VariationDemo'));
const DemoRestCoach = lazy(() => import('./screens/DemoRestCoach'));
const PremiumPlanDemo = lazy(() => import('./screens/PremiumPlanDemo'));

/**
 * Wrapper component for lazy-loaded routes with loading state
 */
const LazyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner fullScreen text="Loading..." />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

/**
 * Main application routes
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <LazyRoute>
        <HomeScreen />
      </LazyRoute>
    ),
  },
  {
    path: '/splash',
    element: (
      <LazyRoute>
        <SplashScreen />
      </LazyRoute>
    ),
  },
  {
    path: '/intro',
    element: (
      <LazyRoute>
        <IntroScreen />
      </LazyRoute>
    ),
  },
  {
    path: '/setup',
    element: (
      <LazyRoute>
        <SetupScreen />
      </LazyRoute>
    ),
  },
  {
    path: '/connect',
    element: (
      <LazyRoute>
        <ConnectScreen />
      </LazyRoute>
    ),
  },
  {
    path: '/placement',
    element: (
      <LazyRoute>
        <PlacementGuideScreen />
      </LazyRoute>
    ),
  },
  {
    path: '/testing',
    element: (
      <LazyRoute>
        <TestingScreen />
      </LazyRoute>
    ),
  },
  {
    path: '/mvc',
    element: (
      <LazyRoute>
        <MVCScreen />
      </LazyRoute>
    ),
  },
  {
    path: '/pre-training',
    element: (
      <LazyRoute>
        <PreTrainingScreen />
      </LazyRoute>
    ),
  },
  {
    path: '/rest',
    element: (
      <LazyRoute>
        <RestScreen />
      </LazyRoute>
    ),
  },
  {
    path: '/impact',
    element: (
      <LazyRoute>
        <ImpactScreen />
      </LazyRoute>
    ),
  },
  {
    path: '/history',
    element: (
      <LazyRoute>
        <HistoryScreen />
      </LazyRoute>
    ),
  },
  {
    path: '/chat',
    element: (
      <LazyRoute>
        <ChatScreen />
      </LazyRoute>
    ),
  },

  // Demo routes
  {
    path: '/demo',
    children: [
      {
        path: 'plan',
        element: (
          <LazyRoute>
            <PlanDemo />
          </LazyRoute>
        ),
      },
      {
        path: 'coaching',
        element: (
          <LazyRoute>
            <LiveCoachingDemo />
          </LazyRoute>
        ),
      },
      {
        path: 'exercise-recommendation',
        element: (
          <LazyRoute>
            <ExerciseRecommendationDemo />
          </LazyRoute>
        ),
      },
      {
        path: 'compliance',
        element: (
          <LazyRoute>
            <ComplianceDemo />
          </LazyRoute>
        ),
      },
      {
        path: 'rest',
        element: (
          <LazyRoute>
            <RestScreenDemo />
          </LazyRoute>
        ),
      },
      {
        path: 'workout-complete',
        element: (
          <LazyRoute>
            <WorkoutCompleteDemo />
          </LazyRoute>
        ),
      },
      {
        path: 'plan-reveal-minimal',
        element: (
          <LazyRoute>
            <PlanRevealMinimalDemo />
          </LazyRoute>
        ),
      },
      {
        path: 'plan-inline',
        element: (
          <LazyRoute>
            <PlanInlineDemo />
          </LazyRoute>
        ),
      },
      {
        path: 'plan-right-spine',
        element: (
          <LazyRoute>
            <PlanRightSpineDemo />
          </LazyRoute>
        ),
      },
      {
        path: 'variation',
        element: (
          <LazyRoute>
            <VariationDemo />
          </LazyRoute>
        ),
      },
      {
        path: 'rest-coach',
        element: (
          <LazyRoute>
            <DemoRestCoach />
          </LazyRoute>
        ),
      },
      {
        path: 'premium-plan',
        element: (
          <LazyRoute>
            <PremiumPlanDemo />
          </LazyRoute>
        ),
      },
    ],
  },

  // Catch-all route - redirect to home
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];

/**
 * Create and export the router instance
 */
export const router = createBrowserRouter(routes);

// Export route paths as constants for type-safe navigation
export const ROUTES = {
  HOME: '/',
  SPLASH: '/splash',
  INTRO: '/intro',
  SETUP: '/setup',
  CONNECT: '/connect',
  PLACEMENT: '/placement',
  TESTING: '/testing',
  MVC: '/mvc',
  PRE_TRAINING: '/pre-training',
  REST: '/rest',
  IMPACT: '/impact',
  HISTORY: '/history',
  CHAT: '/chat',
  DEMO: {
    PLAN: '/demo/plan',
    COACHING: '/demo/coaching',
    EXERCISE_RECOMMENDATION: '/demo/exercise-recommendation',
    COMPLIANCE: '/demo/compliance',
    REST: '/demo/rest',
    WORKOUT_COMPLETE: '/demo/workout-complete',
    PLAN_REVEAL_MINIMAL: '/demo/plan-reveal-minimal',
    PLAN_INLINE: '/demo/plan-inline',
    PLAN_RIGHT_SPINE: '/demo/plan-right-spine',
    VARIATION: '/demo/variation',
    REST_COACH: '/demo/rest-coach',
    PREMIUM_PLAN: '/demo/premium-plan',
  },
} as const;
