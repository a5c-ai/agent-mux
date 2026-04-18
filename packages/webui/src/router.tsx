import React, { useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { HomePage } from './pages/HomePage.js';
import { LoginPage } from './pages/LoginPage.js';
import { AgentsPage } from './pages/AgentsPage.js';
import { SessionsPage } from './pages/SessionsPage.js';
import { SessionDetailPage } from './pages/SessionDetailPage.js';
import { RunPage } from './pages/RunPage.js';
import { NewRunPage } from './pages/NewRunPage.js';
import { HookInboxPage } from './pages/HookInboxPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { PairDevicePage } from './pages/PairDevicePage.js';
import { useGatewayAuth } from './providers/GatewayProvider.js';
import { useThemeMode } from './providers/ThemeProvider.js';
import { CommandPalette } from './shell/CommandPalette.js';
import { Sidebar } from './shell/Sidebar.js';
import { TopBar } from './shell/TopBar.js';
import { bindGlobalHotkeys } from './web-only/keyboard.js';

function LegacySessionRouteRedirect(): JSX.Element {
  const location = useLocation();
  const match = location.pathname.match(/^\/sessions\/[^/]+\/([^/?#]+)/);
  const sessionId = match?.[1];
  return <Navigate to={sessionId ? `/sessions/${sessionId}${location.search}` : '/sessions'} replace />;
}

function RequireAuth(props: { children: React.ReactNode }): JSX.Element {
  const { isAuthenticated } = useGatewayAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{props.children}</>;
}

function AppChrome(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useGatewayAuth();
  const { mode, toggle } = useThemeMode();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const actions = useMemo(
    () => [
      { id: 'home', label: 'Open session dashboard', run: () => navigate('/') },
      { id: 'new-session', label: 'Start session', run: () => navigate('/sessions/new') },
      { id: 'sessions', label: 'Browse sessions', run: () => navigate('/sessions') },
      { id: 'inbox', label: 'Open hook inbox', run: () => navigate('/inbox') },
      { id: 'pair', label: 'Pair device', run: () => navigate('/pair-device') },
      { id: 'theme', label: `Switch to ${mode === 'light' ? 'dark' : 'light'} theme`, run: () => toggle() },
      { id: 'logout', label: 'Forget token', run: () => logout() },
    ],
    [logout, mode, navigate, toggle],
  );

  React.useEffect(() => bindGlobalHotkeys({ openPalette: () => setPaletteOpen(true) }), []);

  return (
    <div className="webui-shell">
      <Sidebar />
      <div className="webui-main">
        <TopBar pathname={location.pathname} onOpenPalette={() => setPaletteOpen(true)} />
        <div className="webui-page">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/sessions/new" element={<NewRunPage />} />
            <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
            <Route path="/sessions/:agent/:sessionId" element={<LegacySessionRouteRedirect />} />
            <Route path="/runs/new" element={<NewRunPage />} />
            <Route path="/runs/:runId" element={<RunPage />} />
            <Route path="/inbox" element={<HookInboxPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/pair-device" element={<PairDevicePage />} />
          </Routes>
        </div>
      </div>
      <CommandPalette actions={actions} open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <nav className="webui-rail">
        <NavLink to="/">Sessions</NavLink>
        <NavLink to="/agents">Agents</NavLink>
        <NavLink to="/sessions">Sessions</NavLink>
        <NavLink to="/sessions/new">New Session</NavLink>
        <NavLink to="/inbox">Inbox</NavLink>
      </nav>
    </div>
  );
}

export function AppRouter(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="*"
        element={
          <RequireAuth>
            <AppChrome />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
