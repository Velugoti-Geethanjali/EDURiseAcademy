import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useFetch from '../../lib/useFetch';
import api, { errMsg } from '../../lib/api';
import { fmtDate, fmtDateTime, fmtTime, fmtDay, DAYS, waLink } from '../../lib/format';
import { Icon, Spinner, ErrorBox, SectionCard, Chip, ProgressRing, Empty, useToast, Avatar } from '../../components/ui';
import { CompleteClassModal, SessionActionModal } from '../../components/shared';
import { PackageModal } from '../../components/PackageForm';

export default function PackagePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(`/packages/${id}`);
  const [completing, setCompleting] = useState(null);
  const [acting, setActing] = useState(null);
  const [edit, setEdit] = useState(false);

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox message={error} />;
  const p = data; const s = p.stats; const st = p.student;
  const next = p.sessions.find((x) => x.status === 'scheduled');

  const remove = async () => {
    if (!window.confirm('Delete this package and all its classes?')) return;
    try { await api.delete(`/packages/${id}`); toast('Package deleted'); navigate(`/tutor/students/${st._id}`); } catch (e) { toast(errMsg(e), 'error'); }
  };
  const fill = async () => {
    const { data: r } = await api.post(`/packages/${id}/generate`);
    toast(r.sessionsCreated ? `${r.sessionsCreated} classes added` : 'Schedule is already full'); reload(true);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="text-sm flex items-center gap-1 text-primary font-medium">
        <Link to="/tutor/students">Students</Link><Icon name="chevron_right" size={16} className="muted" />
        <Link to={`/tutor/students/${st._id}`}>{st.name}</Link><Icon name="chevron_right" size={16} className="muted" /><span className="muted">Class package</span>
      </div>

      <section className="card card-pad flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={st.name} size={56} className="rounded-2xl" />
          <div>
            <div className="flex items-center gap-2 flex-wrap"><h1 className="text-2xl font-bold">{st.name}</h1><span className="chip bg-surface-container-high text-primary">{st.grade}</span></div>
            <div className="text-sm muted">{st.parentName && `Parent: ${st.parentName}`} {st.parentPhone && `· ${st.parentPhone}`}</div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(st.parentPhone || st.phone) && <a className="btn btn-success btn-sm" target="_blank" rel="noreferrer" href={waLink(st.parentPhone || st.phone, `Hello, update for ${st.name}: ${s.completed} of ${p.totalClasses} ${p.subject} classes completed, ${s.remaining} remaining.`)}><Icon name="chat" size={16} /> Send update</a>}
          <button className="btn btn-outline btn-sm" onClick={() => setEdit(true)}><Icon name="edit" size={16} /> Edit / renew</button>
          <button className="btn btn-outline btn-sm text-error" onClick={remove}><Icon name="delete" size={16} /></button>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        <section className="lg:col-span-2 card card-pad">
          <div className="flex justify-between items-start gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-primary">{p.subject}</div>
              <h2 className="text-xl font-bold mt-1">{p.title}</h2>
              <div className="text-sm muted mt-1">{fmtDate(p.startDate)} → {p.expiryDate ? fmtDate(p.expiryDate) : 'No expiry'} {s.isExpired && <span className="text-error font-semibold">· Expired</span>}</div>
              <div className="text-sm muted mt-1">{(p.schedule || []).map((x) => `${DAYS[x.day].slice(0, 3)} ${x.time}`).join(' · ') || 'No weekly timetable'}</div>
            </div>
            <Chip status={p.status} />
          </div>
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-8">
            <ProgressRing value={s.progress} size={150} stroke={12} label={`${s.progress}%`} sub={`${s.completed} / ${p.totalClasses} used`} />
            <div className="grid grid-cols-3 gap-3 flex-1 w-full">
              {[['Purchased', p.totalClasses, ''], ['Completed', s.completed, 'text-tertiary-container'], ['Remaining', s.remaining, s.remaining <= 2 ? 'text-error' : 'text-primary-container'],
                ['Cancelled', s.cancelled, ''], ['Rescheduled', s.rescheduled, ''], ['Absent', s.absent, '']].map(([k, v, c]) => (
                <div key={k} className="rounded-lg bg-surface-container-low p-3">
                  <div className="text-[11px] muted uppercase font-semibold">{k}</div>
                  <div className={`text-2xl font-bold ${c}`}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card card-pad flex flex-col gap-4">
          <h3 className="h-card">Next class</h3>
          {next ? (
            <>
              <div className="rounded-xl bg-[#eef2ff] p-4">
                <div className="text-xs font-semibold text-primary uppercase">{fmtDay(next.date)}</div>
                <div className="text-lg font-bold">{fmtDate(next.date)}</div>
                <div className="text-sm">{fmtTime(next.date)} · {next.durationMins} min</div>
              </div>
              <button className="btn btn-primary w-full py-3" onClick={() => setCompleting({ ...next, student: st, package: p._id })}><Icon name="done_all" size={20} /> Mark class as completed</button>
              <button className="btn btn-outline w-full" onClick={() => setActing({ ...next, student: st })}><Icon name="event_repeat" size={18} /> Reschedule / cancel</button>
            </>
          ) : (
            <Empty icon="event_busy" title="No upcoming class" text={s.remaining ? 'Fill the schedule to create the remaining classes.' : 'All classes used. Renew the package to continue.'}
              action={s.remaining ? <button className="btn btn-primary btn-sm" onClick={fill}>Fill schedule</button> : <button className="btn btn-primary btn-sm" onClick={() => setEdit(true)}>Renew package</button>} />
          )}
        </section>
      </div>

      <SectionCard title="Class ledger" subtitle={`${p.sessions.length} classes`} icon="receipt_long" action={s.remaining > s.scheduled && <button className="btn btn-ghost btn-sm" onClick={fill}><Icon name="add" size={16} /> Fill schedule</button>}>
        {p.sessions.length ? (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>#</th><th>Date & time</th><th>Topic</th><th>Status</th><th className="text-right">Class used</th></tr></thead>
              <tbody>
                {p.sessions.map((x, i) => (
                  <tr key={x._id} className={x.status === 'scheduled' && new Date(x.date) < new Date() ? 'bg-[#fffbeb]' : ''}>
                    <td className="text-xs muted">{i + 1}</td>
                    <td className="whitespace-nowrap text-sm">{fmtDateTime(x.date)}</td>
                    <td className="text-xs">{x.topic || '—'}</td>
                    <td>{x.status === 'scheduled'
                      ? <div className="flex gap-1"><button className="btn btn-primary btn-sm" onClick={() => setCompleting({ ...x, student: st, package: p._id })}>Complete</button><button className="btn btn-outline btn-sm" onClick={() => setActing({ ...x, student: st })}><Icon name="more_time" size={16} /></button></div>
                      : <Chip status={x.status} />}</td>
                    <td className="text-right font-semibold text-sm">{x.status === 'completed' ? <span className="text-error">−1</span> : <span className="muted">0</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty icon="event" title="No classes yet" />}
      </SectionCard>

      <CompleteClassModal session={completing} onClose={() => setCompleting(null)} onDone={() => reload(true)} />
      <SessionActionModal session={acting} onClose={() => setActing(null)} onDone={() => reload(true)} />
      <PackageModal open={edit} onClose={() => setEdit(false)} onDone={() => reload(true)} studentId={st._id} pkg={p} />
    </div>
  );
}
