import React, { useMemo, useState } from 'react';

export interface CommandPaletteAction {
  id: string;
  label: string;
  run(): void;
}

export function CommandPalette(props: {
  actions: CommandPaletteAction[];
  open: boolean;
  onClose(): void;
}): JSX.Element | null {
  const [query, setQuery] = useState('');
  const visibleActions = useMemo(
    () => props.actions.filter((action) => action.label.toLowerCase().includes(query.toLowerCase())),
    [props.actions, query],
  );

  if (!props.open) {
    return null;
  }

  return (
    <div className="palette-backdrop" onClick={props.onClose}>
      <div className="palette" onClick={(event) => event.stopPropagation()}>
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Jump, toggle, start…" />
        <div className="palette-list">
          {visibleActions.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                action.run();
                props.onClose();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
