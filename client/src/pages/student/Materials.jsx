import { useState } from 'react';
import useFetch from '../../lib/useFetch';
import { fmtDate } from '../../lib/format';
import { Icon, Spinner, PageHeader, Empty, ErrorBox, FileChip } from '../../components/ui';

export default function Materials() {
  const { data, loading, error } = useFetch('/homework/materials/all');
  const [subject, setSubject] = useState('');
  const subjects = [...new Set((data || []).map((m) => m.subject || 'General'))];
  const list = (data || []).filter((m) => !subject || (m.subject || 'General') === subject);
  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Study materials" subtitle="Notes, worksheets and videos from your tutor" />
      {subjects.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {['', ...subjects].map((s) => (
            <button key={s || 'all'} onClick={() => setSubject(s)} className={`px-3 py-1.5 rounded-full text-sm font-medium border ${subject === s ? 'bg-primary-container border-primary-container text-white' : 'bg-white border-slate-200'}`}>{s || 'All'}</button>
          ))}
        </div>
      )}
      <ErrorBox message={error} />
      {loading && !data ? <Spinner /> : !list.length ? <div className="card"><Empty icon="menu_book" title="No study materials yet" /></div> : (
        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((m) => {
            const ic = m.file?.type?.includes('pdf') ? 'picture_as_pdf' : m.file?.type?.startsWith('video') || /youtu/.test(m.link || '') ? 'smart_display' : m.file?.type?.startsWith('image') ? 'image' : 'description';
            return (
              <div key={m._id} className="card p-4 flex gap-3">
                <div className="w-11 h-11 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0"><Icon name={ic} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase text-primary">{m.subject || 'General'}</div>
                  <div className="font-semibold">{m.title}</div>
                  {m.description && <p className="text-xs muted mt-0.5">{m.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {m.file && <FileChip file={m.file} />}
                    {m.link && <a href={m.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary-container bg-surface-container-low rounded-lg px-2.5 py-1.5"><Icon name="open_in_new" size={16} /> Open link</a>}
                  </div>
                  <div className="text-[11px] muted mt-2">{fmtDate(m.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
