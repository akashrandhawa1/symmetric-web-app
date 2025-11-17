import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import type { SensorState, SensorStatus, PredictionData, RepData } from '../types';
import { SensorError, logError } from '../utils/errorHandling';

interface SensorContextValue {
  // Sensor state
  sensorState: SensorState | null;
  sensorStatus: SensorStatus;
  isConnected: boolean;

  // Readiness & predictions
  readiness: number | null;
  predictions: PredictionData[];
  currentRep: RepData | null;

  // Actions
  connectSensor: () => Promise<void>;
  disconnectSensor: () => void;
  updateSensorState: (state: Partial<SensorState>) => void;
  addPrediction: (prediction: PredictionData) => void;
  clearPredictions: () => void;

  // Loading & error states
  isConnecting: boolean;
  error: Error | null;
}

const SensorContext = createContext<SensorContextValue | undefined>(undefined);

export const useSensor = () => {
  const context = useContext(SensorContext);
  if (!context) {
    throw new Error('useSensor must be used within SensorProvider');
  }
  return context;
};

interface SensorProviderProps {
  children: ReactNode;
}

export const SensorProvider: React.FC<SensorProviderProps> = ({ children }) => {
  const [sensorState, setSensorState] = useState<SensorState | null>(null);
  const [sensorStatus, setSensorStatus] = useState<SensorStatus>({
    connected: false,
    battery: null,
    signalStrength: null,
  });
  const [readiness, setReadiness] = useState<number | null>(null);
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [currentRep, setCurrentRep] = useState<RepData | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const connectSensor = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // TODO: Implement actual sensor connection logic
      // This is a placeholder for demonstration

      // For now, simulate connection
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSensorStatus({
        connected: true,
        battery: 85,
        signalStrength: 90,
      });

      // Initialize sensor state
      setSensorState({
        left: { rms: 0, peak: 0, mvc: 100 },
        right: { rms: 0, peak: 0, mvc: 100 },
      });

      console.log('Sensor connected successfully');
    } catch (err) {
      const error = new SensorError(
        'Failed to connect to sensor',
        err instanceof Error ? err : undefined
      );
      setError(error);
      logError(error, 'SensorProvider.connectSensor');
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectSensor = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setSensorStatus({
      connected: false,
      battery: null,
      signalStrength: null,
    });
    setSensorState(null);
    setReadiness(null);
    setPredictions([]);
    setCurrentRep(null);
    setError(null);

    console.log('Sensor disconnected');
  }, []);

  const updateSensorState = useCallback((state: Partial<SensorState>) => {
    setSensorState((prev) => {
      if (!prev) return null;
      return { ...prev, ...state };
    });

    // Update readiness based on sensor state
    // TODO: Implement actual readiness calculation
    if (state.left || state.right) {
      const avgRms = ((state.left?.rms || 0) + (state.right?.rms || 0)) / 2;
      setReadiness(Math.min(100, avgRms));
    }
  }, []);

  const addPrediction = useCallback((prediction: PredictionData) => {
    setPredictions((prev) => [...prev, prediction]);

    // Update current rep if this prediction represents a completed rep
    if (prediction.repComplete) {
      setCurrentRep({
        repIndex: predictions.length,
        peak: prediction.peak || 0,
        duration: prediction.duration || 0,
        timestamp: prediction.timestamp,
      });
    }
  }, [predictions.length]);

  const clearPredictions = useCallback(() => {
    setPredictions([]);
    setCurrentRep(null);
  }, []);

  const value: SensorContextValue = {
    sensorState,
    sensorStatus,
    isConnected: sensorStatus.connected,
    readiness,
    predictions,
    currentRep,
    connectSensor,
    disconnectSensor,
    updateSensorState,
    addPrediction,
    clearPredictions,
    isConnecting,
    error,
  };

  return <SensorContext.Provider value={value}>{children}</SensorContext.Provider>;
};
