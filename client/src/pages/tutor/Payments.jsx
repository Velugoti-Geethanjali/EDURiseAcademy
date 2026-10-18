import { useState } from 'react';
import { Link } from 'react-router-dom';
import useFetch from '../../lib/useFetch';
import api, { errMsg } from '../../lib/api';
import { fmtDate, inr, waLink } from '../../lib/format';
import { Icon, Spinner, PageHeader, Tabs, Empty, Chip, StatCard, Avatar, ErrorBox, useToast } from '../../components/ui';
import { FeeModal, MarkPaidModal } from '../../components/shared';

export default function Payments() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/payments');
  const [tab, setTab] = useState('pending');
  const [q, setQ] = useState('');
  const [add, setAdd] = useState(false);
  const [paying, setPaying] = useState(null);

  const all = data || [];
  const pending = all.filter((p) => p.status === 'pending');
  const paid = all.filter((p) => p.status === 'paid');
  const now = new Date();
  const monthPaid = paid.filter((p) => p.paidOn && new Date(p.paidOn).getMonth() === now.getMonth() && new Date(p.paidOn).getFullYear() === now.getFullYear());
  const overdue = pending.filter((p) => p.dueDate && new Date(p.dueDate) < now);
  const list = (tab === 'pending' ? pending : tab === 'paid' ? paid : all)
    .filter((p) => !q || (p.student?.name || '').toLowerCase().includes(q.toLowerCase()) || p.description.toLowerCase().includes(q.toLowerCase()));

  const remindAll = async () => { const { data: r } = await api.post('/payments/remind'); toast(r.message); };
  const undo = async (p) => { if (!window.confirm('Mark this payment as pending again?')) return; await api.patch(`/payments/${p._id}/unpay`); toast('Marked as pending'); reload(true); };
  const del = async (p) => { if (!window.confirm('Delete this fee entry?')) return; try { await api.delete(`/payments/${p._id}`); toast('Deleted'); reload(true); } catch (e) { toast(errMsg(e), 'error'); } };

  return (
    <div>
      <PageHeader title="Payments" subtitle="Manual fee tracking – mark fees paid when you receive cash, UPI or bank transfer"
        actions={<>
          <button className="btn btn-outline" onClick={remindAll} disabled={!pending.length}><Icon name="notifications_active" size={18} /> Remind all pending</button>
          <button className="btn btn-primary" onClick={() => setAdd(true)}><Icon name="add" size={20} /> Add fee</button>
        </>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Pending" value={inr(pending.reduce((a, p) => a + p.amount, 0))} icon="hourglass_top" iconClass="bg-secondary-fixed text-on-secondary-fixed-variant" foot={`${pending.length} entries`} />
        <StatCard label="Overdue" value={overdue.length} icon="error" iconClass="bg-[#fef2f2] text-error" foot={inr(overdue.reduce((a, p) => a + p.amount, 0))} />
        <StatCard label="Collected this month" value={inr(monthPaid.reduce((a, p) => a + p.amount, 0))} icon="savings" iconClass="bg-[#ecfdf5] text-tertiary-container" foot={`${monthPaid.length} payments`} />
        <StatCard label="Total collected" value={inr(paid.reduce((a, p) => a + p.amount, 0))} icon="account_balance_wallet" foot={`${paid.length} payments`} />
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'pending', label: `Pending (${pending.length})` }, { value: 'paid', label: 'Paid' }, { value: 'all', label: 'All' }]} />
        <div className="relative"><Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input className="input pl-9 sm:w-64" placeholder="Search student or description" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>

      <ErrorBox message={error} />
      {loading && !data ? <Spinner /> : !list.length ? <div className="card"><Empty icon="payments" title="No fee entries" /></div> : (
        <div className="card overflow-x-auto p-2">
          <table className="table-base min-w-[760px]">
            <thead><tr><th>Student</th><th>Description</th><th>Amount</th><th>Due date</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {list.map((p) => {
                const isOverdue = p.status === 'pending' && p.dueDate && new Date(p.dueDate) < now;
                return (
                  <tr key={p._id}>
                    <td><Link to={`/tutor/students/${p.student?._id}`} className="flex items-center gap-2"><Avatar name={p.student?.name} size={30} /><div><div className="font-semibold">{p.student?.name}</div><div className="text-[11px] muted">{p.student?.grade}</div></div></Link></td>
                    <td><div>{p.description}</div>{p.status === 'paid' && <div className="text-[11px] muted">{p.receiptNo} · {p.mode} · {fmtDate(p.paidOn)}</div>}</td>
                    <td className="font-semibold tabular-nums">{inr(p.amount)}</td>
                    <td className={`text-xs ${isOverdue ? 'text-error font-semibold' : ''}`}>{fmtDate(p.dueDate)}</td>
                    <td><Chip status={p.status === 'paid' ? 'paid' : isOverdue ? 'overdue' : 'pending'} /></td>
                    <td className="text-right whitespace-nowrap">
                      {p.status === 'pending' ? (
                        <>
                          {(p.student?.parentPhone || p.student?.phone) && (
                            <a className="p-1.5 inline-flex rounded-lg text-tertiary-container hover:bg-slate-100" target="_blank" rel="noreferrer" title="WhatsApp reminder"
                              href={waLink(p.student.parentPhone || p.student.phone, `Hello, a gentle reminder that ${inr(p.amount)} for "${p.description}" (${p.student.name}) is pending. Thank you!`)}><Icon name="chat" size={18} /></a>
                          )}
                          <button className="btn btn-success btn-sm ml-1" onClick={() => setPaying(p)}><Icon name="check" size={16} /> Mark paid</button>
                        </>
                      ) : (
                        <>
                          <Link to={`/receipt/${p._id}`} target="_blank" className="btn btn-outline btn-sm"><Icon name="receipt" size={16} /> Receipt</Link>
                          <button className="p-1.5 inline-flex rounded-lg text-slate-400 hover:bg-slate-100 ml-1" title="Mark as pending" onClick={() => undo(p)}><Icon name="undo" size={18} /></button>
                        </>
                      )}
                      <button className="p-1.5 inline-flex rounded-lg text-slate-400 hover:text-error hover:bg-slate-100" title="Delete" onClick={() => del(p)}><Icon name="delete" size={18} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <FeeModal open={add} onClose={() => setAdd(false)} onDone={() => reload(true)} />
      <MarkPaidModal payment={paying} onClose={() => setPaying(null)} onDone={() => reload(true)} />
    </div>
  );
}
