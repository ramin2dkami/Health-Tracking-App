import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

// Screens read `version` as an effect dependency so writes from anywhere (e.g. the + sheet) refresh them.
const DataVersionContext = createContext<{ version: number; bump: () => void }>({
  version: 0,
  bump: () => {},
});

export function DataVersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  return <DataVersionContext.Provider value={{ version, bump }}>{children}</DataVersionContext.Provider>;
}

export function useDataVersion() {
  return useContext(DataVersionContext);
}
