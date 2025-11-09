import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { API } from '@/App';
import logger from '@/utils/logger';

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
  return useContext(WebSocketContext);
};

export const WebSocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [liveStockPrices, setLiveStockPrices] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected
  const ws = useRef(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimeout = useRef(null);
  const isMounted = useRef(true);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const BASE_RECONNECT_DELAY = 1000; // 1 second

  const connect = useCallback(() => {
    if (!isAuthenticated || !user || !isMounted.current) {
      return;
    }

    const userId = user.id;
    const websocketUrl = `ws://localhost:8000/ws/${userId}`.replace('http', 'ws');

    // Clear any existing connection
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    setConnectionStatus('connecting');
    logger.info(`WebSocket connecting... (attempt ${reconnectAttempt.current + 1})`);

    try {
      ws.current = new WebSocket(websocketUrl);

      ws.current.onopen = () => {
        logger.info('WebSocket connected successfully');
        setConnectionStatus('connected');
        reconnectAttempt.current = 0; // Reset on successful connection
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'stock_price_update') {
            setLiveStockPrices(prevPrices => ({
              ...prevPrices,
              [data.symbol]: data.price,
            }));
          }
          // Handle other types of real-time updates here
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        logger.warn('WebSocket closed', { code: event.code, reason: event.reason });
        setConnectionStatus('disconnected');

        // Only attempt reconnection if component is still mounted and user is authenticated
        if (isMounted.current && isAuthenticated && user) {
          if (reconnectAttempt.current < MAX_RECONNECT_ATTEMPTS) {
            // Exponential backoff: 1s, 2s, 4s, 8s, 16s
            const delay = Math.min(
              BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempt.current),
              30000 // Max 30 seconds
            );

            logger.info(`Reconnecting in ${delay}ms...`);

            reconnectTimeout.current = setTimeout(() => {
              reconnectAttempt.current++;
              connect();
            }, delay);
          } else {
            logger.error('Max reconnection attempts reached. Please refresh the page.');
            setConnectionStatus('failed');
          }
        }
      };

      ws.current.onerror = (error) => {
        logger.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      logger.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    isMounted.current = true;

    if (isAuthenticated && user) {
      connect();
    } else {
      // Cleanup when user logs out
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
      setConnectionStatus('disconnected');
      reconnectAttempt.current = 0;
    }

    return () => {
      isMounted.current = false;
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    };
  }, [isAuthenticated, user, connect]);

  const value = {
    liveStockPrices,
    connectionStatus,
    reconnect: connect, // Allow manual reconnection
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
