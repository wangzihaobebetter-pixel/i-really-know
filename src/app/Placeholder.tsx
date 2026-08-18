import React from 'react';
import { Sheet, Tag } from '../ui';

/**
 * WP0 ships every route as a working placeholder so the shell is navigable from
 * minute 0 and each package can drop its real screen in at the same file path
 * without touching App.tsx (§8, "Rule that makes parallelism safe").
 */
export function Placeholder({ screen, owner, does }: { screen: string; owner: string; does: string }) {
  return (
    <div className="col-read stack">
      <div className="row wrap" style={{ gap: 'var(--space-3)' }}>
        <h1 className="t-display-2">{screen}</h1>
        <Tag tone="action" mono>{owner}</Tag>
      </div>
      <Sheet elevation={1}>
        <p className="t-body ink-2 measure">{does}</p>
        <p className="t-small ink-3" style={{ marginTop: 'var(--space-5)' }}>
          Shell, tokens, store and primitives are live — this screen is the next thing to land.
        </p>
      </Sheet>
    </div>
  );
}
