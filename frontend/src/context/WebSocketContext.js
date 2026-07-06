import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getWebSocketBaseUrl } from '@/config/backend';

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
  return useContext(WebSocketContext);
};

export const WebSocketProvider = ({ children }) => {
  const { user, isAuthenticated, sessionToken } = useAuth();
  const [liveStockPrices, setLiveStockPrices] = useState({});
  const [priceFlashes, setPriceFlashes] = useState({});
  const ws = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      return;
    }

    const userId = user.id;
    const wsHost = getWebSocketBaseUrl();
    const tokenQuery = sessionToken ? `?token=${encodeURIComponent(sessionToken)}` : '';
    const websocketUrl = `${wsHost}/ws/${userId}${tokenQuery}`;

    ws.current = new WebSocket(websocketUrl);

    ws.current.onopen = () => {
      // WebSocket connection established
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'stock_price_update') {
        setLiveStockPrices(prevPrices => {
          const oldPrice = prevPrices[data.symbol];
          const newPrice = data.price;
          if (oldPrice !== undefined && oldPrice !== newPrice) {
            const flashClass = newPrice > oldPrice ? 'flash-up' : 'flash-down';
            setPriceFlashes(prev => ({ ...prev, [data.symbol]: flashClass }));
            setTimeout(() => {
              setPriceFlashes(prev => ({ ...prev, [data.symbol]: '' }));
            }, 1200);
          }
          return {
            ...prevPrices,
            [data.symbol]: newPrice,
          };
        });
      }
    };

    ws.current.onclose = () => {
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (isAuthenticated && user) {
          // Re-establish connection by re-running effect
          // This is a simplified approach, a more robust solution would involve exponential backoff
          // and checking if the component is still mounted.
          ws.current = new WebSocket(websocketUrl);
        }
      }, 3000);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [isAuthenticated, user, sessionToken]);

  const value = {
    liveStockPrices,
    priceFlashes,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
