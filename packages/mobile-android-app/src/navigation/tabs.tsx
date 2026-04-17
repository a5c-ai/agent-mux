export type HomeTabId = 'runs' | 'sessions' | 'agents' | 'inbox' | 'settings';

export const HOME_TABS: ReadonlyArray<{ id: HomeTabId; label: string }> = [
  { id: 'runs', label: 'Runs' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'agents', label: 'Agents' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'settings', label: 'Settings' },
];
