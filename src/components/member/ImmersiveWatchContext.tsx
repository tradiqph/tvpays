"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Ctx = {
  immersive: boolean;
  setImmersive: (on: boolean) => void;
};

const ImmersiveWatchContext = createContext<Ctx | null>(null);

export function ImmersiveWatchProvider({ children }: { children: ReactNode }) {
  const [immersive, setImmersiveState] = useState(false);
  const setImmersive = useCallback((on: boolean) => setImmersiveState(on), []);
  const value = useMemo(
    () => ({ immersive, setImmersive }),
    [immersive, setImmersive],
  );
  return (
    <ImmersiveWatchContext.Provider value={value}>
      {children}
    </ImmersiveWatchContext.Provider>
  );
}

export function useImmersiveWatch(): Ctx {
  const ctx = useContext(ImmersiveWatchContext);
  if (!ctx) {
    return { immersive: false, setImmersive: () => {} };
  }
  return ctx;
}
