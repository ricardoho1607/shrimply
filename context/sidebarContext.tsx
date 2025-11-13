// context/SidebarContext.tsx
import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { Animated } from 'react-native';

interface SidebarContextType {
  sidebarVisible: boolean;
  setSidebarVisible: (visible: boolean) => void;
  reportsExpanded: boolean;
  setReportsExpanded: (expanded: boolean) => void;
  inventoryExpanded: boolean;
  setInventoryExpanded: (expanded: boolean) => void;
  slideAnimRef: Animated.Value;
  toggleReports: () => void;
  toggleInventory: () => void;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [inventoryExpanded, setInventoryExpanded] = useState(false);
  const slideAnimRef = useRef(new Animated.Value(-300)).current;

  // Animate sidebar when visibility changes
  React.useEffect(() => {
    Animated.timing(slideAnimRef, {
      toValue: sidebarVisible ? 0 : -300,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [sidebarVisible, slideAnimRef]);

  const toggleReports = () => {
    setReportsExpanded(prev => !prev);
  };

  const toggleInventory = () => {
    setInventoryExpanded(prev => !prev);
  };

  const toggleSidebar = () => {
    setSidebarVisible(prev => !prev);
  };

  return (
    <SidebarContext.Provider
      value={{
        sidebarVisible,
        setSidebarVisible,
        reportsExpanded,
        setReportsExpanded,
        inventoryExpanded,
        setInventoryExpanded,
        slideAnimRef,
        toggleReports,
        toggleInventory,
        toggleSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};