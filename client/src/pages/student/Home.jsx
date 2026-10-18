import { Link } from 'react-router-dom';
import useFetch from '../../lib/useFetch';
import { useAuth } from '../../lib/auth';
import { countdown, fmtDate, fmtDateTime, fmtTime, greeting, inr, isSameDay, timeAgo } from '../../lib/format';
import { Icon, Spinner, ErrorBox, ProgressRing, ProgressBar, Empty, Chip } from '../../components/ui';

export default function StudentHome() {
  const { user } = useAuth();
  const { data, loading, error } = useFetch('/dashboard/student');
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox message={error} />;
  const next = data.nextClasses[0];
  const active = data.packages.filter((p) => p.status === 'active');

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-4">
      <div>
        <h1 className="h-page">{greeting()}, {user.name.split(' ')[0]}! 👋</h1>
        <div className="flex flex-wrap gap-2 mt-2">
          {user.grade && <span className="chip bg-surface-container-high text-primary">{user.grade}{user.board ? ` · ${user.board}` : ''}</span>}
          {user.rollNo && <span className="chip bg-tertiary-fixed text-on-tertiary-fixed">Roll #{user.rollNo}</span>}
        </div>
      </div>

      {data.pendingFees > 0 && (
        <Link to="/student/payments" className="rounded-xl bg-secondary-fixed p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center text-on-secondary-fixed-variant"><Icon name="currency_rupee" size={20} /></div>
          <div className="flex-1"><div className="font-semibold text-on-secondary-fixed-variant">Fee reminder: {inr(data.pendingFees)} due</div><div className="text-xs text-on-secondary-fixed-variant/80">{data.pendingPayments.map((p) => p.description).join(', ')}</div></div>
          <Icon name="chevron_right" className="text-on-secondary-fixed-variant" />
        </Link>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <section className="card p-4 sm:p-5">
          {next ? (
            <>
              <div className="flex justify-between items-center gap-2">
                <span className="chip bg-surface-container-high text-primary"><span className="w-1.5 h-1.5 rounded-full bg-primary-container" /> {isSameDay(next.date, new Date()) ? 'Upcoming today' : 'Next class'}</span>
                <span className="chip bg-secondary-fixed text-on-secondary-fixed-variant"><Icon name="timer" size={14} /> Starts {countdown(next.date)}</span>
              </div>
              <div className="mt-3 text-xs font-semibold uppercase text-primary tracking-wide">{next.subject}</div>
              <div className="text-lg font-semibold mt-0.5">{next.topic || `${next.subject} class`}</div>
              <div className="mt-3 text-sm text-on-surface-variant flex items-center gap-1.5"><Icon name="schedule" size={18} /> {fmtDateTime(next.date)} · {next.durationMins} min</div>
              {data.nextClasses.length > 1 && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs muted">
                  Then: {data.nextClasses.slice(1, 3).map((s) => `${new Date(s.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })} ${fmtTime(s.date)}`).join(' · ')}
                </div>
              )}
            </>
          ) : <Empty icon="event_available" title="No upcoming class" text="Your tutor will schedule your next class soon." />}
        </section>

        {active.length ? active.slice(0, 1).map((p) => (
          <section key={p._id} className="card p-4 sm:p-5">
            <div className="flex justify-between items-start">
              <div><div className="text-xs muted">Active package</div><div className="font-semibold text-lg">{p.title}</div></div>
              <Chip status="active" />
            </div>
            <div className="mt-4 flex items-center gap-5">
              <ProgressRing value={p.stats.progress} size={88} sub="done" />
              <div className="flex-1">
                <div className="flex justify-between text-sm"><span>Completed</span><span className="font-semibold">{p.stats.completed} / {p.totalClasses}</span></div>
                <ProgressBar value={p.stats.progress} className="my-2" />
                <div className="flex justify-between text-xs"><span className={`font-semibold ${p.stats.remaining <= 2 ? 'text-error' : 'text-tertiary-container'}`}>{p.stats.remaining} remaining</span><span className="muted">{p.stats.rescheduled} rescheduled</span></div>
              </div>
            </div>
            {p.expiryDate && <div className="mt-3 rounded-lg bg-surface-container-low px-3 py-2 text-xs"><Icon name="hourglass_bottom" size={14} /> Valid till {fmtDate(p.expiryDate)}</div>}
          </section>
        )) : <section className="card"><Empty icon="inventory_2" title="No active package" /></section>}
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {[
          ['assignment', `Tasks (${data.pendingHomeworkCount})`, '/student/homework', 'bg-surface-container-high text-primary'],
          ['fact_check', data.attendancePct !== null ? `${data.attendancePct}% Attd.` : 'Attendance', '/student/classes', 'bg-[#ecfdf5] text-tertiary-container'],
          ['bar_chart', data.avgScore !== null ? `${data.avgScore}% Score` : 'Results', '/student/results', 'bg-secondary-fixed text-on-secondary-fixed-variant'],
          ['menu_book', 'Notes', '/student/materials', 'bg-[#f0f9ff] text-[#0ea5e9]'],
        ].map(([ic, label, to, cls]) => (
          <Link key={to} to={to} className="card p-3 flex flex-col items-center gap-2 text-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cls}`}><Icon name={ic} size={22} /></div>
            <span className="text-[11px] sm:text-xs font-medium">{label}</span>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="card p-4 sm:p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="h-card flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Pending homework</h2>
            {data.pendingHomeworkCount > 0 && <span className="chip bg-secondary-fixed text-on-secondary-fixed-variant">{data.pendingHomeworkCount} due</span>}
          </div>
          {data.pendingHomework.length ? data.pendingHomework.map((h) => (
            <Link to="/student/homework" key={h._id} className="block rounded-lg bg-surface-container-low p-3 mb-2">
              {h.subject && <div className="text-[11px] font-semibold uppercase text-primary">{h.subject}</div>}
              <div className="font-semibold">{h.title}</div>
              {h.deadline && <div className={`text-xs mt-1 flex items-center gap-1 ${new Date(h.deadline) < new Date() ? 'text-error' : 'muted'}`}><Icon name="alarm" size={14} /> Due {fmtDateTime(h.deadline)}</div>}
            </Link>
          )) : <Empty icon="task_alt" title="All homework submitted" />}
          {data.upcomingTests.length > 0 && (
            <div className="mt-2 pt-3 border-t border-slate-100">
              <div className="text-xs font-semibold muted mb-2">UPCOMING TESTS</div>
              {data.upcomingTests.map((t) => <div key={t._id} className="text-sm flex justify-between py-1"><span className="font-medium">{t.name}</span><span className="muted text-xs">{fmtDate(t.date)}</span></div>)}
            </div>
          )}
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="h-card flex items-center gap-2 mb-3"><Icon name="campaign" className="text-primary" size={20} /> Announcements</h2>
          {data.announcements.length ? data.announcements.map((a) => (
            <div key={a._id} className="rounded-lg border border-slate-100 p-3 mb-2">
              <div className="flex justify-between gap-2"><span className="chip bg-[#fef2f2] text-error">{a.pinned && <Icon name="push_pin" size={12} />} {a.category}</span><span className="text-[11px] muted">{timeAgo(a.createdAt)}</span></div>
              <div className="font-semibold mt-1.5">{a.title}</div>
              {a.body && <p className="text-sm text-on-surface-variant mt-0.5 whitespace-pre-line">{a.body}</p>}
            </div>
          )) : <Empty icon="campaign" title="No announcements" />}
        </section>
      </div>
    </div>
  );
}
