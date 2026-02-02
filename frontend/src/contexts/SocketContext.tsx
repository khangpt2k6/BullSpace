import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import SocketService from '../services/socket/SocketService';

interface SocketContextType {
  socket: typeof SocketService;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Connect to socket on mount
    SocketService.connect();

    // Disconnect on unmount
    return () => {
      SocketService.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: SocketService }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context.socket;
};
