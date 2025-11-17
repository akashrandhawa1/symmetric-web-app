import React, { ReactNode } from 'react';
import { SessionProvider } from './SessionProvider';
import { SensorProvider } from './SensorProvider';
import { CoachProvider } from './CoachProvider';
import { ErrorBoundary } from '../components/ErrorBoundary';

/**
 * Combined provider that wraps all app-level providers
 * Includes error boundary for resilience
 */
interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <SensorProvider>
          <CoachProvider>
            {children}
          </CoachProvider>
        </SensorProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
};

// Re-export individual providers and hooks
export { SessionProvider, useSession } from './SessionProvider';
export { SensorProvider, useSensor } from './SensorProvider';
export { CoachProvider, useCoach } from './CoachProvider';
