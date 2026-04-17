import React, { useEffect, useRef } from 'react';
import { useHookRequests } from '@a5c-ai/agent-mux-ui';
import { useNavigate } from 'react-router-dom';

import { requestDesktopNotificationPermission, showDesktopHookNotification } from '../web-only/desktop-notifications.js';
import { useGatewayAuth } from './GatewayProvider.js';

function NotificationBridge(): null {
  const navigate = useNavigate();
  const hooks = useHookRequests();
  const seenRef = useRef(new Set<string>());

  useEffect(() => {
    void requestDesktopNotificationPermission();
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      return;
    }

    for (const hook of hooks) {
      if (seenRef.current.has(hook.hookRequestId)) {
        continue;
      }
      seenRef.current.add(hook.hookRequestId);
      showDesktopHookNotification({
        title: 'agent-mux hook approval',
        body: `${hook.hookKind} requires attention`,
        onClick: () => navigate('/inbox'),
      });
    }
  }, [hooks, navigate]);

  return null;
}

export function NotificationProvider(props: { children: React.ReactNode }): JSX.Element {
  const { isAuthenticated } = useGatewayAuth();
  return (
    <>
      {isAuthenticated ? <NotificationBridge /> : null}
      {props.children}
    </>
  );
}
