import { useParams } from 'react-router-dom';
import useFetch from '../lib/useFetch';
import { fmtDate, inr } from '../lib/format';
import { Icon, Spinner, ErrorBox } from '../components/ui';

// Printable receipt – "Download" uses the browser's Save as PDF
export default function Receipt() {
  const { id } = useParams();
  const { data, loading, error } = useFetch(`/payments/${id}`);
  if (loading) return <Spinner className="min-h-screen" />;
  if (error) return <div className="p-6"><ErrorBox message={error} /></div>;
  const { payment: p, settings: s } = data;
  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="no-print flex justify-end gap-2 mb-3">
          <button className="btn btn-outline btn-sm" onClick={() => window.close()}>Close</button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}><Icon name="download" size={16} /> Download / Print</button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="flex justify-between items-start border-b border-slate-200 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center text-white"><Icon name="school" size={24} /></div>
              <div><div className="font-bold text-lg">{s.tuitionName}</div><div className="text-xs muted">{s.address}</div><div className="text-xs muted">{s.phone} · {s.email}</div></div>
            </div>
            <div className="text-right"><div className="text-xs uppercase tracking-wider muted font-semibold">Receipt</div><div className="font-bold">{p.receiptNo || '—'}</div></div>
          </div>
          {p.status !== 'paid' && <div className="mt-4 rounded-lg bg-[#fffbeb] text-[#92400e] p-3 text-sm font-semibold">This fee is still pending – not a valid receipt.</div>}
          <dl className="mt-5 grid grid-cols-2 gap-y-3 text-sm">
            <dt className="muted">Received from</dt><dd className="font-semibold text-right">{p.student?.name}</dd>
            <dt className="muted">Class</dt><dd className="text-right">{p.student?.grade || '—'} {p.student?.rollNo && `· Roll #${p.student.rollNo}`}</dd>
            {p.student?.parentName && (<><dt className="muted">Parent</dt><dd className="text-right">{p.student.parentName}</dd></>)}
            <dt className="muted">For</dt><dd className="text-right">{p.description}</dd>
            <dt className="muted">Payment date</dt><dd className="text-right">{fmtDate(p.paidOn)}</dd>
            <dt className="muted">Mode</dt><dd className="text-right">{p.mode || '—'}</dd>
            {p.note && (<><dt className="muted">Note</dt><dd className="text-right">{p.note}</dd></>)}
          </dl>
          <div className="mt-6 rounded-xl bg-surface-container-low p-4 flex justify-between items-center">
            <span className="font-semibold">Amount paid</span>
            <span className="text-2xl font-bold text-tertiary-container">{inr(p.amount)}</span>
          </div>
          <p className="mt-8 text-xs muted text-center">This is a computer-generated receipt from {s.tuitionName}.</p>
        </div>
      </div>
    </div>
  );
}
