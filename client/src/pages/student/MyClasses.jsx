import { useState } from 'react';
import useFetch from '../../lib/useFetch';
import { fmtDate, fmtDateTime, fmtTime, DAYS } from '../../lib/format';
import { Icon, Spinner, PageHeader, Tabs, Empty, Chip, ErrorBox } from '../../components/ui';
import { PackageCard } from '../../components/shared';

export default function MyClasses() {
  const [tab, setTab] = useState('schedule');
  const sessions = useFetch('/sessions?sort=desc');
  const pkgs = useFetch('/packages/mine');
  if ((sessions.loading && !sessions.data) || (pkgs.loading && !pkgs.data)) return <Spinner />;
  const all = sessions.data || [];
  const upcoming = all.filter((s) => s.status === 'scheduled' && new Date(s.date) >= new Date(Date.now() - 3600e3)).sort((a, b) => new Date(a.date) - new Date(b.date));
  const history = all.filter((s) => s.status !== 'scheduled');
  const marked = history.filter((s) => ['completed', 'absent'].includes(s.status));
  const pct = marked.length ? Math.round((marked.filter((s) => s.status === 'completed').length / marked.length) * 100) : null;
  const active = (pkgs.data || []).filter((p) => p.status === 'active');

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="My classes" subtitle="Your schedule, class balance and attendance" />
      <ErrorBox message={sessions.error || pkgs.error} />
      <Tabs value={tab} onChange={setTab} className="mb-4" tabs={[{ value: 'schedule', label: 'Schedule' }, { value: 'attendance', label: 'Attendance' }, { value: 'package', label: 'Packages' }]} />

      {tab === 'schedule' && (
        <div className="flex flex-col gap-4">
          {active.map((p) => p.schedule?.length > 0 && (
            <div key={p._id} className="card p-4 flex flex-wrap items-center gap-2 text-sm">
              <Icon name="repeat" className="text-primary" size={20} /><span className="font-semibold">{p.subject}:</span>
              {p.schedule.map((s, i) => <span key={i} className="chip bg-surface-container-high text-primary">{DAYS[s.day].slice(0, 3)} {s.time}</span>)}
            </div>
          ))}
          <div className="card divide-y divide-slate-100">
            {upcoming.length ? upcoming.map((s, i) => (
              <div key={s._id} className="p-4 flex items-center gap-4">
                <div className={`w-14 text-center rounded-lg py-2 shrink-0 ${i === 0 ? 'bg-primary-container text-white' : 'bg-surface-container-low'}`}>
                  <div className="text-[11px] font-bold uppercase">{new Date(s.date).toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                  <div className="font-bold">{new Date(s.date).getDate()}</div>
                  <div className="text-[10px]">{new Date(s.date).toLocaleDateString('en-GB', { month: 'short' })}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{s.subject}</div>
                  <div className="text-sm muted">{fmtTime(s.date)} · {s.durationMins} min</div>
                  {s.topic && <div className="text-xs text-on-surface-variant truncate">{s.topic}</div>}
                </div>
                {i === 0 && <span className="chip bg-surface-container-high text-primary">Next</span>}
              </div>
            )) : <Empty icon="event_available" title="No upcoming classes" />}
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[['Attendance', pct !== null ? `${pct}%` : '—', 'text-primary-container'], ['Present', history.filter((s) => s.status === 'completed').length, 'text-[#10b981]'],
              ['Absent', history.filter((s) => s.status === 'absent').length, 'text-error'], ['Cancelled / moved', history.filter((s) => ['cancelled', 'rescheduled'].includes(s.status)).length, 'text-[#f59e0b]']].map(([k, v, c]) => (
              <div key={k} className="card p-3"><div className="text-[11px] uppercase font-semibold muted">{k}</div><div className={`text-2xl font-bold ${c}`}>{v}</div></div>
            ))}
          </div>
          <div className="card divide-y divide-slate-100">
            {history.length ? history.map((s) => (
              <div key={s._id} className="p-3.5 flex items-center justify-between gap-3">
                <div><div className="font-medium">{s.subject}</div><div className="text-xs muted">{fmtDateTime(s.date)}</div>{s.topic && <div className="text-xs text-on-surface-variant">{s.topic}</div>}</div>
                <Chip status={s.status === 'completed' ? 'present' : s.status} />
              </div>
            )) : <Empty icon="history" title="No attendance yet" />}
          </div>
        </div>
      )}

      {tab === 'package' && (
        <div className="grid md:grid-cols-2 gap-4">
          {(pkgs.data || []).length ? pkgs.data.map((p) => <PackageCard key={p._id} pkg={p} compact link={false} />) : <div className="card md:col-span-2"><Empty icon="inventory_2" title="No packages yet" /></div>}
        </div>
      )}
      {tab === 'package' && (pkgs.data || []).some((p) => p.expiryDate) && <p className="text-xs muted mt-3">Packages are valid until the expiry date shown. Contact your tutor to renew. Last updated {fmtDate(new Date())}.</p>}
    </div>
  );
}
