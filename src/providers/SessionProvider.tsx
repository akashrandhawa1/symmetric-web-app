import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { SessionHistoryEntry, HistoricalData } from '../types';
import { loadHistory, saveHistory } from '../services';
import { safeLocalStorage, logError } from '../utils/errorHandling';

interface SessionContextValue {
  // Current session state
  currentSession: SessionHistoryEntry | null;
  isSessionActive: boolean;

  // History
  history: HistoricalData | null;
  sessions: SessionHistoryEntry[];

  // Actions
  startSession: (sessionId: string) => void;
  endSession: () => void;
  updateSession: (updates: Partial<SessionHistoryEntry>) => void;
  addSessionToHistory: (session: SessionHistoryEntry) => void;
  clearHistory: () => void;

  // Loading states
  isLoading: boolean;
  error: Error | null;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
};

interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<SessionHistoryEntry | null>(null);
  const [history, setHistory] = useState<HistoricalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load history on mount
  useEffect(() => {
    try {
      const loadedHistory = loadHistory();
      setHistory(loadedHistory);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load history');
      setError(error);
      logError(error, 'SessionProvider.loadHistory');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-save history when it changes
  useEffect(() => {
    if (history && !isLoading) {
      try {
        saveHistory(history);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to save history');
        logError(error, 'SessionProvider.saveHistory');
      }
    }
  }, [history, isLoading]);

  const startSession = useCallback((sessionId: string) => {
    const newSession: SessionHistoryEntry = {
      sessionId,
      date: new Date().toISOString(),
      exercises: [],
      readiness: null,
      notes: '',
    };
    setCurrentSession(newSession);
  }, []);

  const endSession = useCallback(() => {
    if (currentSession) {
      addSessionToHistory(currentSession);
    }
    setCurrentSession(null);
  }, [currentSession]);

  const updateSession = useCallback((updates: Partial<SessionHistoryEntry>) => {
    setCurrentSession((prev) => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
  }, []);

  const addSessionToHistory = useCallback((session: SessionHistoryEntry) => {
    setHistory((prev) => {
      const newHistory = prev || { sessions: [] };
      return {
        ...newHistory,
        sessions: [...newHistory.sessions, session],
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    try {
      setHistory({ sessions: [] });
      safeLocalStorage.removeItem('symmetric_history_v1');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear history');
      setError(error);
      logError(error, 'SessionProvider.clearHistory');
    }
  }, []);

  const value: SessionContextValue = {
    currentSession,
    isSessionActive: currentSession !== null,
    history,
    sessions: history?.sessions || [],
    startSession,
    endSession,
    updateSession,
    addSessionToHistory,
    clearHistory,
    isLoading,
    error,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};
