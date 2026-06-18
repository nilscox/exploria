import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';

import { Home } from './home';
import './index.css';
import { SessionPage } from './session';

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

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={client}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/session/:sessionId" element={<SessionPage />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>,
);
