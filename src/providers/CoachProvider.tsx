import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { CoachMessage, CoachContextState, CoachHomeFeedback } from '../types';
import { fetchCoachAnswer, fetchHomeRecommendations } from '../services';
import { APIError, logError, retry } from '../utils/errorHandling';

interface CoachContextValue {
  // Coach state
  messages: CoachMessage[];
  currentContext: CoachContextState;
  homeFeedback: CoachHomeFeedback | null;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  getCoachResponse: (prompt: string) => Promise<string>;
  fetchHomeFeedback: () => Promise<void>;
  clearMessages: () => void;
  setContext: (context: CoachContextState) => void;

  // Loading & error states
  isLoading: boolean;
  isSendingMessage: boolean;
  error: Error | null;
}

const CoachContext = createContext<CoachContextValue | undefined>(undefined);

export const useCoach = () => {
  const context = useContext(CoachContext);
  if (!context) {
    throw new Error('useCoach must be used within CoachProvider');
  }
  return context;
};

interface CoachProviderProps {
  children: ReactNode;
}

export const CoachProvider: React.FC<CoachProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [currentContext, setCurrentContext] = useState<CoachContextState>('idle');
  const [homeFeedback, setHomeFeedback] = useState<CoachHomeFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    // Add user message
    const userMessage: CoachMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsSendingMessage(true);
    setError(null);

    try {
      // Get coach response with retry logic
      const response = await retry(
        () =>
          fetchCoachAnswer(
            {
              userInput: content,
              context: currentContext,
            },
            { signal: new AbortController().signal }
          ),
        {
          maxAttempts: 3,
          delayMs: 1000,
          exponentialBackoff: true,
          shouldRetry: (error) => {
            // Retry on network errors, but not on 4xx client errors
            if (error instanceof APIError) {
              return error.statusCode ? error.statusCode >= 500 : true;
            }
            return true;
          },
        }
      );

      // Add coach response
      const coachMessage: CoachMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, coachMessage]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get coach response');
      setError(error);
      logError(error, 'CoachProvider.sendMessage', { content });

      // Add error message
      const errorMessage: CoachMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);

      throw error;
    } finally {
      setIsSendingMessage(false);
    }
  }, [currentContext]);

  const getCoachResponse = useCallback(async (prompt: string): Promise<string> => {
    setError(null);

    try {
      const response = await retry(
        () =>
          fetchCoachAnswer(
            {
              userInput: prompt,
              context: currentContext,
            },
            { signal: new AbortController().signal }
          ),
        {
          maxAttempts: 3,
          exponentialBackoff: true,
        }
      );

      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get coach response');
      setError(error);
      logError(error, 'CoachProvider.getCoachResponse', { prompt });
      throw error;
    }
  }, [currentContext]);

  const fetchHomeFeedback = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const feedback = await retry(
        () =>
          fetchHomeRecommendations(
            {
              readiness: 75, // TODO: Get from sensor context
              lastSessionDate: null,
              nextOptimalDate: null,
            },
            { signal: new AbortController().signal }
          ),
        {
          maxAttempts: 3,
          exponentialBackoff: true,
        }
      );

      setHomeFeedback(feedback as any); // TODO: Fix type
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch home feedback');
      setError(error);
      logError(error, 'CoachProvider.fetchHomeFeedback');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const setContext = useCallback((context: CoachContextState) => {
    setCurrentContext(context);
  }, []);

  const value: CoachContextValue = {
    messages,
    currentContext,
    homeFeedback,
    sendMessage,
    getCoachResponse,
    fetchHomeFeedback,
    clearMessages,
    setContext,
    isLoading,
    isSendingMessage,
    error,
  };

  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>;
};
