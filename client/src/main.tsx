import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import toast, { Toaster } from 'react-hot-toast';

import './index.css';

import { BrowserRouter, Route, Routes } from 'react-router';

import { LoginPage } from './auth/login';
import { ConfigProvider } from './config-context';
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
        console.error(error);
        toast.error(error.message);
      },
    },
  },
  queryCache: new QueryCache({
    onError(error) {
      console.error(error.message);
      toast.error(error.message);
    },
  }),
});

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('💥 Error caught:', error);
    console.error('📍 Component stack:', info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <pre className="mt-2 text-sm whitespace-pre-wrap">{this.state.error.stack}</pre>;
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <I18nProvider i18n={i18n}>
        <QueryClientProvider client={client}>
          <ConfigProvider>
            <Toaster position="top-right" />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/session/:sessionId" element={<SessionPage />} />
              </Routes>
            </BrowserRouter>
          </ConfigProvider>
        </QueryClientProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!, {
  onCaughtError: console.error,
  onUncaughtError: console.error,
}).render(<App />);
