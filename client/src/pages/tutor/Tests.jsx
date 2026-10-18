import { useEffect, useState } from 'react';
import useFetch from '../../lib/useFetch';
import api, { errMsg } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDate, toDateInput } from '../../lib/format';
import { Icon, Spinner, PageHeader, Empty, Modal, Field, ErrorBox, Avatar, FileChip, SectionCard, LineChart, useToast } from '../../components/ui';
import { StudentPicker } from '../../components/shared';

export default function Tests() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/tests');
  const [create, setCreate] = useState(false);
  const [marksFor, setMarksFor] = useState(null);
  const students = useFetch('/students');
  const [studentId, setStudentId] = useState('');
  const progress = useFetch(studentId ? `/students/${studentId}` : null, [studentId]);

  const del = async (t) => { if (!window.confirm(`Delete "${t.name}" and its marks?`)) return; await api.delete(`/tests/${t._id}`); toast('Deleted'); reload(true); };
  const upcoming = (data || []).filter((t) => t.date && new Date(t.date) >= new Date(new Date().toDateString()));
  const past = (data || []).filter((t) => !upcoming.includes(t));

  return (
    <div>
      <PageHeader title="Tests & results" subtitle="Create tests, enter marks, upload answer sheets and track progress"
        actions={<button className="btn btn-primary" onClick={() => setCreate(true)}><Icon name="add" size={20} /> Create test</button>} />
      <ErrorBox message={error} />
      <div className="grid lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 flex flex-col gap-5">
          {loading && !data ? <Spinner /> : !data?.length ? <div className="card"><Empty icon="quiz" title="No tests yet" /></div> : (
            <>
              {!!upcoming.length && <TestList title="Upcoming" tests={upcoming} onMarks={setMarksFor} onDelete={del} />}
              {!!past.length && <TestList title="Completed" tests={past} onMarks={setMarksFor} onDelete={del} />}
            </>
          )}
        </div>
        <SectionCard title="Student progress" icon="monitoring">
          <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Select a student</option>
            {(students.data || []).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          {studentId && (progress.loading ? <Spinner /> : (
            <LineChart points={(progress.data?.results || []).filter((r) => r.marks !== undefined && r.marks !== null).map((r) => ({ label: r.test.name, value: (r.marks / r.test.maxMarks) * 100 }))} />
          ))}
        </SectionCard>
      </div>
      <TestModal open={create} onClose={() => setCreate(false)} onDone={() => reload(true)} />
      <MarksModal test={marksFor} onClose={() => { setMarksFor(null); reload(true); }} />
    </div>
  );
}

function TestList({ title, tests, onMarks, onDelete }) {
  return (
    <SectionCard title={title} icon={title === 'Upcoming' ? 'event_upcoming' : 'task'}>
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Test</th><th>Date</th><th>Max</th><th>Class avg</th><th className="text-right" /></tr></thead>
          <tbody>
            {tests.map((t) => (
              <tr key={t._id}>
                <td><div className="font-semibold">{t.name}</div><div className="text-xs muted">{t.subject}{t.syllabus ? ` · ${t.syllabus}` : ''}</div></td>
                <td className="text-xs whitespace-nowrap">{fmtDate(t.date)}</td>
                <td>{t.maxMarks}</td>
                <td>{t.averagePct !== null ? <span className="font-semibold">{t.averagePct}%</span> : <span className="muted text-xs">—</span>}<div className="text-[11px] muted">{t.resultCount} graded</div></td>
                <td className="text-right whitespace-nowrap">
                  <button className="btn btn-primary btn-sm" onClick={() => onMarks(t)}><Icon name="edit_note" size={16} /> Marks</button>
                  <button className="p-1.5 inline-flex text-slate-400 hover:text-error" onClick={() => onDelete(t)} aria-label="Delete"><Icon name="delete" size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function TestModal({ open, onClose, onDone }) {
  const { settings } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) setF({ name: '', subject: '', date: toDateInput(new Date(Date.now() + 7 * 864e5)), maxMarks: 50, syllabus: '', assignedTo: [] }); }, [open]);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await api.post('/tests', f); toast('Test created – students notified'); onDone(); onClose(); } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal open={open} onClose={onClose} icon="quiz" title="Create test"
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button><button form="tst" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Create'}</button></>}>
      <form id="tst" onSubmit={submit} className="space-y-4">
        <Field label="Test name *"><input className="input" value={f.name || ''} onChange={set('name')} required placeholder="e.g. Unit Test 3" /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Subject"><select className="input" value={f.subject || ''} onChange={set('subject')}><option value="">—</option>{(settings?.subjects || []).map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Date"><input type="date" className="input" value={f.date || ''} onChange={set('date')} /></Field>
          <Field label="Max marks *"><input type="number" className="input" value={f.maxMarks || ''} onChange={set('maxMarks')} required /></Field>
        </div>
        <Field label="Syllabus / chapters"><input className="input" value={f.syllabus || ''} onChange={set('syllabus')} /></Field>
        <StudentPicker value={f.assignedTo || []} onChange={(v) => setF({ ...f, assignedTo: v })} label="Students taking this test" />
        <ErrorBox message={error} />
      </form>
    </Modal>
  );
}

function MarksModal({ test, onClose }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = () => api.get(`/tests/${test._id}/results`).then(({ data }) =>
    setRows(data.rows.map((r) => ({ student: r.student, marks: r.result?.marks ?? '', feedback: r.result?.feedback || '', sheet: r.result?.answerSheet }))));
  useEffect(() => { if (test) { setRows(null); load(); } }, [test]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!test) return null;
  const upd = (i, k, v) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const save = async () => {
    const bad = rows.find((r) => r.marks !== '' && (Number(r.marks) < 0 || Number(r.marks) > test.maxMarks));
    if (bad) return toast(`Marks for ${bad.student.name} must be 0–${test.maxMarks}`, 'error');
    setBusy(true);
    try { await api.put(`/tests/${test._id}/results`, { rows: rows.map((r) => ({ student: r.student._id, marks: r.marks, feedback: r.feedback })) }); toast('Marks saved – students notified'); onClose(); } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
  };
  const uploadSheet = async (i, file) => {
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try { const { data } = await api.post(`/tests/${test._id}/results/${rows[i].student._id}/sheet`, fd); upd(i, 'sheet', data.answerSheet); toast('Answer sheet uploaded'); } catch (e) { toast(errMsg(e), 'error'); }
  };
  return (
    <Modal open onClose={onClose} wide icon="edit_note" title={`Marks · ${test.name}`} subtitle={`${test.subject || ''} · Max ${test.maxMarks}`}
      footer={<><button className="btn btn-outline" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={save} disabled={busy || !rows}>{busy ? 'Saving…' : 'Save marks'}</button></>}>
      {!rows ? <Spinner /> : !rows.length ? <Empty title="No students assigned" /> : (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.student._id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Avatar name={r.student.name} size={28} /><span className="font-semibold flex-1">{r.student.name}</span>
                {r.marks !== '' && <span className="text-xs font-semibold text-primary">{Math.round((r.marks / test.maxMarks) * 100)}%</span>}
              </div>
              <div className="grid grid-cols-[90px_1fr] gap-2">
                <input type="number" className="input py-1.5" placeholder={`/${test.maxMarks}`} value={r.marks} onChange={(e) => upd(i, 'marks', e.target.value)} />
                <input className="input py-1.5" placeholder="Feedback" value={r.feedback} onChange={(e) => upd(i, 'feedback', e.target.value)} />
              </div>
              <div className="flex items-center gap-2 mt-2">
                {r.sheet && <FileChip file={r.sheet} />}
                <label className="btn btn-ghost btn-sm cursor-pointer"><Icon name="upload" size={16} /> {r.sheet ? 'Replace' : 'Upload'} answer sheet
                  <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => uploadSheet(i, e.target.files[0])} />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
