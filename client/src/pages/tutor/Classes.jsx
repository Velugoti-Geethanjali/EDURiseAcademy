import { useMemo, useState } from 'react';
import useFetch from '../../lib/useFetch';
import { fmtDate, fmtTime, isSameDay } from '../../lib/format';
import { Icon, Spinner, PageHeader, Tabs, Empty, Chip, ErrorBox } from '../../components/ui';
import { CompleteClassModal, SessionActionModal, SessionRow, ScheduleClassModal } from '../../components/shared';

const startOfWeek = (d) => { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; };
const SUBJECT_COLORS = ['#4f46e5', '#f59e0b', '#10b981', '#0ea5e9', '#db2777', '#7c3aed'];
const colorFor = (s = '') => SUBJECT_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % SUBJECT_COLORS.length];

export default function Classes() {
  const [view, setView] = useState('week');
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [filter, setFilter] = useState('');
  const weekEnd = useMemo(() => { const e = new Date(weekStart); e.setDate(e.getDate() + 7); return e; }, [weekStart]);
  const url = view === 'week'
    ? `/sessions?from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}`
    : `/sessions?from=${new Date(Date.now() - 864e5).toISOString()}&status=scheduled&limit=100`;
  const { data, loading, error, reload } = useFetch(url);
  const [completing, setCompleting] = useState(null);
  const [acting, setActing] = useState(null);
  const [sched, setSched] = useState(false);

  const list = (data || []).filter((s) => !filter || s.status === filter);
  const days = [...Array(7)].map((_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  const move = (n) => { const d = new Date(weekStart); d.setDate(d.getDate() + n * 7); setWeekStart(d); };

  return (
    <div>
      <PageHeader title="Classes" subtitle="Weekly schedule – reschedule, cancel or complete classes"
        actions={<button className="btn btn-primary" onClick={() => setSched(true)}><Icon name="add_circle" size={20} /> Schedule class</button>} />
      <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
        <Tabs value={view} onChange={setView} tabs={[{ value: 'week', label: 'Week view' }, { value: 'list', label: 'Upcoming list' }]} />
        {view === 'week' && (
          <div className="flex items-center gap-2">
            <button className="btn btn-outline btn-sm" onClick={() => move(-1)} aria-label="Previous week"><Icon name="chevron_left" size={18} /></button>
            <button className="btn btn-outline btn-sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>This week</button>
            <button className="btn btn-outline btn-sm" onClick={() => move(1)} aria-label="Next week"><Icon name="chevron_right" size={18} /></button>
            <span className="text-sm font-semibold ml-1">{fmtDate(weekStart)} – {fmtDate(new Date(weekEnd.getTime() - 1))}</span>
            <select className="input w-32 py-1.5 text-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">All status</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="rescheduled">Rescheduled</option><option value="absent">Absent</option>
            </select>
          </div>
        )}
      </div>
      <ErrorBox message={error} />
      {loading && !data ? <Spinner /> : view === 'week' ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {days.map((d) => {
            const items = list.filter((s) => isSameDay(s.date, d));
            const today = isSameDay(d, new Date());
            return (
              <div key={d.toISOString()} className={`card p-2 min-h-[120px] md:min-h-[420px] ${today ? 'ring-2 ring-primary-container' : ''}`}>
                <div className={`text-center py-1.5 rounded-lg mb-2 ${today ? 'bg-primary-container text-white' : 'bg-surface-container-low'}`}>
                  <div className="text-[11px] font-bold uppercase">{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                  <div className="text-sm font-semibold">{d.getDate()} {d.toLocaleDateString('en-GB', { month: 'short' })}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {items.map((s) => (
                    <button key={s._id} onClick={() => (s.status === 'scheduled' ? setActing(s) : null)}
                      className={`text-left rounded-md p-2 bg-white border border-slate-200 hover:shadow-sm ${s.status !== 'scheduled' ? 'opacity-70' : ''}`}
                      style={{ borderLeft: `4px solid ${colorFor(s.subject)}` }}>
                      <div className="text-[11px] font-bold">{fmtTime(s.date)}</div>
                      <div className="text-xs font-semibold truncate">{s.student?.name}</div>
                      <div className="text-[11px] muted truncate">{s.subject}</div>
                      {s.status !== 'scheduled' && <Chip status={s.status} className="mt-1 !text-[10px] !px-1.5" />}
                      {s.status === 'scheduled' && (
                        <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setCompleting(s); }} className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary-container hover:underline">
                          <Icon name="done_all" size={14} /> Complete
                        </span>
                      )}
                    </button>
                  ))}
                  {!items.length && <div className="text-[11px] muted text-center py-2">—</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card card-pad flex flex-col gap-2">
          {list.length ? list.map((s) => <SessionRow key={s._id} s={s} onComplete={setCompleting} onAction={setActing} />) : <Empty icon="event" title="No upcoming classes" />}
        </div>
      )}
      <p className="text-xs muted mt-3">Tip: click a class in the week view to reschedule or cancel it.</p>

      <CompleteClassModal session={completing} onClose={() => setCompleting(null)} onDone={() => reload(true)} />
      <SessionActionModal session={acting} onClose={() => setActing(null)} onDone={() => reload(true)} />
      <ScheduleClassModal open={sched} onClose={() => setSched(false)} onDone={() => reload(true)} />
    </div>
  );
}
