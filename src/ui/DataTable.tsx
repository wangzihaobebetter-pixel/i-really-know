import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface Column<R> {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'right';
  value?: (row: R) => string | number;
  render?: (row: R) => React.ReactNode;
}

export function DataTable<R extends { id: string }>({
  columns, rows, stickyHeader, empty, onRowClick,
}: {
  columns: Column<R>[]; rows: R[]; stickyHeader?: boolean;
  empty?: React.ReactNode; onRowClick?: (row: R) => void;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.value) return rows;
    return [...rows].sort((a, b) => {
      const av = col.value!(a), bv = col.value!(b);
      return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir;
    });
  }, [rows, sort, columns]);

  if (!rows.length && empty) return <>{empty}</>;

  return (
    <div className="dt-wrap">
      <table className={`dt${stickyHeader ? ' sticky' : ''}`}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width, textAlign: c.align ?? 'left' }}>
                {c.sortable ? (
                  <button
                    className="dt-sort"
                    onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))}
                  >
                    {c.header}
                    {sort?.key === c.key && (sort.dir === 1 ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </button>
                ) : c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.id} onClick={() => onRowClick?.(row)} style={{ cursor: onRowClick ? 'pointer' : undefined }}>
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align ?? 'left' }}>
                  {c.render ? c.render(row) : String(c.value?.(row) ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
