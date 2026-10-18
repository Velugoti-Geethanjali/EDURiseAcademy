import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useFetch from '../../lib/useFetch';
import api from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDate, fmtShort, fmtDay, fmtTime, greeting, inr, timeAgo, waLink } from '../../lib/format';
import { Icon, Spinner, StatCard, SectionCard, Chip, Empty, Avatar, ErrorBox, useToast } from '../../components/ui';
import { CompleteClassModal, SessionActionModal, SessionRow, ScheduleClassModal, FeeModal } from '../../components/shared';

export default function TutorDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFetch('/dashboard/tutor');
  const [completing, setCompleting] = useState(null);
  const [acting, setActing] = useState(null);
  const [sched, setSched] = useState(false);
  const [fee, setFee] = useState(false);

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox message={error} />;
  const { stats, today, upcoming, lowBalance, recentPayments, unreviewed } = data;

  // group upcoming by day
  const byDay = upcoming.reduce((acc, s) => {
    const k = new Date(s.date).toDateString();
    (acc[k] = acc[k] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      <section className="card card-pad flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="h-page">{greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="muted mt-1">Here is your teaching schedule, balance alerts and fee collections for today.</p>
          {stats.unreviewedHomework > 0 && (
            <Link to="/tutor/assignments" className="mt-3 chip bg-secondary-fixed text-on-secondary-fixed-variant text-xs py-1 px-3">
              <Icon name="assignment_late" size={16} /> {stats.unreviewedHomework} homework submission{stats.unreviewedHomework > 1 ? 's' : ''} to review
            </Link>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-primary" onClick={() => setSched(true)}><Icon name="add_circle" size={20} /> Schedule class</button>
          <button className="btn btn-outline" onClick={() => setFee(true)}><Icon name="receipt_long" size={20} className="text-tertiary-container" /> Record fee</button>
        </div>
      </section>

      <section className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Total students" value={stats.totalStudents} unit="active" icon="groups" onClick={() => navigate('/tutor/students')} />
        <StatCard label="Today's classes" value={stats.todayClasses} unit="sessions" icon="calendar_today"
          foot={`${stats.todayCompleted} completed · ${stats.todayClasses - stats.todayCompleted} left`}
          progress={stats.todayClasses ? (stats.todayCompleted / stats.todayClasses) * 100 : 0} progressColor="bg-tertiary-container" />
        <StatCard label="Pending fees" value={inr(stats.pendingFees)} icon="currency_rupee" iconClass="bg-secondary-fixed text-on-secondary-fixed-variant"
          foot={`${stats.pendingFeeCount} pending · ${inr(stats.collectedThisMonth)} collected this month`} onClick={() => navigate('/tutor/payments')} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 flex flex-col gap-5">
          <SectionCard title="Today's classes" subtitle={fmtDate(new Date())} icon="play_circle"
            action={<span className="chip bg-surface-container-low text-on-surface-variant">{today.length} scheduled</span>}>
            {today.length ? (
              <div className="flex flex-col gap-2">
                {today.map((s) => <SessionRow key={s._id} s={s} onComplete={setCompleting} onAction={setActing} />)}
              </div>
            ) : <Empty icon="free_cancellation" title="No classes today" text="Enjoy the break, or schedule an extra class." />}
          </SectionCard>

          <SectionCard title="Upcoming classes" subtitle="Next 7 days" icon="date_range" action={<Link to="/tutor/classes" className="btn btn-ghost btn-sm">Calendar</Link>}>
            {Object.keys(byDay).length ? (
              <div className="flex flex-col gap-2">
                {Object.entries(byDay).map(([day, list]) => (
                  <div key={day} className="p-3 rounded-lg bg-surface-container-low flex items-center gap-4">
                    <div className="w-12 text-center shrink-0">
                      <div className="text-xs font-bold text-primary uppercase">{fmtDay(list[0].date)}</div>
                      <div className="font-semibold text-sm">{fmtShort(list[0].date)}</div>
                    </div>
                    <div className="h-8 w-px bg-outline-variant" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm">{list.length} class{list.length > 1 ? 'es' : ''} · {fmtTime(list[0].date)}{list.length > 1 ? ` – ${fmtTime(list[list.length - 1].date)}` : ''}</div>
                      <div className="text-xs muted truncate">{list.map((s) => `${s.student?.name?.split(' ')[0]} (${s.subject})`).join(' • ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <Empty icon="event" title="Nothing scheduled this week" />}
          </SectionCard>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-5">
          <SectionCard title="Low class balance" subtitle="2 or fewer classes left" icon="notification_important" iconClass="bg-secondary-fixed text-on-secondary-fixed-variant">
            {lowBalance.length ? lowBalance.map((p) => (
              <div key={p._id} className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between gap-2">
                <Link to={`/tutor/packages/${p._id}`} className="min-w-0">
                  <div className="font-semibold text-sm truncate">{p.student?.name}</div>
                  <div className="text-xs muted">{p.student?.grade} · {p.subject}</div>
                  <div className={`text-xs font-semibold mt-0.5 ${p.stats.remaining === 0 ? 'text-error' : 'text-secondary'}`}>
                    {p.stats.remaining} class{p.stats.remaining === 1 ? '' : 'es'} remaining{p.stats.isExpired ? ' · Expired' : ''}
                  </div>
                </Link>
                {(p.student?.parentPhone || p.student?.phone) && (
                  <a className="btn btn-success btn-sm" target="_blank" rel="noreferrer"
                    href={waLink(p.student.parentPhone || p.student.phone, `Hello, ${p.student.name} has ${p.stats.remaining} class(es) left in the ${p.subject} package. Please renew to continue classes.`)}>
                    <Icon name="chat" size={16} /> WhatsApp
                  </a>
                )}
              </div>
            )) : <Empty icon="battery_full" title="All packages healthy" />}
          </SectionCard>

          <SectionCard title="Homework review" subtitle={`${unreviewed.length} awaiting feedback`} icon="assignment_turned_in" action={<Link to="/tutor/assignments" className="btn btn-ghost btn-sm">Open</Link>}>
            {unreviewed.length ? unreviewed.map((s) => (
              <div key={s._id} className="p-3 rounded-lg bg-surface-container-low flex items-center gap-2.5">
                <Avatar name={s.student?.name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{s.student?.name}</div>
                  <div className="text-xs muted truncate">{s.homework?.title}</div>
                </div>
                <span className="text-[11px] muted">{timeAgo(s.submittedAt)}</span>
              </div>
            )) : <Empty icon="task_alt" title="No submissions to review" />}
          </SectionCard>

          <SectionCard title="Recent fee payments" icon="account_balance_wallet" iconClass="bg-surface-container-high text-tertiary-container" action={<Link to="/tutor/payments" className="btn btn-ghost btn-sm">View all</Link>}>
            {recentPayments.length ? (
              <div className="overflow-x-auto -mx-1">
                <table className="table-base">
                  <thead><tr><th>Student</th><th>Amount</th><th>Date</th><th className="text-right">Status</th></tr></thead>
                  <tbody>
                    {recentPayments.map((p) => (
                      <tr key={p._id}>
                        <td><div className="font-semibold text-[13px]">{p.student?.name}</div><div className="text-[11px] muted">{p.mode}</div></td>
                        <td className="font-semibold">{inr(p.amount)}</td>
                        <td className="text-xs muted">{fmtDate(p.paidOn)}</td>
                        <td className="text-right"><Chip status="paid" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty icon="payments" title="No payments yet" />}
          </SectionCard>
        </div>
      </div>

      <CompleteClassModal session={completing} onClose={() => setCompleting(null)} onDone={() => reload(true)} />
      <SessionActionModal session={acting} onClose={() => setActing(null)} onDone={() => reload(true)} />
      <ScheduleClassModal open={sched} onClose={() => setSched(false)} onDone={() => reload(true)} />
      <FeeModal open={fee} onClose={() => setFee(false)} onDone={() => reload(true)} />
    </div>
  );
}
