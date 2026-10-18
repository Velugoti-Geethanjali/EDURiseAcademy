import { useEffect, useState } from 'react';
import useFetch from '../../lib/useFetch';
import api, { errMsg } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDate, fmtDateTime, toDateTimeInput } from '../../lib/format';
import { Icon, Spinner, PageHeader, Tabs, Empty, Chip, Modal, Field, ErrorBox, Avatar, FileLinks, FileChip, ProgressBar, useToast } from '../../components/ui';
import { StudentPicker } from '../../components/shared';

export default function Assignments() {
  const [tab, setTab] = useState('homework');
  return (
    <div>
      <PageHeader title="Assignments & materials" subtitle="Post homework, review submissions and share study notes" />
      <Tabs value={tab} onChange={setTab} className="mb-4" tabs={[{ value: 'homework', label: 'Homework' }, { value: 'materials', label: 'Study materials' }]} />
      {tab === 'homework' ? <HomeworkTab /> : <MaterialsTab />}
    </div>
  );
}

function HomeworkTab() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/homework');
  const [create, setCreate] = useState(false);
  const [open, setOpen] = useState(null);

  const del = async (h) => { if (!window.confirm(`Delete "${h.title}" and its submissions?`)) return; await api.delete(`/homework/${h._id}`); toast('Deleted'); reload(true); };

  return (
    <>
      <div className="flex justify-end mb-3"><button className="btn btn-primary" onClick={() => setCreate(true)}><Icon name="add" size={20} /> Post homework</button></div>
      <ErrorBox message={error} />
      {loading && !data ? <Spinner /> : !data?.length ? <div className="card"><Empty icon="assignment" title="No homework posted yet" /></div> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((h) => {
            const overdue = h.deadline && new Date(h.deadline) < new Date();
            const toReview = h.submittedCount - h.reviewedCount;
            return (
              <div key={h._id} className="card p-4 flex flex-col gap-3">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    {h.subject && <div className="text-[11px] font-semibold uppercase text-primary">{h.subject}</div>}
                    <div className="font-semibold">{h.title}</div>
                  </div>
                  <button className="p-1 text-slate-400 hover:text-error self-start" onClick={() => del(h)} aria-label="Delete"><Icon name="delete" size={18} /></button>
                </div>
                {h.description && <p className="text-sm text-on-surface-variant line-clamp-2">{h.description}</p>}
                <FileLinks files={h.attachments} />
                <div className="text-xs flex flex-wrap gap-x-3 gap-y-1 muted">
                  <span className={overdue ? 'text-error font-semibold' : ''}><Icon name="schedule" size={14} /> {h.deadline ? `Due ${fmtDateTime(h.deadline)}` : 'No deadline'}</span>
                  <span><Icon name="group" size={14} /> {h.assignedTo?.length ? h.assignedTo.map((s) => s.name.split(' ')[0]).join(', ') : 'All students'}</span>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span>{h.submittedCount}/{h.targetCount} submitted</span>{toReview > 0 && <span className="text-secondary font-semibold">{toReview} to review</span>}</div>
                  <ProgressBar value={h.targetCount ? (h.submittedCount / h.targetCount) * 100 : 0} />
                </div>
                <button className="btn btn-outline btn-sm mt-auto" onClick={() => setOpen(h)}>View submissions</button>
              </div>
            );
          })}
        </div>
      )}
      <HomeworkModal open={create} onClose={() => setCreate(false)} onDone={() => reload(true)} />
      <SubmissionsModal hw={open} onClose={() => { setOpen(null); reload(true); }} />
    </>
  );
}

function HomeworkModal({ open, onClose, onDone }) {
  const { settings } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({});
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) { const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(21, 0, 0, 0); setF({ title: '', description: '', subject: '', deadline: toDateTimeInput(d), maxMarks: 10, assignedTo: [] }); setFiles([]); setError(''); }
  }, [open]);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => fd.append(k, k === 'assignedTo' ? JSON.stringify(v) : k === 'deadline' && v ? new Date(v).toISOString() : v));
      files.forEach((x) => fd.append('files', x));
      await api.post('/homework', fd);
      toast('Homework posted'); onDone(); onClose();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal open={open} onClose={onClose} wide icon="assignment_add" title="Post homework"
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button><button form="hw" className="btn btn-primary" disabled={busy}>{busy ? 'Uploading…' : 'Post homework'}</button></>}>
      <form id="hw" onSubmit={submit} className="space-y-4">
        <Field label="Title *"><input className="input" value={f.title || ''} onChange={set('title')} required /></Field>
        <Field label="Instructions"><textarea className="input" rows={3} value={f.description || ''} onChange={set('description')} /></Field>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Subject"><select className="input" value={f.subject || ''} onChange={set('subject')}><option value="">—</option>{(settings?.subjects || []).map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Deadline"><input type="datetime-local" className="input" value={f.deadline || ''} onChange={set('deadline')} /></Field>
          <Field label="Max marks"><input type="number" className="input" value={f.maxMarks || ''} onChange={set('maxMarks')} /></Field>
        </div>
        <Field label="Attachments (PDF, images, videos)">
          <input type="file" multiple accept=".pdf,image/*,video/*,.doc,.docx" className="input" onChange={(e) => setFiles([...e.target.files])} />
        </Field>
        <StudentPicker value={f.assignedTo || []} onChange={(v) => setF({ ...f, assignedTo: v })} />
        <ErrorBox message={error} />
      </form>
    </Modal>
  );
}

function SubmissionsModal({ hw, onClose }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState({});
  const load = () => api.get(`/homework/${hw._id}/submissions`).then(({ data: d }) => { setData(d); setEdit(Object.fromEntries(d.submissions.map((s) => [s._id, { marks: s.marks ?? '', comment: s.comment || '' }]))); });
  useEffect(() => { if (hw) { setData(null); load(); } }, [hw]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!hw) return null;
  const save = async (id) => {
    try { await api.patch(`/homework/submissions/${id}/review`, { marks: edit[id].marks === '' ? undefined : Number(edit[id].marks), comment: edit[id].comment }); toast('Marks saved'); load(); } catch (e) { toast(errMsg(e), 'error'); }
  };
  return (
    <Modal open onClose={onClose} wide icon="fact_check" title={hw.title} subtitle={`Max marks ${hw.maxMarks}${hw.deadline ? ` · Due ${fmtDateTime(hw.deadline)}` : ''}`}>
      {!data ? <Spinner /> : (
        <div className="space-y-3">
          {data.submissions.map((s) => {
            const late = hw.deadline && new Date(s.submittedAt) > new Date(hw.deadline);
            return (
              <div key={s._id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={s.student?.name} size={32} />
                  <div className="flex-1 min-w-0"><div className="font-semibold">{s.student?.name}</div><div className={`text-xs ${late ? 'text-error' : 'muted'}`}>Submitted {fmtDateTime(s.submittedAt)}{late ? ' · Late' : ''}</div></div>
                  {s.reviewedAt ? <Chip status="reviewed" /> : <Chip status="pending" label="To review" />}
                </div>
                {s.text && <p className="text-sm mt-2 bg-surface-container-low rounded-md p-2">{s.text}</p>}
                {!!s.files?.length && <div className="mt-2 flex flex-wrap gap-2">{s.files.map((x, i) => <FileChip key={i} file={x} />)}</div>}
                <div className="mt-3 grid grid-cols-[90px_1fr_auto] gap-2 items-end">
                  <Field label={`Marks /${hw.maxMarks}`}><input type="number" className="input py-1.5" value={edit[s._id]?.marks ?? ''} onChange={(e) => setEdit({ ...edit, [s._id]: { ...edit[s._id], marks: e.target.value } })} /></Field>
                  <Field label="Comment"><input className="input py-1.5" value={edit[s._id]?.comment ?? ''} onChange={(e) => setEdit({ ...edit, [s._id]: { ...edit[s._id], comment: e.target.value } })} /></Field>
                  <button className="btn btn-primary btn-sm h-[34px]" onClick={() => save(s._id)}>Save</button>
                </div>
              </div>
            );
          })}
          {!data.submissions.length && <Empty icon="hourglass_empty" title="No submissions yet" />}
          {!!data.notSubmitted.length && (
            <div className="rounded-lg bg-[#fffbeb] p-3">
              <div className="text-xs font-semibold text-[#92400e] mb-1">Not submitted ({data.notSubmitted.length})</div>
              <div className="text-sm">{data.notSubmitted.map((s) => s.name).join(', ')}</div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function MaterialsTab() {
  const { settings } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/homework/materials/all');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', subject: '', description: '', link: '', assignedTo: [] });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => fd.append(k, k === 'assignedTo' ? JSON.stringify(v) : v));
      if (file) fd.append('file', file);
      await api.post('/homework/materials', fd);
      toast('Material uploaded'); setOpen(false); setF({ title: '', subject: '', description: '', link: '', assignedTo: [] }); setFile(null); reload(true);
    } catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  };
  const del = async (m) => { if (!window.confirm('Delete this material?')) return; await api.delete(`/homework/materials/${m._id}`); toast('Deleted'); reload(true); };
  const grouped = (data || []).reduce((a, m) => { (a[m.subject || 'General'] = a[m.subject || 'General'] || []).push(m); return a; }, {});
  return (
    <>
      <div className="flex justify-end mb-3"><button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="upload_file" size={20} /> Upload material</button></div>
      <ErrorBox message={error} />
      {loading && !data ? <Spinner /> : !data?.length ? <div className="card"><Empty icon="menu_book" title="No study materials yet" text="Upload PDF notes, images or videos for your students." /></div> : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([subj, items]) => (
            <div key={subj}>
              <h3 className="font-semibold mb-2">{subj}</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((m) => (
                  <div key={m._id} className="card p-4 flex flex-col gap-2">
                    <div className="flex justify-between gap-2"><div className="font-semibold">{m.title}</div><button className="text-slate-400 hover:text-error" onClick={() => del(m)} aria-label="Delete"><Icon name="delete" size={18} /></button></div>
                    {m.description && <p className="text-xs muted">{m.description}</p>}
                    <div className="flex flex-wrap gap-2">
                      {m.file && <FileChip file={m.file} />}
                      {m.link && <a href={m.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary-container bg-surface-container-low rounded-lg px-2.5 py-1.5"><Icon name="link" size={16} /> Open link</a>}
                    </div>
                    <div className="text-[11px] muted mt-auto">{fmtDate(m.createdAt)} · {m.assignedTo?.length ? `${m.assignedTo.length} students` : 'All students'}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} icon="upload_file" title="Upload study material"
        footer={<><button className="btn btn-outline" onClick={() => setOpen(false)}>Cancel</button><button form="mat" className="btn btn-primary" disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button></>}>
        <form id="mat" onSubmit={submit} className="space-y-4">
          <Field label="Title *"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field>
          <Field label="Subject"><select className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}><option value="">General</option>{(settings?.subjects || []).map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Description"><input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Field label="File (PDF, image or video)"><input type="file" accept=".pdf,image/*,video/*,.doc,.docx,.ppt,.pptx" className="input" onChange={(e) => setFile(e.target.files[0])} /></Field>
          <Field label="…or a link (YouTube, Drive)"><input className="input" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://" /></Field>
          <StudentPicker value={f.assignedTo} onChange={(v) => setF({ ...f, assignedTo: v })} label="Visible to" />
          <ErrorBox message={err} />
        </form>
      </Modal>
    </>
  );
}
