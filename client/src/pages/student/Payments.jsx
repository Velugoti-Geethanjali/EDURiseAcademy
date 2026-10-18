import { Link } from 'react-router-dom';
import useFetch from '../../lib/useFetch';
import { useAuth } from '../../lib/auth';
import { fmtDate, inr, waLink } from '../../lib/format';
import { Icon, Spinner, PageHeader, Empty, Chip, ErrorBox } from '../../components/ui';

export default function StudentPayments() {
  const { settings } = useAuth();
  const { data, loading, error } = useFetch('/payments');
  if (loading && !data) return <Spinner />;
  const list = data || [];
  const pending = list.filter((p) => p.status === 'pending');
  const paid = list.filter((p) => p.status === 'paid');
  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Fees & payments" subtitle="Pay the tutor by cash, UPI or bank transfer – the tutor updates the status here" />
      <ErrorBox message={error} />
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="card p-4"><div className="text-[11px] uppercase font-semibold muted">Paid</div><div className="text-2xl font-bold text-tertiary-container">{inr(paid.reduce((a, p) => a + p.amount, 0))}</div><div className="text-xs muted">{paid.length} payments</div></div>
        <div className="card p-4"><div className="text-[11px] uppercase font-semibold muted">Pending</div><div className={`text-2xl font-bold ${pending.length ? 'text-secondary' : ''}`}>{inr(pending.reduce((a, p) => a + p.amount, 0))}</div><div className="text-xs muted">{pending.length} due</div></div>
      </div>
      {pending.length > 0 && (
        <div className="card p-4 mb-5 border-l-4 border-l-[#f59e0b]">
          <h2 className="h-card mb-2">Due now</h2>
          {pending.map((p) => (
            <div key={p._id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
              <div><div className="font-medium">{p.description}</div><div className={`text-xs ${p.dueDate && new Date(p.dueDate) < new Date() ? 'text-error font-semibold' : 'muted'}`}>Due {fmtDate(p.dueDate)}</div></div>
              <div className="font-bold">{inr(p.amount)}</div>
            </div>
          ))}
          {settings?.whatsapp && <a href={waLink(settings.whatsapp, 'Hi, I have paid the pending tuition fee. Please update it.')} target="_blank" rel="noreferrer" className="btn btn-success btn-sm mt-3"><Icon name="chat" size={16} /> Tell tutor I've paid</a>}
        </div>
      )}
      <h2 className="h-card mb-2">Payment history</h2>
      {!paid.length ? <div className="card"><Empty icon="receipt_long" title="No payments yet" /></div> : (
        <div className="card divide-y divide-slate-100">
          {paid.map((p) => (
            <div key={p._id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0"><div className="font-medium">{p.description}</div><div className="text-xs muted">{fmtDate(p.paidOn)} · {p.mode} · {p.receiptNo}</div></div>
              <div className="text-right shrink-0">
                <div className="font-bold">{inr(p.amount)}</div>
                <div className="flex items-center gap-2 justify-end mt-1"><Chip status="paid" /><Link to={`/receipt/${p._id}`} target="_blank" className="text-primary-container" title="Download receipt"><Icon name="download" size={20} /></Link></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
