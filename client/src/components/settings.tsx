import type { Shared } from '@exploria/server/shared';
import { Trans, useLingui } from '@lingui/react/macro';
import { SettingsIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

import { debug, useSetDebug } from 'src/debug-context';
import { setLanguage } from 'src/i18n/i18n';

import { Button } from './button';
import { Checkbox } from './checkbox';
import { Dialog, DialogActions, DialogClose, DialogContent, DialogHeader, DialogTrigger } from './dialog';
import { Field, FieldLabel } from './field';
import { Select, SelectItem } from './select';

export function Settings() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon">
            <SettingsIcon className="size-4" />
          </Button>
        }
      />

      <DialogContent className="max-w-md">
        <DialogHeader>
          <Trans>Settings</Trans>
        </DialogHeader>

        <div className="col gap-4 p-4">
          <LanguageSelector />
          <ThemeModeSelector />
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
    </Dialog>
  );
}

export function LanguageSelector() {
  const { i18n } = useLingui();

  const handleChange = (lang: string) => {
    setLanguage(i18n, lang as Shared.Language).catch(console.error);
  };

  return (
    <Field>
      <FieldLabel>
        <Trans>Language</Trans>
      </FieldLabel>

      <Select value={i18n.locale} onValueChange={handleChange}>
        <SelectItem value="en">
          <span className="me-2">🇺🇸</span>
          English
        </SelectItem>
        <SelectItem value="fr">
          <span className="me-2">🇫🇷</span>
          Français
        </SelectItem>
      </Select>
    </Field>
  );
}

export function ThemeModeSelector() {
  const [theme, setTheme] = useTheme();

  return (
    <Field>
      <FieldLabel>
        <Trans>Theme</Trans>
      </FieldLabel>

      <Select value={theme} onValueChange={setTheme}>
        <SelectItem value="light">
          <span className="me-2 inline-block size-3 rounded-sm border bg-white" />
          <Trans>Light</Trans>
        </SelectItem>
        <SelectItem value="dark">
          <span className="me-2 inline-block size-3 rounded-sm border bg-black" />
          <Trans>Dark</Trans>
        </SelectItem>
      </Select>
    </Field>
  );
}

function useTheme() {
  const [searchParams] = useSearchParams();
  const themeSearchParam = searchParams.get('theme');

  const [theme, setTheme] = useState(() => {
    const theme = themeSearchParam ?? localStorage.getItem('theme');

    if (theme && ['light', 'dark'].includes(theme)) {
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

function DebugMode() {
  const setDebug = useSetDebug();

  return (
    <Field>
      <Checkbox defaultChecked={debug()} onCheckedChange={setDebug} label={<Trans>Debug</Trans>} />
    </Field>
  );
}
