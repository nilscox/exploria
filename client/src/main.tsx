import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';

import './index.css';

import { Home } from './home';
import { messages } from './i18n/en/messages';
import { getPreferredLanguage, setLanguage } from './i18n/i18n';
import { SessionPage } from './session/session';

i18n.load('en', messages);
i18n.activate('en');

setLanguage(i18n, getPreferredLanguage()).catch(console.error);

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      onError(error) {
        console.log(error);
      },
    },
  },
  queryCache: new QueryCache({
    onError(error) {
      console.log(error.message);
    },
  }),
});

function App() {
  return (
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/session/:sessionId" element={<SessionPage />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </I18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
