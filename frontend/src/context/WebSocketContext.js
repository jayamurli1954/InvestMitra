import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { API } from '@/App';

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
  return useContext(WebSocketContext);
};

export const WebSocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [liveStockPrices, setLiveStockPrices] = useState({});
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
    const websocketUrl = `ws://localhost:8000/ws/${userId}`.replace('http', 'ws'); // Adjust for production if needed

    ws.current = new WebSocket(websocketUrl);

    ws.current.onopen = () => {
      // WebSocket connection established
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'stock_price_update') {
        setLiveStockPrices(prevPrices => ({
          ...prevPrices,
          [data.symbol]: data.price,
        }));
      }
      // Handle other types of real-time updates here
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
  }, [isAuthenticated, user]);

  const value = {
    liveStockPrices,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
