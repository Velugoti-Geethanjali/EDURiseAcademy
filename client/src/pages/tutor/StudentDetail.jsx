import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useFetch from '../../lib/useFetch';
import api, { errMsg } from '../../lib/api';
import { fmtDate, fmtDateTime, inr, waLink } from '../../lib/format';
import { Icon, Spinner, Tabs, Avatar, Chip, Empty, SectionCard, ErrorBox, LineChart, useToast, FileLinks } from '../../components/ui';
import { PackageCard, CompleteClassModal, SessionActionModal, SessionRow, FeeModal, MarkPaidModal, ScheduleClassModal } from '../../components/shared';
import { PackageModal } from '../../components/PackageForm';

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(`/students/${id}`);
  const [tab, setTab] = useState('overview');
  const [completing, setCompleting] = useState(null);
  const [acting, setActing] = useState(null);
  const [pkgModal, setPkgModal] = useState(false);
  const [feeModal, setFeeModal] = useState(false);
  const [paying, setPaying] = useState(null);
  const [sched, setSched] = useState(false);

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox message={error} />;
  const { student: s, packages, sessions, payments, submissions, results } = data;
  const marked = sessions.filter((x) => ['completed', 'absent'].includes(x.status));
  const attPct = marked.length ? Math.round((marked.filter((x) => x.status === 'completed').length / marked.length) * 100) : null;
  const pending = payments.filter((p) => p.status === 'pending');
  const upcoming = sessions.filter((x) => x.status === 'scheduled').sort((a, b) => new Date(a.date) - new Date(b.date));

  const remove = async () => {
    if (!window.confirm(`Delete ${s.name} and all their classes, fees and results? This cannot be undone.`)) return;
    try { await api.delete(`/students/${id}`); toast('Student deleted'); navigate('/tutor/students'); } catch (e) { toast(errMsg(e), 'error'); }
  };

  return (
    <div className="flex flex-col gap-5">
      <Link to="/tutor/students" className="text-sm text-primary font-medium inline-flex items-center gap-1"><Icon name="arrow_back" size={18} /> Students</Link>
      <section className="card card-pad flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={s.name} size={60} className="rounded-2xl" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{s.name}</h1>
              <span className="chip bg-surface-container-high text-primary">Roll #{s.rollNo || '—'}</span>
              <Chip status={s.status} />
            </div>
            <div className="text-sm muted mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span><Icon name="school" size={16} /> {s.grade} {s.board && `· ${s.board}`}</span>
              <span><Icon name="call" size={16} /> {s.phone}</span>
              {s.parentName && <span><Icon name="family_restroom" size={16} /> {s.parentName} {s.parentPhone && `(${s.parentPhone})`}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(s.parentPhone || s.phone) && <a href={waLink(s.parentPhone || s.phone)} target="_blank" rel="noreferrer" className="btn btn-success btn-sm"><Icon name="chat" size={16} /> WhatsApp parent</a>}
          <Link to={`/tutor/students/${id}/edit`} className="btn btn-outline btn-sm"><Icon name="edit" size={16} /> Edit</Link>
          <button onClick={remove} className="btn btn-outline btn-sm text-error"><Icon name="delete" size={16} /></button>
        </div>
      </section>

      <div className="overflow-x-auto no-scrollbar">
        <Tabs value={tab} onChange={setTab} tabs={[
          { value: 'overview', label: 'Overview' }, { value: 'package', label: 'Class package' }, { value: 'attendance', label: 'Attendance' },
          { value: 'fees', label: 'Fees' }, { value: 'homework', label: 'Homework' }, { value: 'results', label: 'Results' },
        ]} />
      </div>

      {tab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-5 items-start">
          <div className="lg:col-span-2 flex flex-col gap-5">
            {packages.filter((p) => p.status === 'active').map((p) => <PackageCard key={p._id} pkg={p} onComplete={(n) => setCompleting({ ...n, student: s, package: p._id })} />)}
            {!packages.some((p) => p.status === 'active') && (
              <div className="card"><Empty icon="inventory_2" title="No active package" action={<button className="btn btn-primary btn-sm" onClick={() => setPkgModal(true)}>Assign package</button>} /></div>
            )}
            <SectionCard title="Upcoming classes" icon="event" action={<button className="btn btn-ghost btn-sm" onClick={() => setSched(true)}><Icon name="add" size={16} /> Extra class</button>}>
              {upcoming.length ? upcoming.slice(0, 5).map((x) => <SessionRow key={x._id} s={{ ...x, student: s }} showStudent={false} onComplete={(v) => setCompleting(v)} onAction={setActing} />) : <Empty icon="event_busy" title="No upcoming classes" />}
            </SectionCard>
          </div>
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Attendance" value={attPct !== null ? `${attPct}%` : '—'} icon="fact_check" />
              <MiniStat label="Fees due" value={inr(pending.reduce((a, p) => a + p.amount, 0))} icon="currency_rupee" warn={pending.length > 0} />
              <MiniStat label="Homework" value={submissions.length} icon="assignment" sub="submitted" />
              <MiniStat label="Tests" value={results.length} icon="quiz" sub="graded" />
            </div>
            <SectionCard title="Details" icon="badge">
              <dl className="text-sm space-y-2">
                {[['Subjects', (s.subjects || []).join(', ')], ['Email', s.email], ['Joined', fmtDate(s.joinedOn || s.createdAt)], ['Address', s.address], ['Notes', s.notes]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4"><dt className="muted">{k}</dt><dd className="font-medium text-right">{v || '—'}</dd></div>
                ))}
              </dl>
            </SectionCard>
          </div>
        </div>
      )}

      {tab === 'package' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end"><button className="btn btn-primary" onClick={() => setPkgModal(true)}><Icon name="add" size={18} /> Assign new package</button></div>
          {packages.length ? (
            <div className="grid md:grid-cols-2 gap-4">{packages.map((p) => <PackageCard key={p._id} pkg={p} onComplete={(n) => setCompleting({ ...n, student: s, package: p._id })} />)}</div>
          ) : <div className="card"><Empty icon="inventory_2" title="No packages yet" /></div>}
        </div>
      )}

      {tab === 'attendance' && (
        <SectionCard title="Class history" subtitle={attPct !== null ? `Attendance ${attPct}%` : ''} icon="history">
          {sessions.length ? (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>Date & time</th><th>Subject</th><th>Topic</th><th className="text-right">Status</th></tr></thead>
                <tbody>
                  {sessions.map((x) => (
                    <tr key={x._id}>
                      <td className="text-sm whitespace-nowrap">{fmtDateTime(x.date)}</td>
                      <td>{x.subject}</td>
                      <td className="text-xs muted">{x.topic || '—'}</td>
                      <td className="text-right">
                        {x.status === 'scheduled' ? (
                          <div className="flex justify-end gap-1">
                            <button className="btn btn-outline btn-sm" onClick={() => setActing({ ...x, student: s })}><Icon name="more_time" size={16} /></button>
                            <button className="btn btn-primary btn-sm" onClick={() => setCompleting({ ...x, student: s })}>Complete</button>
                          </div>
                        ) : <Chip status={x.status} label={x.status === 'completed' ? 'Present' : undefined} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty icon="history" title="No classes yet" />}
        </SectionCard>
      )}

      {tab === 'fees' && (
        <SectionCard title="Fee ledger" icon="receipt_long" action={<button className="btn btn-primary btn-sm" onClick={() => setFeeModal(true)}><Icon name="add" size={16} /> Add fee</button>}>
          {payments.length ? (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>Description</th><th>Amount</th><th>Due</th><th>Paid on</th><th className="text-right">Status</th></tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p._id}>
                      <td><div className="font-medium">{p.description}</div>{p.receiptNo && <div className="text-[11px] muted">{p.receiptNo} · {p.mode}</div>}</td>
                      <td className="font-semibold">{inr(p.amount)}</td>
                      <td className="text-xs">{fmtDate(p.dueDate)}</td>
                      <td className="text-xs">{p.paidOn ? fmtDate(p.paidOn) : '—'}</td>
                      <td className="text-right">
                        {p.status === 'pending'
                          ? <button className="btn btn-success btn-sm" onClick={() => setPaying({ ...p, student: s })}>Mark paid</button>
                          : <Link to={`/receipt/${p._id}`} target="_blank" className="btn btn-outline btn-sm"><Icon name="download" size={16} /> Receipt</Link>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty icon="payments" title="No fee records" />}
        </SectionCard>
      )}

      {tab === 'homework' && (
        <SectionCard title="Homework submissions" icon="assignment">
          {submissions.length ? submissions.map((x) => (
            <div key={x._id} className="p-3 rounded-lg bg-surface-container-low">
              <div className="flex justify-between gap-2">
                <div><div className="font-semibold">{x.homework?.title}</div><div className="text-xs muted">Submitted {fmtDateTime(x.submittedAt)}</div></div>
                {x.reviewedAt ? <Chip status="reviewed" label={`${x.marks ?? '-'}/${x.homework?.maxMarks ?? ''}`} /> : <Chip status="pending" label="To review" />}
              </div>
              {x.text && <p className="text-sm mt-2">{x.text}</p>}
              <div className="mt-2"><FileLinks files={x.files} /></div>
              {x.comment && <p className="text-xs mt-2 text-primary">Feedback: {x.comment}</p>}
            </div>
          )) : <Empty icon="assignment" title="No submissions yet" />}
        </SectionCard>
      )}

      {tab === 'results' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <SectionCard title="Progress" icon="monitoring">
            <LineChart points={results.filter((r) => r.marks !== undefined && r.marks !== null).map((r) => ({ label: r.test.name, value: (r.marks / r.test.maxMarks) * 100 }))} />
          </SectionCard>
          <SectionCard title="Test results" icon="quiz">
            {results.length ? results.map((r) => (
              <div key={r._id} className="p-3 rounded-lg bg-surface-container-low flex justify-between gap-2">
                <div><div className="font-semibold">{r.test.name}</div><div className="text-xs muted">{r.test.subject} · {fmtDate(r.test.date)}</div>{r.feedback && <div className="text-xs mt-1">{r.feedback}</div>}</div>
                <div className="text-right"><div className="font-bold">{r.marks ?? '—'}/{r.test.maxMarks}</div><div className="text-xs muted">{r.marks !== undefined ? `${Math.round((r.marks / r.test.maxMarks) * 100)}%` : ''}</div></div>
              </div>
            )) : <Empty icon="quiz" title="No results yet" />}
          </SectionCard>
        </div>
      )}

      <CompleteClassModal session={completing} onClose={() => setCompleting(null)} onDone={() => reload(true)} />
      <SessionActionModal session={acting} onClose={() => setActing(null)} onDone={() => reload(true)} />
      <PackageModal open={pkgModal} onClose={() => setPkgModal(false)} onDone={() => reload(true)} studentId={id} />
      <FeeModal open={feeModal} onClose={() => setFeeModal(false)} onDone={() => reload(true)} studentId={id} />
      <MarkPaidModal payment={paying} onClose={() => setPaying(null)} onDone={() => reload(true)} />
      <ScheduleClassModal open={sched} onClose={() => setSched(false)} onDone={() => reload(true)} studentId={id} />
    </div>
  );
}

const MiniStat = ({ label, value, icon, sub, warn }) => (
  <div className="card p-3">
    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-semibold muted"><Icon name={icon} size={15} /> {label}</div>
    <div className={`text-xl font-bold mt-1 ${warn ? 'text-secondary' : ''}`}>{value}</div>
    {sub && <div className="text-[11px] muted">{sub}</div>}
  </div>
);
