import React from 'react';
import { SettingsScreen } from '@a5c-ai/agent-mux-ui';

import { useGatewayAuth } from '../providers/GatewayProvider.js';
import { useThemeMode } from '../providers/ThemeProvider.js';

export function SettingsPage(): JSX.Element {
  const { auth, logout } = useGatewayAuth();
  const { mode, toggle } = useThemeMode();
  return (
    <section className="panel">
      <header><h2>Settings</h2></header>
      <SettingsScreen />
      <div className="settings-grid">
        <div>
          <strong>Gateway</strong>
          <p>{auth?.gatewayUrl ?? 'not connected'}</p>
        </div>
        <div>
          <strong>Theme</strong>
          <button onClick={toggle}>Toggle to {mode === 'light' ? 'dark' : 'light'}</button>
        </div>
        <div>
          <strong>Token</strong>
          <button onClick={logout}>Forget saved token</button>
        </div>
      </div>
    </section>
  );
}
