import type { Shared } from '@exploria/server/shared';
import { Trans, useLingui } from '@lingui/react/macro';
import { SettingsIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

import { debug, useSetDebug } from 'src/debug-context';
import { setLanguage } from 'src/i18n/i18n';

import { Button } from './button';
import { Checkbox } from './checkbox';
import { Dialog } from './dialog';
import { Field, FieldLabel } from './field';
import { Select, SelectItem } from './select';

export function Settings() {
  const [dialog, setDialog] = useState<HTMLElement | null>(null);

  return (
    <>
      <Button variant="ghost" size="icon" popoverTarget="settings-dialog">
        <SettingsIcon className="size-4" />
      </Button>

      <Dialog ref={setDialog} id="settings-dialog" popover="" classes={{ content: 'max-w-md col gap-4' }}>
        <header className="text-lg font-semibold">
          <Trans>Settings</Trans>
        </header>

        <LanguageSelector dialog={dialog} />
        <ThemeModeSelector dialog={dialog} />
        <DebugMode />

        <div className="row justify-end gap-2">
          <Button variant="ghost" popoverTarget="settings-dialog" popoverTargetAction="hide">
            <Trans>Close</Trans>
          </Button>
        </div>
      </Dialog>
    </>
  );
}

export function LanguageSelector({ dialog }: { dialog: HTMLElement | null }) {
  const { i18n } = useLingui();

  const handleChange = (lang: string) => {
    setLanguage(i18n, lang as Shared.Language).catch(console.error);
  };

  return (
    <Field>
      <FieldLabel>
        <Trans>Language</Trans>
      </FieldLabel>

      <Select container={dialog} value={i18n.locale} onValueChange={handleChange}>
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

export function ThemeModeSelector({ dialog }: { dialog: HTMLElement | null }) {
  const [theme, setTheme] = useTheme();

  return (
    <Field>
      <FieldLabel>
        <Trans>Theme</Trans>
      </FieldLabel>

      <Select container={dialog} value={theme} onValueChange={setTheme}>
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
