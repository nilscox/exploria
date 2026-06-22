import { createContext, use, useState } from 'react';

const context = createContext<{ debug: boolean; setDebug: (debug: boolean) => void }>({
  debug: false,
  setDebug: () => {},
});

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [debug, setDebug] = useState(false);

  return <context.Provider value={{ debug, setDebug }}>{children}</context.Provider>;
}

export function debug() {
  return use(context).debug;
}

export function useSetDebug() {
  return use(context).setDebug;
}
