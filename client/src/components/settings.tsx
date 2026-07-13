import type { Shared } from '@exploria/server/shared';
import { Trans, useLingui } from '@lingui/react/macro';
import { useCallback, useEffect, useState } from 'react';

import { config, useSetConfig } from 'src/contexts/config';
import { setLanguage } from 'src/i18n';

import { Button } from './button';
import { DialogActions, DialogClose, DialogContent, DialogHeader } from './dialog';
import { Field, FieldLabel, FieldProvider } from './field';
import { Select, SelectItems } from './select';
import { Switch } from './switch';

export function SettingsDialog() {
  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <Trans>Settings</Trans>
      </DialogHeader>

      <div className="col gap-4 p-4">
        <LanguageSelector />
        <ThemeModeSelector />
        <ShowTimelineActions />
        <ShowTimelineDates />
        <DebugMode />
      </div>

      <DialogActions>
        <DialogClose
          render={
            <Button variant="ghost">
              <Trans>Close</Trans>
            </Button>
          }
        />
      </DialogActions>
    </DialogContent>
  );
}

export function LanguageSelector() {
  const { i18n } = useLingui();

  const items = {
    en: (
      <>
        <span className="me-2">🇺🇸</span>
        English
      </>
    ),
    fr: (
      <>
        <span className="me-2">🇫🇷</span>
        Français
      </>
    ),
  };

  return (
    <Field>
      <FieldLabel>
        <Trans>Language</Trans>
      </FieldLabel>

      <Select<Shared.Language>
        value={i18n.locale as Shared.Language}
        onValueChange={(lang) => lang !== null && setLanguage(i18n, lang).catch(console.error)}
        renderValue={(lang) => items[lang]}
      >
        <SelectItems items={items} />
      </Select>
    </Field>
  );
}

export function ThemeModeSelector() {
  const [theme, setTheme] = useTheme();

  const items = {
    light: (
      <>
        <span className="me-2 inline-block size-3 rounded-sm border bg-white" />
        <Trans>Light</Trans>
      </>
    ),
    dark: (
      <>
        <span className="me-2 inline-block size-3 rounded-sm border bg-black" />
        <Trans>Dark</Trans>
      </>
    ),
  };

  return (
    <Field>
      <FieldLabel>
        <Trans>Theme</Trans>
      </FieldLabel>

      <Select<'light' | 'dark'>
        value={theme}
        onValueChange={(theme) => theme !== null && setTheme(theme)}
        renderValue={(theme) => items[theme]}
      >
        <SelectItems items={items} />
      </Select>
    </Field>
  );
}

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const theme = localStorage.getItem('theme');

    if (theme && (theme === 'light' || theme === 'dark')) {
      return theme;
    }

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  });

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  return [
    theme,
    useCallback((theme: 'light' | 'dark') => {
      setTheme(theme);
      localStorage.setItem('theme', theme);
    }, []),
  ] as const;
}

function ShowTimelineActions() {
  const setConfig = useSetConfig();

  return (
    <FieldProvider>
      <div className="row my-1 gap-2">
        <Switch
          checked={config().showTimelineActions}
          onCheckedChange={(checked) => setConfig({ showTimelineActions: Boolean(checked) })}
        />
        <FieldLabel inline className="cursor-pointer">
          <Trans>Show timeline actions</Trans>
        </FieldLabel>
      </div>
    </FieldProvider>
  );
}

function ShowTimelineDates() {
  const setConfig = useSetConfig();

  return (
    <FieldProvider>
      <div className="row my-1 gap-2">
        <Switch
          checked={config().showTimelineDates}
          onCheckedChange={(checked) => setConfig({ showTimelineDates: Boolean(checked) })}
        />
        <FieldLabel inline className="cursor-pointer">
          <Trans>Show timeline dates</Trans>
        </FieldLabel>
      </div>
    </FieldProvider>
  );
}

function DebugMode() {
  const setConfig = useSetConfig();

  return (
    <FieldProvider>
      <div className="row my-1 gap-2">
        <Switch checked={config().debug} onCheckedChange={(checked) => setConfig({ debug: Boolean(checked) })} />
        <FieldLabel inline className="cursor-pointer">
          <Trans>Debug</Trans>
        </FieldLabel>
      </div>
    </FieldProvider>
  );
}
