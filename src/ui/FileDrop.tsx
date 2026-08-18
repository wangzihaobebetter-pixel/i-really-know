import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

export function FileDrop({ accept, multiple, onFiles, hint, label }: {
  accept: string[]; multiple?: boolean; onFiles: (files: File[]) => void;
  hint?: string; label: string;
}) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  return (
    <div
      className="filedrop" data-over={over} role="button" tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setOver(false);
        const files = Array.from(e.dataTransfer.files ?? []);
        if (files.length) onFiles(multiple ? files : files.slice(0, 1));
      }}
    >
      <input
        ref={input} type="file" accept={accept.join(',')} multiple={multiple}
        className="visually-hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = '';
        }}
      />
      <Upload size={20} strokeWidth={1.75} style={{ margin: '0 auto var(--space-3)' }} aria-hidden />
      <div className="t-body">{label}</div>
      {hint && <div className="t-small ink-3" style={{ marginTop: 'var(--space-2)' }}>{hint}</div>}
    </div>
  );
}
