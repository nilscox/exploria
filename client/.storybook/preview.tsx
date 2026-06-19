import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import type { Preview } from '@storybook/react-vite';
import { useEffect } from 'react';

import '../src/index.css';
import { messages } from '../src/locales/en/messages';

i18n.load('en', messages);
i18n.activate('en');

function IntlDecorator({ locale, children }: { locale: string; children: React.ReactNode }) {
  useEffect(() => {
    import(`../src/locales/${locale}/messages`)
      .then(({ messages }) => {
        i18n.load(locale, messages);
        i18n.activate(locale);
      })
      .catch(console.error);
  }, [locale]);

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}

export default {
  globalTypes: {
    locale: {
      description: 'Internationalization locale',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'en', right: '🇺🇸', title: 'English' },
          { value: 'fr', right: '🇫🇷', title: 'Français' },
        ],
      },
    },
  },
  initialGlobals: {
    locale: 'en',
  },
  parameters: {
    darkMode: {
      classTarget: 'html',
      stylePreview: true,
    },
  },
  decorators: [
    (Story, { globals }) => (
      <IntlDecorator locale={globals.locale}>
        <Story />
      </IntlDecorator>
    ),
  ],
} satisfies Preview;
