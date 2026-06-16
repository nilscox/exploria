import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';

import { Home } from './home';
import './index.css';
import { SessionPage } from './session';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/session/:sessionId" element={<SessionPage />} />
    </Routes>
  </BrowserRouter>,
);
