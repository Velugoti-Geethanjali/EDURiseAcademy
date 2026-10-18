import { useState } from 'react';
import useFetch from '../../lib/useFetch';
import api, { errMsg } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import { Icon, Spinner, PageHeader, Empty, Field, ErrorBox, useToast } from '../../components/ui';
import { StudentPicker } from '../../components/shared';

const CATEGORIES = ['General', 'Special Session', 'Holiday', 'Exam', 'Fees', 'Schedule'];

export default function Announcements() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/announcements');
  const [f, setF] = useState({ title: '', body: '', category: 'General', audience: [], pinned: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.post('/announcements', f); toast('Announcement sent'); setF({ title: '', body: '', category: 'General', audience: [], pinned: false }); reload(true); } catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  };
  const del = async (a) => { if (!window.confirm('Delete this announcement?')) return; await api.delete(`/announcements/${a._id}`); toast('Deleted'); reload(true); };
  const pin = async (a) => { await api.put(`/announcements/${a._id}`, { pinned: !a.pinned }); reload(true); };

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Students get a notification for every announcement" />
      <div className="grid lg:grid-cols-5 gap-5 items-start">
        <form onSubmit={submit} className="lg:col-span-2 card card-pad space-y-4 lg:sticky lg:top-20">
          <h2 className="h-card flex items-center gap-2"><Icon name="campaign" className="text-primary" size={20} /> New announcement</h2>
          <Field label="Title *"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field>
          <Field label="Message"><textarea className="input" rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
          <Field label="Category"><select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <StudentPicker value={f.audience} onChange={(v) => setF({ ...f, audience: v })} label="Send to" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#4f46e5] w-4 h-4" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} /> Pin to top</label>
          <ErrorBox message={err} />
          <button className="btn btn-primary w-full" disabled={busy}><Icon name="send" size={18} /> {busy ? 'Sending…' : 'Send announcement'}</button>
        </form>
        <div className="lg:col-span-3 flex flex-col gap-3">
          <ErrorBox message={error} />
          {loading && !data ? <Spinner /> : !data?.length ? <div className="card"><Empty icon="campaign" title="No announcements yet" /></div> : data.map((a) => (
            <div key={a._id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="chip bg-[#fef2f2] text-error">{a.category}</span>
                  {a.pinned && <span className="chip bg-surface-container-high text-primary"><Icon name="push_pin" size={12} /> Pinned</span>}
                  <span className="text-xs muted">{timeAgo(a.createdAt)}</span>
                </div>
                <div className="flex">
                  <button className="p-1 text-slate-400 hover:text-primary" onClick={() => pin(a)} title={a.pinned ? 'Unpin' : 'Pin'}><Icon name="push_pin" size={18} fill={a.pinned} /></button>
                  <button className="p-1 text-slate-400 hover:text-error" onClick={() => del(a)} title="Delete"><Icon name="delete" size={18} /></button>
                </div>
              </div>
              <h3 className="font-semibold mt-2">{a.title}</h3>
              {a.body && <p className="text-sm text-on-surface-variant mt-1 whitespace-pre-line">{a.body}</p>}
              <div className="text-xs muted mt-2"><Icon name="group" size={14} /> {a.audience?.length ? a.audience.map((s) => s.name).join(', ') : 'All students'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
