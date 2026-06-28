import { createContext, use, useCallback, useState } from 'react';

type Config = {
  showTimelineActions: boolean;
  showTimelineDates: boolean;
  debug: boolean;
};

const context = createContext<{ config: Config; setConfig: (config: Partial<Config>) => void }>(null as never);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<Config>({ showTimelineActions: true, showTimelineDates: false, debug: false });

  const setConfigPartial = useCallback((config: Partial<Config>) => {
    setConfig((current) => ({ ...current, ...config }));
  }, []);

  return <context.Provider value={{ config, setConfig: setConfigPartial }}>{children}</context.Provider>;
}

export function config() {
  return use(context).config;
}

export function useSetConfig() {
  return use(context).setConfig;
}
