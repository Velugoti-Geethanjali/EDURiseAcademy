import { useState } from 'react';
import useFetch from '../../lib/useFetch';
import api, { errMsg } from '../../lib/api';
import { fmtDateTime } from '../../lib/format';
import { Icon, Spinner, PageHeader, Tabs, Empty, Chip, Modal, Field, ErrorBox, FileLinks, useToast } from '../../components/ui';

export default function Homework() {
  const { data, loading, error, reload } = useFetch('/homework');
  const [tab, setTab] = useState('pending');
  const [open, setOpen] = useState(null);
  const list = (data || []).filter((h) => (tab === 'pending' ? !h.submission : !!h.submission));
  const pendingCount = (data || []).filter((h) => !h.submission).length;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Homework" subtitle="Submit work and see your marks and tutor comments" />
      <Tabs value={tab} onChange={setTab} className="mb-4" tabs={[{ value: 'pending', label: `Pending (${pendingCount})` }, { value: 'submitted', label: 'Submitted' }]} />
      <ErrorBox message={error} />
      {loading && !data ? <Spinner /> : !list.length ? <div className="card"><Empty icon={tab === 'pending' ? 'task_alt' : 'inbox'} title={tab === 'pending' ? 'No pending homework 🎉' : 'Nothing submitted yet'} /></div> : (
        <div className="flex flex-col gap-3">
          {list.map((h) => {
            const late = h.deadline && new Date(h.deadline) < new Date();
            const sub = h.submission;
            return (
              <div key={h._id} className="card p-4">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    {h.subject && <div className="text-[11px] font-semibold uppercase text-primary">{h.subject}</div>}
                    <div className="font-semibold">{h.title}</div>
                  </div>
                  {sub ? (sub.reviewedAt ? <Chip status="reviewed" label={`${sub.marks ?? '-'}/${h.maxMarks}`} /> : <Chip status="submitted" />) : <Chip status={late ? 'overdue' : 'pending'} label={late ? 'Overdue' : 'Due'} />}
                </div>
                {h.description && <p className="text-sm text-on-surface-variant mt-2 whitespace-pre-line">{h.description}</p>}
                <div className="mt-2"><FileLinks files={h.attachments} /></div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className={`text-xs flex items-center gap-1 ${late && !sub ? 'text-error font-semibold' : 'muted'}`}><Icon name="alarm" size={14} /> {h.deadline ? `Due ${fmtDateTime(h.deadline)}` : 'No deadline'} · {h.maxMarks} marks</span>
                  {(!sub || !sub.reviewedAt) && <button className="btn btn-primary btn-sm" onClick={() => setOpen(h)}><Icon name="upload" size={16} /> {sub ? 'Resubmit' : 'Upload work'}</button>}
                </div>
                {sub && (
                  <div className="mt-3 rounded-lg bg-surface-container-low p-3 text-sm">
                    <div className="text-xs muted">Submitted {fmtDateTime(sub.submittedAt)}</div>
                    {sub.text && <p className="mt-1">{sub.text}</p>}
                    <div className="mt-2"><FileLinks files={sub.files} /></div>
                    {sub.reviewedAt && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <div className="font-semibold text-primary">Marks: {sub.marks ?? '—'} / {h.maxMarks}</div>
                        {sub.comment && <div className="text-on-surface-variant mt-0.5"><Icon name="chat_bubble" size={14} /> {sub.comment}</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <SubmitModal hw={open} onClose={() => setOpen(null)} onDone={() => reload(true)} />
    </div>
  );
}

function SubmitModal({ hw, onClose, onDone }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!hw) return null;
  const submit = async (e) => {
    e.preventDefault();
    if (!text && !files.length) return setError('Add a note or attach your work');
    setBusy(true); setError('');
    try {
      const fd = new FormData(); fd.append('text', text); files.forEach((f) => fd.append('files', f));
      await api.post(`/homework/${hw._id}/submit`, fd);
      toast('Homework submitted'); setText(''); setFiles([]); onDone(); onClose();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} icon="upload_file" title="Submit homework" subtitle={hw.title}
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button><button form="sub" className="btn btn-primary" disabled={busy}>{busy ? 'Uploading…' : 'Submit'}</button></>}>
      <form id="sub" onSubmit={submit} className="space-y-4">
        <Field label="Photos or PDF of your work" hint="You can select several photos"><input type="file" multiple accept="image/*,.pdf,.doc,.docx" className="input" onChange={(e) => setFiles([...e.target.files])} /></Field>
        <Field label="Note for tutor (optional)"><textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} /></Field>
        <ErrorBox message={error} />
      </form>
    </Modal>
  );
}
