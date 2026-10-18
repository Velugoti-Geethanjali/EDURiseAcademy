// Reusable tutor-side pieces: complete-class dialog, schedule dialog, payment dialogs, package card, student picker
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../lib/api';
import { fmtDate, fmtTime, fmtDay, fmtDateTime, inr, toDateInput, toDateTimeInput } from '../lib/format';
import { useAuth } from '../lib/auth';
import { Icon, Modal, Field, ErrorBox, ProgressRing, ProgressBar, Chip, useToast, Avatar } from './ui';

// ---------- Mark as Completed (deducts one class) ----------
export function CompleteClassModal({ session, onClose, onDone }) {
  const toast = useToast();
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pkg, setPkg] = useState(null);

  useEffect(() => {
    setTopic(session?.topic || '');
    setPkg(null);
    if (session?.package) api.get(`/packages/${session.package._id || session.package}`).then(({ data }) => setPkg(data)).catch(() => {});
  }, [session]);

  if (!session) return null;
  const remaining = pkg?.stats?.remaining;
  const submit = async () => {
    setBusy(true); setError('');
    try {
      const { data } = await api.patch(`/sessions/${session._id}/complete`, { topic });
      toast(`Class marked completed${remaining !== undefined ? ` · ${Math.max(remaining - 1, 0)} left` : ''}`);
      onDone?.(data);
      onClose();
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} icon="task_alt" title="Confirm class completion" subtitle="One class will be deducted from the package"
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={busy}><Icon name="done_all" size={18} /> {busy ? 'Saving…' : 'Confirm & deduct class'}</button></>}>
      <p className="text-sm">
        Mark <span className="font-semibold text-primary-container">{session.subject} · {fmtDate(session.date)}, {fmtTime(session.date)}</span> as <span className="font-semibold text-tertiary-container">completed</span> for <span className="font-semibold">{session.student?.name}</span>.
      </p>
      {session.package && (
        <div className="mt-4 rounded-lg bg-surface-container-low p-3 text-sm flex gap-2">
          <Icon name="info" className="text-secondary" size={18} />
          <div>
            <div className="font-semibold text-secondary">Automatic class deduction</div>
            {remaining !== undefined
              ? <div>Remaining balance: <b>{remaining} → {Math.max(remaining - 1, 0)}</b> classes</div>
              : <div>1 class will be deducted from the package.</div>}
          </div>
        </div>
      )}
      <Field label="Topic covered (optional)" className="mt-4">
        <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Quadratic equations – Ex 4.2" />
      </Field>
      <div className="mt-3"><ErrorBox message={error} /></div>
    </Modal>
  );
}

// ---------- Reschedule / cancel / absent for a single class ----------
export function SessionActionModal({ session, onClose, onDone }) {
  const toast = useToast();
  const [mode, setMode] = useState('rescheduled');
  const [newDate, setNewDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (session) { setMode('rescheduled'); const d = new Date(session.date); d.setDate(d.getDate() + 1); setNewDate(toDateTimeInput(d)); }
  }, [session]);
  if (!session) return null;
  const submit = async () => {
    setBusy(true); setError('');
    try {
      await api.patch(`/sessions/${session._id}/status`, { status: mode, newDate: mode === 'rescheduled' && newDate ? new Date(newDate) : undefined });
      toast(mode === 'rescheduled' ? 'Class rescheduled' : mode === 'cancelled' ? 'Class cancelled' : 'Marked absent');
      onDone?.(); onClose();
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} icon="event_repeat" title="Change class" subtitle={`${session.student?.name} · ${session.subject} · ${fmtDateTime(session.date)}`}
      footer={<><button className="btn btn-outline" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <div className="grid grid-cols-3 gap-2">
        {[['rescheduled', 'event_repeat', 'Reschedule'], ['cancelled', 'event_busy', 'Cancel'], ['absent', 'person_off', 'Absent']].map(([v, ic, l]) => (
          <button key={v} type="button" onClick={() => setMode(v)} className={`rounded-lg border p-3 flex flex-col items-center gap-1 text-sm font-medium ${mode === v ? 'border-primary-container bg-[#eef2ff] text-primary-container' : 'border-slate-200 text-on-surface-variant'}`}>
            <Icon name={ic} /> {l}
          </button>
        ))}
      </div>
      {mode === 'rescheduled' && (
        <Field label="New date & time" className="mt-4" hint="Leave empty to add a makeup class at the end of the package instead">
          <input type="datetime-local" className="input" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
        </Field>
      )}
      {mode !== 'rescheduled' && <p className="mt-4 text-sm muted">No class is deducted. A makeup class is added at the end of the package automatically.</p>}
      <div className="mt-3"><ErrorBox message={error} /></div>
    </Modal>
  );
}

// ---------- Schedule a one-off class ----------
export function ScheduleClassModal({ open, onClose, onDone, studentId }) {
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [pkgs, setPkgs] = useState([]);
  const [f, setF] = useState({ student: studentId || '', package: '', subject: '', date: '', durationMins: 60, topic: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0);
    setF({ student: studentId || '', package: '', subject: '', date: toDateTimeInput(d), durationMins: 60, topic: '' });
    api.get('/students').then(({ data }) => setStudents(data)).catch(() => {});
  }, [open, studentId]);
  useEffect(() => {
    if (!f.student) { setPkgs([]); return; }
    api.get(`/packages?student=${f.student}&status=active`).then(({ data }) => {
      setPkgs(data);
      if (data[0]) setF((x) => ({ ...x, package: data[0]._id, subject: data[0].subject }));
    }).catch(() => {});
  }, [f.student]);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api.post('/sessions', { ...f, date: new Date(f.date), package: f.package || undefined });
      toast('Class scheduled'); onDone?.(); onClose();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} icon="add_circle" title="Schedule a class"
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button><button form="sched" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Schedule'}</button></>}>
      <form id="sched" onSubmit={submit} className="space-y-4">
        <Field label="Student">
          <select className="input" value={f.student} onChange={(e) => setF({ ...f, student: e.target.value, package: '' })} required>
            <option value="">Select student</option>
            {students.map((s) => <option key={s._id} value={s._id}>{s.name} {s.grade ? `(${s.grade})` : ''}</option>)}
          </select>
        </Field>
        <Field label="Package" hint="Classes linked to a package are deducted from it when completed">
          <select className="input" value={f.package} onChange={(e) => { const p = pkgs.find((x) => x._id === e.target.value); setF({ ...f, package: e.target.value, subject: p?.subject || f.subject }); }}>
            <option value="">No package (extra class)</option>
            {pkgs.map((p) => <option key={p._id} value={p._id}>{p.title} · {p.stats.remaining} left</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Subject"><input className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} required /></Field>
          <Field label="Duration (mins)"><input type="number" className="input" value={f.durationMins} onChange={(e) => setF({ ...f, durationMins: e.target.value })} /></Field>
        </div>
        <Field label="Date & time"><input type="datetime-local" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required /></Field>
        <Field label="Topic (optional)"><input className="input" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} /></Field>
        <ErrorBox message={error} />
      </form>
    </Modal>
  );
}

// ---------- Record a fee (due or paid) ----------
export function FeeModal({ open, onClose, onDone, studentId }) {
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [f, setF] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    const month = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    setF({ student: studentId || '', description: `Tuition fee – ${month}`, amount: '', dueDate: toDateInput(new Date()), status: 'pending', mode: 'UPI', paidOn: toDateInput(new Date()), note: '' });
    api.get('/students').then(({ data }) => setStudents(data)).catch(() => {});
  }, [open, studentId]);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api.post('/payments', { ...f, amount: Number(f.amount) });
      toast(f.status === 'paid' ? 'Payment recorded' : 'Fee added as pending'); onDone?.(); onClose();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal open={open} onClose={onClose} icon="receipt_long" title="Add fee entry"
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button><button form="fee" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <form id="fee" onSubmit={submit} className="space-y-4">
        <Field label="Student">
          <select className="input" value={f.student || ''} onChange={set('student')} required>
            <option value="">Select student</option>
            {students.map((s) => <option key={s._id} value={s._id}>{s.name} {s.grade ? `(${s.grade})` : ''}</option>)}
          </select>
        </Field>
        <Field label="Description"><input className="input" value={f.description || ''} onChange={set('description')} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₹)"><input type="number" min="0" className="input" value={f.amount || ''} onChange={set('amount')} required /></Field>
          <Field label="Due date"><input type="date" className="input" value={f.dueDate || ''} onChange={set('dueDate')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[['pending', 'Pending'], ['paid', 'Already paid']].map(([v, l]) => (
            <button type="button" key={v} onClick={() => setF({ ...f, status: v })} className={`rounded-lg border py-2 text-sm font-semibold ${f.status === v ? 'border-primary-container bg-[#eef2ff] text-primary-container' : 'border-slate-200 text-on-surface-variant'}`}>{l}</button>
          ))}
        </div>
        {f.status === 'paid' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Paid on"><input type="date" className="input" value={f.paidOn || ''} onChange={set('paidOn')} /></Field>
            <Field label="Mode"><select className="input" value={f.mode} onChange={set('mode')}>{['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'].map((m) => <option key={m}>{m}</option>)}</select></Field>
          </div>
        )}
        <ErrorBox message={error} />
      </form>
    </Modal>
  );
}

// ---------- Mark a pending fee as paid ----------
export function MarkPaidModal({ payment, onClose, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (payment) setF({ amount: payment.amount, paidOn: toDateInput(new Date()), mode: 'UPI', note: payment.note || '' }); }, [payment]);
  if (!payment) return null;
  const submit = async () => {
    setBusy(true); setError('');
    try {
      await api.patch(`/payments/${payment._id}/pay`, { ...f, amount: Number(f.amount) });
      toast('Marked as paid'); onDone?.(); onClose();
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal open onClose={onClose} icon="paid" title="Mark as paid" subtitle={`${payment.student?.name} · ${payment.description}`}
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-success" onClick={submit} disabled={busy}><Icon name="check" size={18} /> {busy ? 'Saving…' : 'Confirm payment'}</button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₹)"><input type="number" className="input" value={f.amount ?? ''} onChange={set('amount')} /></Field>
          <Field label="Payment date"><input type="date" className="input" value={f.paidOn || ''} onChange={set('paidOn')} /></Field>
        </div>
        <Field label="Mode">
          <div className="grid grid-cols-3 gap-2">
            {['Cash', 'UPI', 'Bank Transfer'].map((m) => (
              <button key={m} type="button" onClick={() => setF({ ...f, mode: m })} className={`rounded-lg border py-2 text-sm font-medium ${f.mode === m ? 'border-primary-container bg-[#eef2ff] text-primary-container' : 'border-slate-200'}`}>{m}</button>
            ))}
          </div>
        </Field>
        <Field label="Note (optional)"><input className="input" value={f.note || ''} onChange={set('note')} placeholder="e.g. UPI ref no." /></Field>
        <ErrorBox message={error} />
      </div>
    </Modal>
  );
}

// ---------- Package summary card ----------
export function PackageCard({ pkg, onComplete, compact, link = true }) {
  const s = pkg.stats || {};
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary">{pkg.subject}</div>
          <div className="font-semibold text-on-surface mt-0.5 truncate">{pkg.title}</div>
          {pkg.student?.name && <div className="text-xs muted mt-0.5">{pkg.student.name}</div>}
        </div>
        <Chip status={s.isExpired && pkg.status === 'active' ? 'expired' : pkg.status} />
      </div>
      <div className="mt-4 flex items-center gap-5">
        <ProgressRing value={s.progress} size={compact ? 76 : 92} label={`${s.completed}/${pkg.totalClasses}`} sub="done" />
        <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Stat k="Purchased" v={pkg.totalClasses} />
          <Stat k="Completed" v={s.completed} c="text-tertiary-container" />
          <Stat k="Remaining" v={s.remaining} c={s.remaining <= 2 ? 'text-error' : 'text-primary-container'} />
          <Stat k="Cancelled" v={s.cancelled} />
          <Stat k="Rescheduled" v={s.rescheduled} />
          <Stat k="Absent" v={s.absent} />
        </div>
      </div>
      <div className="mt-4 rounded-lg bg-surface-container-low px-3 py-2 text-xs flex flex-wrap justify-between gap-2">
        <span><Icon name="event" size={14} /> {fmtDate(pkg.startDate)} → {pkg.expiryDate ? fmtDate(pkg.expiryDate) : 'No expiry'}</span>
        {s.nextClass ? <span className="font-semibold text-primary-container">Next: {fmtDay(s.nextClass.date)} {fmtShort2(s.nextClass.date)}, {fmtTime(s.nextClass.date)}</span> : <span className="muted">No upcoming class</span>}
      </div>
      {!compact && (
        <div className="mt-3 flex gap-2">
          {link && <Link to={`/tutor/packages/${pkg._id}`} className="btn btn-outline btn-sm flex-1">Open package</Link>}
          {onComplete && s.nextClass && <button className="btn btn-primary btn-sm flex-1" onClick={() => onComplete(s.nextClass)}><Icon name="done_all" size={16} /> Mark next completed</button>}
        </div>
      )}
    </div>
  );
}
const fmtShort2 = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const Stat = ({ k, v, c = 'text-on-surface' }) => (
  <div className="flex justify-between border-b border-slate-100 pb-1"><span className="muted text-xs">{k}</span><span className={`font-semibold tabular-nums ${c}`}>{v ?? 0}</span></div>
);

// ---------- Session row used in lists ----------
export function SessionRow({ s, onComplete, onAction, showStudent = true }) {
  const done = s.status !== 'scheduled';
  const isPast = new Date(s.date) < new Date();
  return (
    <div className={`p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${done ? 'bg-surface-container-low' : 'bg-white border border-slate-200'}`}>
      <div className="flex items-start gap-3 min-w-0">
        <div className={`flex flex-col items-center justify-center w-[76px] py-2 rounded-lg text-center shrink-0 ${!done && isPast ? 'bg-primary-container text-white' : 'bg-surface-container-highest'}`}>
          <span className="text-xs font-bold">{fmtTime(s.date)}</span>
          <span className={`text-[10px] ${!done && isPast ? 'text-on-primary-container' : 'muted'}`}>{fmtDay(s.date)} {fmtShort2(s.date)}</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{s.subject}</span>
            {showStudent && s.student?.grade && <span className="text-[11px] bg-surface-container-high text-primary px-1.5 py-0.5 rounded font-semibold">{s.student.grade}</span>}
          </div>
          {showStudent && <div className="text-xs muted flex items-center gap-1 mt-0.5"><Icon name="person" size={14} /> {s.student?.name}</div>}
          {s.topic && <div className="text-xs text-on-surface-variant mt-0.5 truncate">{s.topic}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-center">
        {done ? <Chip status={s.status === 'completed' ? 'completed' : s.status} /> : (
          <>
            {onAction && <button className="btn btn-outline btn-sm" onClick={() => onAction(s)} title="Reschedule / cancel"><Icon name="more_time" size={16} /></button>}
            {onComplete && <button className="btn btn-primary btn-sm" onClick={() => onComplete(s)}><Icon name="done_all" size={16} /> Mark completed</button>}
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Multi-select students (empty = all) ----------
export function StudentPicker({ value = [], onChange, label = 'Assign to' }) {
  const [students, setStudents] = useState([]);
  const [mode, setMode] = useState(value.length ? 'some' : 'all');
  useEffect(() => { api.get('/students').then(({ data }) => setStudents(data)).catch(() => {}); }, []);
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex gap-2 mb-2">
        {[['all', 'All students'], ['some', 'Selected students']].map(([v, l]) => (
          <button key={v} type="button" onClick={() => { setMode(v); if (v === 'all') onChange([]); }} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${mode === v ? 'border-primary-container bg-[#eef2ff] text-primary-container' : 'border-slate-200 text-on-surface-variant'}`}>{l}</button>
        ))}
      </div>
      {mode === 'some' && (
        <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
          {students.map((s) => (
            <label key={s._id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50">
              <input type="checkbox" className="accent-[#4f46e5] w-4 h-4" checked={value.includes(s._id)} onChange={() => toggle(s._id)} />
              <Avatar name={s.name} size={24} />
              <span className="text-sm">{s.name}</span>
              <span className="text-xs muted ml-auto">{s.grade}</span>
            </label>
          ))}
          {!students.length && <div className="p-3 text-sm muted">No active students</div>}
        </div>
      )}
    </div>
  );
}

export function useSettings() {
  return useAuth().settings || {};
}

export { inr, ProgressBar };
