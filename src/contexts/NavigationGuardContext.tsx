import { createContext, useContext, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface NavigationGuardContextValue {
  requestNavigate: (to: string) => void;
  setGuard: (fn: ((to: string) => void) | null) => void;
}

const NavigationGuardContext = createContext<NavigationGuardContextValue>({
  requestNavigate: () => {},
  setGuard: () => {},
});

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const guardRef = useRef<((to: string) => void) | null>(null);

  const requestNavigate = (to: string) => {
    if (guardRef.current) {
      guardRef.current(to);
    } else {
      navigate(to);
    }
  };

  const setGuard = (fn: ((to: string) => void) | null) => {
    guardRef.current = fn;
  };

  return (
    <NavigationGuardContext.Provider value={{ requestNavigate, setGuard }}>
      {children}
    </NavigationGuardContext.Provider>
  );
}

export const useNavigationGuard = () => useContext(NavigationGuardContext);
