import React, { useRef, useState } from 'react';
import { UserRound } from 'lucide-react';
import { selectCohort, selectHasKey, useStore } from '../../store';
import { getPack } from '../../packs';
import { useNavigate, useRoute } from '../../router';
import { useLang, useT } from '../../i18n';
import { Button, Callout, Input, Sheet, Spinner, Textarea, useToast } from '../../ui';
import { PRESET_COUNTS } from '../../store/presets';
import { generate, describeError } from '../../lib/llm';
import { detectMaterialKind, titleFromMaterial } from '../../lib/analysis';
import { id, now } from '../../lib/ids';
import { parseRosterCsv, rosterTemplate } from '../../lib/csv';
import { createStudentTicket, studentLink } from '../../lib/student-links';
import type { Session, StudentTicket, Submission } from '../../types';

const MAX_COHORT_SUBMISSIONS = 250;

export default function CohortScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const toast = useToast();
  const cohortId = useRoute().params.cohortId;
  const cohort = useStore(selectCohort(cohortId));
  const settings = useStore((state) => state.settings);
  const hasKey = useStore(selectHasKey);
  const sessions = useStore((state) => state.sessions);
  const updateCohort = useStore((state) => state.updateCohort);
  const updateSubmission = useStore((state) => state.updateSubmission);
  const upsertSession = useStore((state) => state.upsertSession);

  const [draft, setDraft] = useState('');
  const [label, setLabel] = useState('');
  const [studentName, setStudentName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [share, setShare] = useState('');
  const csvRef = useRef<HTMLInputElement>(null);

  if (!cohort) {
    return <div className="col-read"><Callout tone="danger" title={t('common.state.notfound.title')}><Button onClick={() => nav('class')}>{t('common.action.back')}</Button></Callout></div>;
  }

  const currentCohort = cohort;
  const pack = getPack(currentCohort.packId);
  const statusLabel = (status: Submission['status']) => t(`class.status.${status}`);

  function addSubmission() {
    if (!draft.trim()) return;
    if (currentCohort.submissions.length >= MAX_COHORT_SUBMISSIONS) {
      toast.push(t('teacher4.cohortFull'), { tone: 'neutral' });
      return;
    }
    const submission: Submission = {
      id: id('sub'),
      label: label.trim() || titleFromMaterial(draft),
      studentName: studentName.trim() || undefined,
      material: draft.trim(),
      materialKind: detectMaterialKind(draft),
      status: 'pending',
    };
    updateCohort(currentCohort.id, { submissions: [...currentCohort.submissions, submission] });
    setDraft('');
    setLabel('');
    setStudentName('');
  }

  async function importCsv(file: File | undefined) {
    if (!file) return;
    if (file.size > 10_000_000) {
      toast.push(t('teacher4.csvTooLarge'), { tone: 'neutral' });
      return;
    }
    const parsed = parseRosterCsv(await file.text());
    const available = Math.max(0, MAX_COHORT_SUBMISSIONS - currentCohort.submissions.length);
    const accepted = parsed.rows.slice(0, available);
    const overflow = parsed.rows.length - accepted.length;
    const additions: Submission[] = accepted.map((row) => ({
      id: id('sub'),
      label: row.title,
      studentName: row.name,
      studentRef: row.studentId,
      material: row.material,
      materialKind: detectMaterialKind(row.material),
      status: 'pending',
    }));
    updateCohort(currentCohort.id, { submissions: [...currentCohort.submissions, ...additions] });
    toast.push(t('teacher4.imported', { n: additions.length }), { tone: 'neutral' });
    if (parsed.skipped + overflow) toast.push(t('teacher4.skipped', { n: parsed.skipped + overflow }), { tone: 'neutral' });
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([rosterTemplate()], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'i-really-know-roster-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function generateAll() {
    if (!hasKey) return;
    setBusy(true);
    setError('');
    for (const submission of currentCohort.submissions) {
      if (submission.status === 'ready') continue;
      updateSubmission(currentCohort.id, submission.id, { status: 'generating', error: undefined });
      const session: Session = {
        id: id('s'),
        title: submission.label,
        packId: currentCohort.packId,
        material: submission.material,
        materialKind: submission.materialKind,
        createdAt: now(),
        status: 'generating',
        mode: 'class',
        preset: currentCohort.preset,
        difficulty: currentCohort.difficulty,
        occasion: currentCohort.occasion,
        occasionAt: currentCohort.occasionAt,
        probes: [],
        fragilities: [],
        cohortId: currentCohort.id,
        submissionId: submission.id,
      };
      try {
        const result = await generate(settings, session, PRESET_COUNTS[currentCohort.preset], currentCohort.difficulty, lang);
        upsertSession({ ...session, probes: result.probes, fragilities: result.fragilities, status: 'ready' });
        updateSubmission(currentCohort.id, submission.id, { status: 'ready', sessionId: session.id });
      } catch (caught) {
        updateSubmission(currentCohort.id, submission.id, { status: 'error', error: describeError(caught) });
      }
    }
    setBusy(false);
  }

  async function copyShareLink(submission: Submission, session: Session) {
    const cleanSession: Session = {
      ...session,
      occasion: session.occasion ?? currentCohort.occasion,
      occasionAt: session.occasionAt ?? currentCohort.occasionAt,
      probes: session.probes.map((probe) => ({
        ...probe,
        answer: undefined,
        answerMode: undefined,
        committedAt: undefined,
        timeUsedSec: undefined,
        selfGrade: undefined,
        manualScore: undefined,
        ai: undefined,
        divergence: undefined,
      })),
    };
    const ticket: StudentTicket = createStudentTicket({ v: 2, kind: 'student', cohortId: currentCohort.id, submissionId: submission.id, session: cleanSession });
    const link = await studentLink(ticket);
    setShare(link);
    try {
      await navigator.clipboard.writeText(link);
      toast.push(t('teacher4.linkReady'), { tone: 'neutral' });
    } catch {
      // The visible, selectable link below is the permission-safe fallback.
    }
  }

  return (
    <div className="col-wide stack teacher-workspace page-enter">
      <header className="row-between wrap" style={{ gap: 'var(--space-4)' }}>
        <div className="stack-nano"><span className="t-micro ink-3">{pack.name}</span><h1 className="t-display-2">{currentCohort.name}</h1><p className="t-small ink-2">{currentCohort.occasion} · {currentCohort.occasionAt ? new Date(currentCohort.occasionAt).toLocaleDateString(lang) : ''}</p></div>
        <Button variant="ghost" onClick={() => nav('class')}>{t('common.action.back')}</Button>
      </header>

      <Callout tone="neutral">{t('teacher4.local')}</Callout>
      {!hasKey && <Callout tone="action">{t('class.needKey')}</Callout>}

      <section className="teacher-toolbar stack-tight">
        <div className="row wrap">
          <Button variant="secondary" onClick={() => csvRef.current?.click()}>{t('teacher4.csv')}</Button>
          <Button variant="ghost" onClick={downloadTemplate}>{t('teacher4.template')}</Button>
        </div>
        <p className="t-small ink-3">{t('teacher4.csvHint')}</p>
        <input ref={csvRef} className="visually-hidden" type="file" accept=".csv,text/csv" onChange={(event) => { void importCsv(event.target.files?.[0]); event.target.value = ''; }} />
      </section>

      <Sheet elevation={1}>
        <div className="stack-tight">
          <div className="two-col">
            <Input label={t('teacher4.studentName')} maxLength={200} value={studentName} onChange={(event) => setStudentName(event.target.value)} />
            <Input label={t('teacher4.pieceName')} maxLength={200} value={label} onChange={(event) => setLabel(event.target.value)} />
          </div>
          <Textarea label={t('teacher4.submissionMaterial')} maxLength={50_000} value={draft} onChange={(event) => setDraft(event.target.value)} rows={5} mono />
          <Button variant="secondary" onClick={addSubmission} disabled={!draft.trim() || currentCohort.submissions.length >= MAX_COHORT_SUBMISSIONS}>{t('class.addSubmission')}</Button>
        </div>
      </Sheet>

      <section className="stack-tight">
        <div className="row-between wrap" style={{ gap: 'var(--space-3)' }}>
          <h2 className="t-title">{t('class.submissions')} · {currentCohort.submissions.length}</h2>
          <div className="row wrap">
            <Button variant="secondary" onClick={generateAll} disabled={busy || !hasKey || !currentCohort.submissions.length}>{t('class.generateAll')}</Button>
            <Button variant="primary" onClick={() => nav('reteach', { cohortId: currentCohort.id })}>{t('reteach.title')}</Button>
          </div>
        </div>
        {busy && <Spinner label={t('common.state.loading')} />}
        {error && <Callout tone="danger">{error}</Callout>}
        <div className="teacher-list">
          {currentCohort.submissions.map((submission) => {
            const session = sessions.find((item) => item.id === submission.sessionId);
            return (
              <div className="teacher-row" key={submission.id}>
                <span className="teacher-avatar"><UserRound size={18} /></span>
                <div className="minw0 grow stack-nano"><strong className="truncate">{submission.studentName || submission.label}</strong><span className="t-small ink-3 truncate">{submission.studentName ? submission.label : submission.studentRef || ''} · {submission.result ? t(submission.resultReview === 'reviewed' ? 'teacher4.reviewed' : 'teacher4.reviewNeeded') : statusLabel(submission.status)}</span>{submission.error && <span className="t-small ink-undefended">{submission.error}</span>}</div>
                <div className="row wrap teacher-row-actions">
                  <Button size="sm" variant="ghost" disabled={!session} onClick={() => session && void copyShareLink(submission, session)}>{t('teacher4.copyLink')}</Button>
                  <Button size="sm" variant="secondary" disabled={!session} onClick={() => nav('studentSheet', { cohortId: currentCohort.id, submissionId: submission.id })}>{t('class.openSheet')}</Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {share && (
        <Sheet elevation={1} className="share-fallback">
          <div className="stack-tight"><h2 className="t-title">{t('teacher4.linkTitle')}</h2><p className="t-small ink-2">{t('teacher4.linkHint')}</p><textarea className="control" rows={4} readOnly value={share} onFocus={(event) => event.currentTarget.select()} /></div>
        </Sheet>
      )}
    </div>
  );
}
