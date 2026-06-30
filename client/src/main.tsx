import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Component, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import toast, { Toaster } from 'react-hot-toast';

import './index.css';

import { createBrowserRouter, Outlet, RouterProvider } from 'react-router';

import { options } from './api';
import { LoginPage } from './auth/login';
import { Spinner } from './components/spinner';
import { AnalyticsProvider } from './contexts/analytics';
import { ConfigProvider } from './contexts/config';
import { Home } from './home';
import { getPreferredLanguage, setLanguage } from './i18n/i18n';
import { CreateSession } from './session/create/create-session';
import { SessionPage } from './session/session';

const queryClient = new QueryClient({
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

class ErrorBoundary extends Component<{}, { error: Error | null }> {
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

    return <Outlet />;
  }
}

function Providers() {
  return (
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider>
          <AnalyticsProvider>
            <Toaster position="top-right" />
            <Outlet />
          </AnalyticsProvider>
        </ConfigProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}

function Loading() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShow(true), 200);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!show) {
    return null;
  }

  return (
    <div className="grid h-full place-items-center">
      <Spinner className="size-8" />
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    ErrorBoundary,
    Component: Providers,
    HydrateFallback: Loading,
    async loader() {
      await Promise.all([
        //
        setLanguage(i18n, getPreferredLanguage()),
        queryClient.ensureQueryData(options.auth.me()),
      ]);
    },
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'auth/login',
        element: <LoginPage />,
      },
      {
        path: 'session',
        element: <CreateSession />,
        async loader() {
          await queryClient.ensureInfiniteQueryData(options.sessions.list());
        },
      },
      {
        path: 'session/:sessionId',
        element: <SessionPage />,
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />);
