import useFetch from '../../lib/useFetch';
import { fmtDate } from '../../lib/format';
import { Icon, Spinner, PageHeader, Empty, SectionCard, LineChart, ErrorBox, FileChip } from '../../components/ui';

export default function Results() {
  const { data, loading, error } = useFetch('/tests');
  if (loading && !data) return <Spinner />;
  const tests = data || [];
  const graded = tests.filter((t) => t.result && t.result.marks !== undefined && t.result.marks !== null);
  const upcoming = tests.filter((t) => !t.result && t.date && new Date(t.date) >= new Date(new Date().toDateString()));
  const avg = graded.length ? Math.round(graded.reduce((a, t) => a + (t.result.marks / t.maxMarks) * 100, 0) / graded.length) : null;
  const best = graded.reduce((b, t) => Math.max(b, (t.result.marks / t.maxMarks) * 100), 0);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-5">
      <PageHeader title="Results & performance" subtitle="Test marks, tutor feedback and your progress" />
      <ErrorBox message={error} />
      <div className="grid grid-cols-3 gap-3">
        {[['Average', avg !== null ? `${avg}%` : '—'], ['Best', graded.length ? `${Math.round(best)}%` : '—'], ['Tests taken', graded.length]].map(([k, v]) => (
          <div key={k} className="card p-3 sm:p-4"><div className="text-[11px] uppercase font-semibold muted">{k}</div><div className="text-xl sm:text-2xl font-bold text-primary-container">{v}</div></div>
        ))}
      </div>
      <SectionCard title="Progress" icon="monitoring">
        <LineChart points={[...graded].sort((a, b) => new Date(a.date) - new Date(b.date)).map((t) => ({ label: t.name, value: (t.result.marks / t.maxMarks) * 100 }))} />
      </SectionCard>
      {upcoming.length > 0 && (
        <SectionCard title="Upcoming tests" icon="event_upcoming">
          {upcoming.map((t) => (
            <div key={t._id} className="rounded-lg bg-surface-container-low p-3 flex justify-between gap-2">
              <div><div className="font-semibold">{t.name}</div><div className="text-xs muted">{t.subject}{t.syllabus ? ` · ${t.syllabus}` : ''}</div></div>
              <div className="text-right text-sm"><div className="font-semibold">{fmtDate(t.date)}</div><div className="text-xs muted">{t.maxMarks} marks</div></div>
            </div>
          ))}
        </SectionCard>
      )}
      <SectionCard title="All results" icon="military_tech">
        {graded.length ? [...graded].reverse().map((t) => {
          const pct = Math.round((t.result.marks / t.maxMarks) * 100);
          return (
            <div key={t._id} className="rounded-lg border border-slate-100 p-3">
              <div className="flex justify-between gap-3">
                <div><div className="font-semibold">{t.name}</div><div className="text-xs muted">{t.subject} · {fmtDate(t.date)}</div></div>
                <div className="text-right"><div className="font-bold text-lg">{t.result.marks}<span className="text-sm muted">/{t.maxMarks}</span></div>
                  <div className={`text-xs font-semibold ${pct >= 75 ? 'text-tertiary-container' : pct >= 50 ? 'text-secondary' : 'text-error'}`}>{pct}%</div></div>
              </div>
              {t.result.feedback && <div className="mt-2 text-sm bg-surface-container-low rounded-md p-2"><Icon name="chat_bubble" size={14} className="text-primary" /> {t.result.feedback}</div>}
              {t.result.answerSheet && <div className="mt-2"><FileChip file={t.result.answerSheet} /></div>}
            </div>
          );
        }) : <Empty icon="quiz" title="No results yet" />}
      </SectionCard>
    </div>
  );
}
