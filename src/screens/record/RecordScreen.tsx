import React from 'react';
import { useStore } from '../../store';
import { getPack } from '../../packs';
import { useNavigate } from '../../router';
import { useT, useLang } from '../../i18n';
import { Button, DataTable, EmptyState, Mark, Tag } from '../../ui';
import type { Column } from '../../ui';
import { formatDate } from '../../lib/session-ops';
import type { Session } from '../../types';

export default function RecordScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const sessions = useStore((s) => s.sessions.filter((x) => x.mode !== 'class'));

  const columns: Column<Session>[] = [
    {
      key: 'title', header: t('record.colTitle'), sortable: true,
      value: (r) => r.title,
      render: (r) => (
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          <span className="t-body-strong">{r.title}</span>
          {r.mode === 'sample' && <Tag>sample</Tag>}
        </div>
      ),
    },
    {
      key: 'pack', header: t('record.colPack'), width: '7rem',
      value: (r) => getPack(r.packId).shortName,
      render: (r) => <Tag mono>{getPack(r.packId).shortName}</Tag>,
    },
    {
      key: 'when', header: t('record.colWhen'), width: '9rem', sortable: true,
      value: (r) => r.createdAt,
      render: (r) => <span className="t-small ink-3">{formatDate(r.createdAt, lang)}</span>,
    },
    {
      key: 'index', header: t('record.colIndex'), width: '7rem', align: 'right', sortable: true,
      value: (r) => r.ownershipIndex ?? -1,
      render: (r) => <span className="t-num">{r.ownershipIndex ?? '—'}</span>,
    },
    {
      key: 'status', header: t('record.colStatus'), width: '7rem',
      value: (r) => r.status,
      render: (r) =>
        r.status === 'complete'
          ? <Mark verdict="owned" showWord={false} size={14} />
          : <span className="t-small ink-3">{r.status}</span>,
    },
  ];

  return (
    <div className="col-data stack">
      <header className="stack-tight">
        <h1 className="t-display-2">{t('record.title')}</h1>
        <p className="t-small ink-3">{t('record.subtitle')}</p>
      </header>

      <DataTable
        columns={columns}
        rows={sessions}
        stickyHeader
        onRowClick={(r) => nav(r.status === 'complete' ? 'map' : 'run', { sessionId: r.id })}
        empty={
          <EmptyState
            title={t('record.empty')}
            action={<Button variant="primary" onClick={() => nav('import')}>{t('record.emptyAction')}</Button>}
          />
        }
      />
    </div>
  );
}
