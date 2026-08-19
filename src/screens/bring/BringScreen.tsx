// PLACEHOLDER — implemented in a later item (FABLE-REDESIGN.md §4.4C).
// Replaces the old ImportScreen at route `#/bring` after the IA collapse.
import React from 'react';
import { useT } from '../../i18n';
import { EmptyState } from '../../ui';
import { navigate } from '../../router';

export default function BringScreen() {
  const t = useT();
  return (
    <div className="col-read">
      <EmptyState
        title="Bring a piece of your work"
        body="Coming in a later item — paste, drop, pick a discipline chip, an occasion, and start reading."
        action={<button onClick={() => navigate('today')}>{t('common.action.back')}</button>}
      />
    </div>
  );
}